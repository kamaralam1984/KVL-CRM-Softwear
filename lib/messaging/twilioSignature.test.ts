import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHmac } from "crypto";
import { verifyTwilioSignature } from "./twilioSignature";

const ORIGINAL_TOKEN = process.env.TWILIO_AUTH_TOKEN;

function sign(url: string, params: Record<string, string>, token: string): string {
  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];
  return createHmac("sha1", token).update(data, "utf8").digest("base64");
}

describe("verifyTwilioSignature", () => {
  beforeAll(() => { process.env.TWILIO_AUTH_TOKEN = "test-auth-token"; });
  afterAll(() => { process.env.TWILIO_AUTH_TOKEN = ORIGINAL_TOKEN; });

  const url = "https://example.com/api/whatsapp/inbound";
  const params = { From: "whatsapp:+919812345678", Body: "hello", MessageSid: "SM123" };

  it("accepts a correctly-signed request", () => {
    const sig = sign(url, params, "test-auth-token");
    expect(verifyTwilioSignature(url, params, sig)).toBe(true);
  });

  it("rejects a tampered param", () => {
    const sig = sign(url, params, "test-auth-token");
    expect(verifyTwilioSignature(url, { ...params, Body: "tampered" }, sig)).toBe(false);
  });

  it("rejects a signature made with the wrong token", () => {
    const sig = sign(url, params, "wrong-token");
    expect(verifyTwilioSignature(url, params, sig)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyTwilioSignature(url, params, null)).toBe(false);
  });

  it("fails closed when TWILIO_AUTH_TOKEN isn't set", () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const sig = sign(url, params, "test-auth-token");
    expect(verifyTwilioSignature(url, params, sig)).toBe(false);
    process.env.TWILIO_AUTH_TOKEN = "test-auth-token";
  });
});
