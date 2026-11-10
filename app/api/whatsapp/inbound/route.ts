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
import { processInboundWhatsapp } from "@/lib/messaging/inboundWhatsapp";
import { runAfterResponse } from "@/lib/messaging/background";
import { mediaLabel, downloadTwilioMedia, saveInboundMedia } from "@/lib/whatsapp/media";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    await runAfterResponse(async () => {
      let body = params.Body ?? "", mediaUrl: string | undefined;
      if (Number(params.NumMedia ?? 0) > 0 && params.MediaUrl0) {
        const mime = params.MediaContentType0 ?? "";
        body = mediaLabel(mime.split("/")[0] === "application" ? "document" : mime.split("/")[0] || "document", body);
        const file = await downloadTwilioMedia(params.MediaUrl0, mime);
        if (file) mediaUrl = (await saveInboundMedia(file)) ?? undefined;
      }
      await processInboundWhatsapp(params.From ?? "", body, params.MessageSid, mediaUrl);
    });

    return twiml();
  } catch (err) {
    console.error("[messaging] whatsapp inbound error:", err);
    return twiml();
  }
}
