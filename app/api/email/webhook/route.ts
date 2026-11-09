// Resend webhook — one URL for everything: delivered, bounced, complained, opened, clicked, received (inbound).
// Resend dashboard → Webhooks → https://<app>/api/email/webhook, secret → RESEND_WEBHOOK_SECRET.
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { verifySvixSignature } from "@/lib/messaging/svixSignature";
import { applyEmailEvent, processInboundEmail, fetchResendReceivedBody, parseAddress } from "@/lib/messaging/emailEvents";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_WEBHOOK_SECRET) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    if (!rateLimit(`resend:webhook:${clientIp(req)}`, 300, 60_000).allowed) return NextResponse.json({ ok: false }, { status: 429 });
    const raw = await req.text();
    const ok = verifySvixSignature(raw, { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") });
    if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const evt = JSON.parse(raw) as { type?: string; data?: Record<string, unknown> };
    const type = evt.type ?? "";
    const data = (evt.data ?? {}) as Record<string, unknown> & { email_id?: string; from?: string; to?: string[] | string; subject?: string; text?: string; html?: string; message_id?: string };
    if (type === "email.received") {
      const body = data.text || data.html ? { text: data.text, html: data.html } : await fetchResendReceivedBody(String(data.email_id ?? ""));
      await processInboundEmail({ from: String(data.from ?? ""), to: parseAddress(String(Array.isArray(data.to) ? data.to[0] : data.to ?? "")), subject: data.subject, text: body.text, html: body.html, messageId: data.message_id ?? data.email_id });
    } else {
      await applyEmailEvent(type, data);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email] webhook error:", err);
    return NextResponse.json({ ok: true }); // never make Resend retry-storm on our bug
  }
}
