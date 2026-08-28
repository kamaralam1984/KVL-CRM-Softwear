// Phase 41 — Call Tracking (Dynamic Number Insertion). Twilio's Voice
// webhook, set as the VoiceUrl on every number lib/telephony/numbers.ts
// provisions. Unlike Phase 22's missed-call route (fires only when a call
// goes unanswered, via a 3rd-party telephony provider's own webhook),
// this handles the call the moment it rings — looks up which tracking
// number was dialed, attributes it to that number's campaign (reusing the
// existing campaigns/campaign_touchpoints ledger, same recordSessionStart +
// recordTouchpoint calls the missed-call route already makes), logs it, and
// returns TwiML forwarding the call to the real business number — the
// caller's experience is unchanged, only attribution + logging are added.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { verifyTwilioSignature } from "@/lib/messaging/twilioSignature";
import { getServerClient } from "@/lib/supabase/server";
import { recordSessionStart } from "@/lib/tracking/store";
import { recordTouchpoint } from "@/lib/attribution/touchpoints";
import { generateSessionId } from "@/lib/tracking/ids";
import { normalizePhone } from "@/lib/identity/resolve";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";

export const dynamic = "force-dynamic";

function twiml(body: string) {
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>${body}`, { headers: { "Content-Type": "text/xml" } });
}

function fallbackTwiml() {
  return twiml("<Response><Say>Sorry, this number is not configured to take calls right now.</Say></Response>");
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    }

    const limit = rateLimit(`telephony:inbound-call:${clientIp(req)}`, 60, 60_000);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

    const rawBody = await req.text();
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const signature = req.headers.get("x-twilio-signature");
    if (!verifyTwilioSignature(req.nextUrl.toString(), params, signature)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const dialedNumber = params.To ?? "";
    const callerNumber = normalizePhone(params.From ?? "");
    const callSid = params.CallSid ?? "";

    const db = getServerClient();
    const { data: trackingNumber } = await db.from("tracking_numbers").select("*").eq("phone_number", dialedNumber).maybeSingle();
    if (!trackingNumber || !trackingNumber.forward_to_number) return fallbackTwiml();

    // Attribution — exact same two calls the Phase 22 missed-call route
    // already makes, just with the call's own tracking-number campaign
    // instead of the fixed "missed_call" source.
    const visitorId = `call:${callerNumber}`;
    const sessionId = generateSessionId();
    const source = trackingNumber.campaign_name || "call_tracking";
    await recordSessionStart(
      { sessionId, visitorId, landingPage: "", attribution: { source, medium: "phone", campaign: trackingNumber.campaign_name, term: "", content: "", gclid: "", fbclid: "", msclkid: "" }, device: {} },
      trackingNumber.site_id ?? DEFAULT_SITE_ID,
    );
    await recordTouchpoint({ visitorId, sessionId, source, medium: "phone", campaign: trackingNumber.campaign_name }, trackingNumber.site_id ?? DEFAULT_SITE_ID);

    await db.from("call_logs").insert({
      tracking_number_id: trackingNumber.id,
      from_number: callerNumber,
      direction: "inbound",
      status: params.CallStatus ?? "ringing",
      campaign_id: trackingNumber.campaign_id,
      provider_call_sid: callSid,
    });

    const statusCallback = `${req.nextUrl.origin}/api/telephony/call-status`;
    return twiml(
      `<Response><Dial callerId="${dialedNumber}" record="record-from-answer" recordingStatusCallback="${statusCallback}" action="${statusCallback}"><Number statusCallback="${statusCallback}" statusCallbackEvent="completed">${trackingNumber.forward_to_number}</Number></Dial></Response>`,
    );
  } catch (err) {
    console.error("[telephony] inbound-call route error:", err);
    return fallbackTwiml();
  }
}
