// Phase 40 — Public API + Outbound Webhooks. Fires an HMAC-SHA256-signed
// POST to every active webhook subscribed to a given event — the outbound
// mirror of the signing already proven inbound (lib/messaging/
// twilioSignature.ts, lib/payments/razorpay.ts's webhook verify). Called
// fire-and-forget (never awaited) from the actions that trigger these
// events, matching lib/automation/engine.ts's existing persistTask/
// persistActivity pattern — a webhook delivery failure must never affect
// the CRUD operation that triggered it.
//
// CAVEAT: retries happen inline with a short setTimeout backoff. In a
// serverless/edge deployment the process can be frozen once the triggering
// request's response is sent, which would cut a retry short — acceptable
// for this phase's scope (this app runs on a long-lived PM2 process, not
// serverless), flagged here for anyone porting this to a different host.
//
// Gap-check fix — re-checks isSafeWebhookUrl() here too, not just at
// creation time in lib/actions/webhooks.ts: DNS for a hostname can change
// between when a webhook is registered and when it's actually dispatched
// (rebinding), so the loopback/private-IP guard needs to run at both points.

import { createHmac } from "crypto";
import { getServerClient } from "@/lib/supabase/server";
import { isSafeWebhookUrl } from "@/lib/security/ssrfGuard";

export type WebhookEvent = "lead.created" | "deal.won" | "order.paid";

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type WebhookRow = { id: string; endpoint_url: string; signing_secret: string };

async function deliverOne(
  db: ReturnType<typeof getServerClient>,
  wh: WebhookRow,
  event: WebhookEvent,
  body: string,
): Promise<void> {
  const signature = sign(wh.signing_secret, body);
  const MAX_ATTEMPTS = 2;
  let statusCode = 0;
  let ok = false;

  if (!(await isSafeWebhookUrl(wh.endpoint_url))) {
    console.error(`[webhooks] refusing delivery to ${wh.endpoint_url} — resolves to a private/loopback address`);
    try {
      await db.from("webhook_deliveries").insert({ webhook_id: wh.id, event, status_code: 0, ok: false });
    } catch (err) {
      console.error("[webhooks] delivery log failed:", err);
    }
    return;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !ok; attempt++) {
    try {
      const res = await fetch(wh.endpoint_url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-KVL-Signature": signature, "X-KVL-Event": event },
        body,
      });
      statusCode = res.status;
      ok = res.ok;
    } catch (err) {
      console.error(`[webhooks] delivery attempt ${attempt} to ${wh.endpoint_url} failed:`, err);
    }
    if (!ok && attempt < MAX_ATTEMPTS) await delay(500 * attempt);
  }

  try {
    await db.from("webhook_deliveries").insert({ webhook_id: wh.id, event, status_code: statusCode, ok });
  } catch (err) {
    console.error("[webhooks] delivery log failed:", err);
  }
}

export async function dispatchWebhookEvent(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  try {
    const db = getServerClient();
    const { data: subs, error } = await db.from("webhooks").select("id, endpoint_url, signing_secret").eq("active", true).contains("events", [event]);
    if (error || !subs?.length) return;

    const body = JSON.stringify({ event, data: payload, sentAt: new Date().toISOString() });
    await Promise.all((subs as WebhookRow[]).map((wh) => deliverOne(db, wh, event, body)));
  } catch (err) {
    console.error("[webhooks] dispatchWebhookEvent error:", err);
  }
}
