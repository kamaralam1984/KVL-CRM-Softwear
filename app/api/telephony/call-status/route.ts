// Phase 41 — Call Tracking. Twilio's statusCallback target (set on the
// <Dial>/<Number> verbs in app/api/telephony/inbound-call/route.ts) — fires
// once the call ends with final duration/recording info. Updates the
// call_logs row this call's CallSid was logged under; a status event for an
// unknown CallSid is silently ignored (not an error — Twilio can fire this
// for calls this route never initiated, e.g. during signature testing).

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { verifyTwilioSignature } from "@/lib/messaging/twilioSignature";
import { getServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    }

    const limit = rateLimit(`telephony:call-status:${clientIp(req)}`, 60, 60_000);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

    const rawBody = await req.text();
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const signature = req.headers.get("x-twilio-signature");
    if (!verifyTwilioSignature(req.nextUrl.toString(), params, signature)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const callSid = params.CallSid ?? params.ParentCallSid ?? "";
    if (!callSid) return NextResponse.json({ ok: true });

    const db = getServerClient();
    await db
      .from("call_logs")
      .update({
        status: params.CallStatus ?? params.DialCallStatus ?? "completed",
        duration_seconds: params.CallDuration ? Number(params.CallDuration) : params.DialCallDuration ? Number(params.DialCallDuration) : null,
        recording_url: params.RecordingUrl ?? "",
      })
      .eq("provider_call_sid", callSid);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telephony] call-status route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
