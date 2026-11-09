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
import { getDb } from "@/lib/db";

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

    // Click-to-call passes ?log=<call_logs.id> (recordings arrive on a different CallSid than the agent leg).
    const logId = req.nextUrl.searchParams.get("log") ?? "";
    const callSid = params.CallSid ?? params.ParentCallSid ?? "";
    if (!callSid && !logId) return NextResponse.json({ ok: true });

    // Only overwrite fields the event actually carries (a status event must not blank an earlier recording URL).
    const patch: Record<string, unknown> = {};
    const status = params.CallStatus ?? params.DialCallStatus;
    const dur = params.CallDuration ?? params.DialCallDuration ?? params.RecordingDuration;
    if (status) patch.status = status;
    if (dur) patch.duration_seconds = Number(dur);
    if (params.RecordingUrl) patch.recording_url = params.RecordingUrl;
    if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

    const db = getDb();
    await (logId ? db.from("call_logs").update(patch).eq("id", logId) : db.from("call_logs").update(patch).eq("provider_call_sid", callSid));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telephony] call-status route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
