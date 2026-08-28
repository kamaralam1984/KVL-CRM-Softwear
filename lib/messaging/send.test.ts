import { describe, it, expect } from "vitest";
import { sendSms, sendInstagramDm, sendMessengerMessage, isMetaMessagingConfigured, sendEmail, isEmailConfigured } from "./send";

describe("sendSms (Phase 37 — optional DLT templateKey)", () => {
  it("never throws and still mocks when neither Twilio nor Supabase is configured", async () => {
    const result = await sendSms("+919812345678", "hello", "missed_call_reply");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
  });

  it("behaves identically without a templateKey (backward-compatible)", async () => {
    const result = await sendSms("+919812345678", "hello");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
  });
});

describe("Social DM sends (Phase 42) — mock fallback, never throw", () => {
  it("mocks sendInstagramDm when META_INSTAGRAM_USER_ID isn't set", async () => {
    const result = await sendInstagramDm("psid_123", "hello");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
  });

  it("mocks sendMessengerMessage when META_PAGE_ID isn't set", async () => {
    const result = await sendMessengerMessage("psid_123", "hello");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
  });

  it("isMetaMessagingConfigured is false in this test env", () => {
    expect(isMetaMessagingConfigured()).toBe(false);
  });
});

describe("sendEmail (Phase 45) — mock fallback, never throws", () => {
  it("mocks when RESEND_API_KEY isn't set", async () => {
    const result = await sendEmail("someone@example.com", "Reminder", "See you soon!");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
  });

  it("isEmailConfigured is false in this test env", () => {
    expect(isEmailConfigured()).toBe(false);
  });
});
