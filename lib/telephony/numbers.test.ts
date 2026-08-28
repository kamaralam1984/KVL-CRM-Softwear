import { describe, it, expect } from "vitest";
import { provisionTrackingNumber, isTwilioNumberProvisioningConfigured } from "./numbers";

describe("provisionTrackingNumber (Phase 41) — mock fallback, never throws", () => {
  it("isTwilioNumberProvisioningConfigured is false when Twilio creds aren't set in this test env", () => {
    expect(isTwilioNumberProvisioningConfigured()).toBe(false);
  });

  it("mocks a number when Twilio isn't configured", async () => {
    const result = await provisionTrackingNumber("415", "https://example.com");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
    expect(result.phoneNumber).toMatch(/^\+1555415\d{4}$/);
  });

  it("mock numbers are distinct across calls", async () => {
    const a = await provisionTrackingNumber("212", "https://example.com");
    const b = await provisionTrackingNumber("212", "https://example.com");
    expect(a.twilioSid).not.toEqual(b.twilioSid);
  });
});
