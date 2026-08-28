// Phase 42 — Social DMs. Handles BOTH Instagram and Facebook Messenger —
// Meta's Instagram messaging webhook payload is modeled after Messenger's
// (same `entry[].messaging[]` shape), distinguished only by `object: "instagram"
// | "page"`. GET is Meta's required webhook-verification handshake
// (hub.mode/hub.verify_token/hub.challenge); POST is the actual event
// delivery, signature-verified via lib/messaging/metaSignature.ts. Inert
// until META_APP_SECRET/META_WEBHOOK_VERIFY_TOKEN are set — same "won't
// accept unauthenticated writes until configured" convention as every other
// inbound webhook in this codebase. No identity resolution here (unlike
// WhatsApp/SMS inbound) — a DM sender's PSID/IGSID carries no phone/email,
// and resolveIdentity() requires one of those, same honest gap webchat's
// inbound route already has.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { verifyMetaSignature } from "@/lib/messaging/metaSignature";
import { recordInboundMessage } from "@/lib/actions/conversations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

type MetaMessagingEvent = {
  sender?: { id?: string };
  message?: { mid?: string; text?: string };
};

type MetaWebhookPayload = {
  object?: string;
  entry?: { messaging?: MetaMessagingEvent[] }[];
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.META_APP_SECRET) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    }

    const limit = rateLimit(`meta:inbound:${clientIp(req)}`, 60, 60_000);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, signature)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let payload: MetaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const channel = payload.object === "instagram" ? "instagram" : "messenger";
    for (const entry of payload.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        const senderId = event.sender?.id;
        const text = event.message?.text;
        if (!senderId || !text) continue;
        await recordInboundMessage(channel, senderId, text, event.message?.mid);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[messaging] meta inbound error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
