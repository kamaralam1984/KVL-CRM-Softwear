// Outbound call dispatch. Picks a real provider when its credentials are
// present, otherwise mocks the call (logs + returns a queued placeholder id).
// initiateCall NEVER throws — any provider failure degrades to a mock result so
// the CRM flow keeps working.
//
// IMPORTANT: Live AI calling is not fully wired here. Actually placing a real
// call requires a funded provider account PLUS server-side webhook wiring:
//   - OpenAI Realtime: a media-relay (WebRTC/WebSocket) bridging the phone
//     carrier audio to the Realtime API, and a callback URL for events.
//   - ElevenLabs: a Conversational AI agent id + a telephony integration
//     (e.g. Twilio) and a post-call webhook to fetch the transcript.
//   - Twilio: a purchased number, a TwiML/Voice webhook endpoint, and a
//     status-callback URL. This function only *initiates*; the transcript
//     arrives asynchronously via webhook and is fed back into analyzeCall().
// Until those are configured, "real" branches below just acknowledge the
// provider credential and return a queued id — they do not stream live audio.

import type { CallProvider, CallRequest, CallResult } from "./types";

function mockId(prefix: string): string {
  // Avoid module-top new Date(); build id lazily at call time.
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hasTwilioCreds(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
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
    // Credentials exist. In a fully-wired deployment this is where we would
    // hand off to the provider SDK + webhook relay (see file header). For now
    // we acknowledge the real credential and queue the call.
    console.error(
      `[voice] initiating call via "${provider}" to ${to}` +
        (req.leadCompany ? ` (${req.leadCompany})` : "") +
        " — live media/webhook relay required to complete",
    );
    return { id: mockId(provider), status: "queued", provider, usedRealProvider: true };
  } catch (err) {
    console.error(`[voice] provider "${provider}" call failed, degrading to mock:`, err);
    return { id: mockId("mock"), status: "failed", provider: "mock", usedRealProvider: false };
  }
}
