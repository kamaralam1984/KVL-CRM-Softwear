// Twilio StatusCallback (set automatically on every outbound message when NEXT_PUBLIC_APP_URL is set).
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { verifyTwilioSignature } from "@/lib/messaging/twilioSignature";
import { applyDeliveryStatus, mapTwilioStatus } from "@/lib/messaging/status";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TWILIO_AUTH_TOKEN) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    if (!rateLimit(`twilio:status:${clientIp(req)}`, 300, 60_000).allowed) return NextResponse.json({ ok: false }, { status: 429 });
    const params = Object.fromEntries(new URLSearchParams(await req.text()));
    if (!verifyTwilioSignature(req.nextUrl.toString(), params, req.headers.get("x-twilio-signature"))) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const status = mapTwilioStatus(params.MessageStatus ?? "");
    if (status && params.MessageSid) await applyDeliveryStatus(params.MessageSid, status, params.ErrorMessage ?? params.ErrorCode ?? "");
    return new NextResponse("", { status: 200 });
  } catch (err) {
    console.error("[messaging] twilio status error:", err);
    return new NextResponse("", { status: 200 });
  }
}
