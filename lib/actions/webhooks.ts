"use server";
// Phase 40 — Public API + Outbound Webhooks. CRUD for `webhooks` +
// read-only access to `webhook_deliveries` for debugging. Unlike api_keys
// (a real access credential, hashed and shown once), the signing_secret
// here is shown in the UI on demand — it's what the RECEIVER uses to
// verify OUR signature, not a credential that grants access to this CRM,
// so it's the same risk class as the other integration secrets already
// shown in Settings (e.g. the API Keys tab's reveal-on-demand pattern).
//
// Gap-check fix — uses assertCanStrict (deny when no token), not assertCan's
// usual soft mode: a Next.js Server Action is directly callable by anyone
// who's loaded the client bundle, and soft mode would let an unauthenticated
// caller register a webhook to their own server + start receiving live CRM
// events. See lib/security/requireAction.ts's assertCanStrict doc comment.

import { randomBytes } from "crypto";
import { getServerClient } from "@/lib/supabase/server";
import { assertCanStrict } from "@/lib/security/requireAction";
import { isSafeWebhookUrl } from "@/lib/security/ssrfGuard";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import type { WebhookEvent } from "@/lib/webhooks/dispatch";

export type Webhook = {
  id: string;
  site_id: string;
  endpoint_url: string;
  events: WebhookEvent[];
  signing_secret: string;
  active: boolean;
  created_at: string;
};

export type WebhookDelivery = {
  id: string;
  webhook_id: string;
  event: string;
  status_code: number;
  ok: boolean;
  created_at: string;
};

export async function getWebhooks(accessToken?: string): Promise<Webhook[]> {
  if (!(await assertCanStrict(accessToken, "developers", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("webhooks").select("*").order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Webhook[];
  } catch (err) {
    console.error("[developers] getWebhooks error:", err);
    return [];
  }
}

export async function createWebhookSubscription(
  endpointUrl: string,
  events: WebhookEvent[],
  accessToken?: string,
): Promise<{ ok: boolean }> {
  if (!(await assertCanStrict(accessToken, "developers", "create"))) return { ok: false };
  if (!(await isSafeWebhookUrl(endpointUrl))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("webhooks").insert({
      site_id: DEFAULT_SITE_ID,
      endpoint_url: endpointUrl,
      events,
      signing_secret: randomBytes(24).toString("hex"),
    });
    if (error) { console.error("[developers] createWebhookSubscription failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[developers] createWebhookSubscription error:", err);
    return { ok: false };
  }
}

export async function deleteWebhook(id: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCanStrict(accessToken, "developers", "delete"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("webhooks").delete().eq("id", id);
    if (error) return { ok: false };
    return { ok: true };
  } catch (err) {
    console.error("[developers] deleteWebhook error:", err);
    return { ok: false };
  }
}

export async function getWebhookDeliveries(webhookId: string, accessToken?: string): Promise<WebhookDelivery[]> {
  if (!(await assertCanStrict(accessToken, "developers", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("webhook_deliveries").select("*").eq("webhook_id", webhookId).order("created_at", { ascending: false }).limit(20);
    if (error) return [];
    return (data ?? []) as WebhookDelivery[];
  } catch (err) {
    console.error("[developers] getWebhookDeliveries error:", err);
    return [];
  }
}
