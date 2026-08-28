// Phase 21 — Unified Conversations. POST /api/whatsapp/inbound — Twilio's
// WhatsApp messaging webhook. Verifies X-Twilio-Signature (see
// lib/messaging/twilioSignature.ts) rather than an arbitrary shared secret,
// since Twilio doesn't support a custom header on this webhook. Inert (501)
// until TWILIO_AUTH_TOKEN is set — same "won't accept unauthenticated writes
// until configured" convention as /api/telephony/missed-call.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { verifyTwilioSignature } from "@/lib/messaging/twilioSignature";
import { recordInboundMessage, linkConversationToLead } from "@/lib/actions/conversations";
import { resolveIdentity, normalizePhone } from "@/lib/identity/resolve";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";

export const dynamic = "force-dynamic";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
function twiml() {
  return new NextResponse(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    }

    const limit = rateLimit(`whatsapp:inbound:${clientIp(req)}`, 60, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const rawBody = await req.text();
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const signature = req.headers.get("x-twilio-signature");
    if (!verifyTwilioSignature(req.nextUrl.toString(), params, signature)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const phone = normalizePhone((params.From ?? "").replace(/^whatsapp:/, ""));
    const body = (params.Body ?? "").slice(0, 4000);
    if (!phone) return twiml();

    const { conversationId } = await recordInboundMessage("whatsapp", phone, body, params.MessageSid);

    // Voluntary act (the visitor messaged us first) — same identity-resolution
    // pattern as the missed-call webhook.
    const resolution = await resolveIdentity({ visitorId: `whatsapp:${phone}`, name: "", email: "", phone }, DEFAULT_SITE_ID).catch(() => null);
    if (conversationId && resolution?.leadId) {
      await linkConversationToLead(conversationId, resolution.leadId);
    }

    return twiml();
  } catch (err) {
    console.error("[messaging] whatsapp inbound error:", err);
    return twiml();
  }
}
