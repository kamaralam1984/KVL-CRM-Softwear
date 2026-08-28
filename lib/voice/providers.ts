// Outbound call dispatch. Picks a real provider when its credentials are
// present, otherwise mocks the call (logs + returns a queued placeholder id).
// initiateCall NEVER throws — any provider failure degrades to a mock result so
// the CRM flow keeps working.
//
// Phase 44 — the "twilio" provider now genuinely places a live-AI-audio
// call: it POSTs to Twilio's Calls API with inline TwiML
// (<Connect><Stream>) pointing at the standalone voice-relay/server.js
// process (a separate PM2-managed WebSocket bridge — see that file's header
// for why it can't live inside this Next.js app), which relays the call's
// audio to OpenAI's Realtime API and back. Requires BOTH Twilio credentials
// AND VOICE_RELAY_WSS_URL (the relay's public wss:// address) — without the
// second, a real Twilio call could be placed with nowhere for its audio
// stream to go, so this stays mocked until both are configured.
//
// openai_realtime/elevenlabs as standalone providers (no telephony carrier)
// still only acknowledge the credential and queue — an actual phone call
// needs a carrier (Twilio) to originate it; those two are the AI-brain half
// of the twilio-provider path above, not usable telephony providers alone.

import type { CallProvider, CallRequest, CallResult } from "./types";
import { getServerClient } from "@/lib/supabase/server";

// Gap-check fix — also requires VOICE_RELAY_SHARED_SECRET: the relay
// rejects every connection with no valid token (see voice-relay/server.js's
// header comment), so placing a real, billed Twilio call without one would
// ring the destination and then immediately fail to bridge any audio —
// worse than an honest mock. Both this app and the relay process read the
// same secret from the same .env.local, so no separate exchange is needed.
function hasVoiceRelayConfigured(): boolean {
  return Boolean(process.env.VOICE_RELAY_WSS_URL && process.env.VOICE_RELAY_SHARED_SECRET);
}

async function placeTwilioStreamCall(req: CallRequest, to: string): Promise<CallResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
  const relayUrl = `${process.env.VOICE_RELAY_WSS_URL!}?token=${encodeURIComponent(process.env.VOICE_RELAY_SHARED_SECRET!)}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${relayUrl}"/></Connect></Response>`;

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Twiml: twiml }),
    });
    if (!res.ok) {
      console.error(`[voice] Twilio Calls API HTTP ${res.status}`);
      return { id: mockId("mock"), status: "failed", provider: "mock", usedRealProvider: false };
    }
    const j = (await res.json()) as { sid?: string };
    const callSid = j.sid ?? mockId("twilio");

    // A row for voice-relay/server.js's finalize() to update by
    // provider_call_sid once the call ends and the transcript is known —
    // reuses Phase 41's call_logs table rather than a parallel one.
    try {
      const db = getServerClient();
      await db.from("call_logs").insert({
        from_number: from,
        direction: "outbound",
        status: "queued",
        provider_call_sid: callSid,
        is_ai_call: true,
        ai_provider: "twilio",
      });
    } catch (err) {
      console.error("[voice] call_logs insert failed (non-fatal):", err);
    }

    return { id: callSid, status: "queued", provider: "twilio", usedRealProvider: true };
  } catch (err) {
    console.error("[voice] placeTwilioStreamCall error, degrading to mock:", err);
    return { id: mockId("mock"), status: "failed", provider: "mock", usedRealProvider: false };
  }
}

function mockId(prefix: string): string {
  // Avoid module-top new Date(); build id lazily at call time.
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hasTwilioCreds(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER &&
      hasVoiceRelayConfigured(),
  );
}

function resolveProvider(pref?: CallProvider): {
  provider: CallProvider;
  hasKey: boolean;
} {
  const provider: CallProvider = pref ?? "openai_realtime";
  let hasKey = false;
  if (provider === "openai_realtime") hasKey = Boolean(process.env.OPENAI_API_KEY);
  else if (provider === "elevenlabs") hasKey = Boolean(process.env.ELEVENLABS_API_KEY);
  else if (provider === "twilio") hasKey = hasTwilioCreds();
  return { provider, hasKey };
}

export async function initiateCall(req: CallRequest): Promise<CallResult> {
  const to = (req.to ?? "").trim();
  if (!to) {
    // Bad input still degrades gracefully to a failed result, never throws.
    console.error("[voice] initiateCall called without a destination number");
    return { id: mockId("call"), status: "failed", provider: "mock", usedRealProvider: false };
  }

  const { provider, hasKey } = resolveProvider(req.provider);

  if (!hasKey) {
    // No credentials for the chosen provider → mock the call.
    console.error(
      `[voice] no credentials for provider "${provider}" — mocking call to ${to}` +
        (req.leadCompany ? ` (${req.leadCompany})` : ""),
    );
    return { id: mockId("mock"), status: "queued", provider: "mock", usedRealProvider: false };
  }

  try {
    if (provider === "twilio") {
      // Real, live-AI-audio call — see placeTwilioStreamCall above.
      return await placeTwilioStreamCall(req, to);
    }
    // openai_realtime/elevenlabs alone have no telephony carrier to
    // originate a call with — acknowledge the credential and queue, same
    // honest behavior as before this phase (a real call via either of
    // these needs the "twilio" provider path, which carries their audio).
    console.error(
      `[voice] "${provider}" has no telephony carrier of its own — acknowledging credential, queuing (use provider: "twilio" to actually place a call)` +
        (req.leadCompany ? ` (${req.leadCompany})` : ""),
    );
    return { id: mockId(provider), status: "queued", provider, usedRealProvider: true };
  } catch (err) {
    console.error(`[voice] provider "${provider}" call failed, degrading to mock:`, err);
    return { id: mockId("mock"), status: "failed", provider: "mock", usedRealProvider: false };
  }
}
