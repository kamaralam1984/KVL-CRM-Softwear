import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initiateCall } from "./providers";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

describe("initiateCall (Phase 44 — gap on twilio requiring VOICE_RELAY_WSS_URL)", () => {
  beforeEach(resetEnv);
  afterEach(resetEnv);

  it("never throws with a missing destination number", async () => {
    const result = await initiateCall({ to: "" });
    expect(result.status).toBe("failed");
    expect(result.usedRealProvider).toBe(false);
  });

  it("mocks when no provider credentials are set", async () => {
    const result = await initiateCall({ to: "+15551234567", provider: "openai_realtime" });
    expect(result.provider).toBe("mock");
    expect(result.usedRealProvider).toBe(false);
  });

  it("queues (acknowledges, doesn't place a real call) for openai_realtime even with a key — no telephony carrier of its own", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const result = await initiateCall({ to: "+15551234567", provider: "openai_realtime" });
    expect(result.provider).toBe("openai_realtime");
    expect(result.usedRealProvider).toBe(true);
    expect(result.status).toBe("queued");
  });

  it("mocks the twilio provider when Twilio creds are set but VOICE_RELAY_WSS_URL isn't — no relay for the audio to reach", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN = "test-token";
    process.env.TWILIO_FROM_NUMBER = "+15550001111";
    process.env.VOICE_RELAY_SHARED_SECRET = "test-secret";
    delete process.env.VOICE_RELAY_WSS_URL;
    const result = await initiateCall({ to: "+15551234567", provider: "twilio" });
    expect(result.provider).toBe("mock");
    expect(result.usedRealProvider).toBe(false);
  });

  it("mocks the twilio provider when VOICE_RELAY_WSS_URL is set but Twilio creds aren't", async () => {
    process.env.VOICE_RELAY_WSS_URL = "wss://example.com/voice-stream";
    process.env.VOICE_RELAY_SHARED_SECRET = "test-secret";
    delete process.env.TWILIO_ACCOUNT_SID;
    const result = await initiateCall({ to: "+15551234567", provider: "twilio" });
    expect(result.provider).toBe("mock");
    expect(result.usedRealProvider).toBe(false);
  });

  it("mocks the twilio provider when everything else is set but VOICE_RELAY_SHARED_SECRET isn't — the relay would reject the connection with no token", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN = "test-token";
    process.env.TWILIO_FROM_NUMBER = "+15550001111";
    process.env.VOICE_RELAY_WSS_URL = "wss://example.com/voice-stream";
    delete process.env.VOICE_RELAY_SHARED_SECRET;
    const result = await initiateCall({ to: "+15551234567", provider: "twilio" });
    expect(result.provider).toBe("mock");
    expect(result.usedRealProvider).toBe(false);
  });
});
