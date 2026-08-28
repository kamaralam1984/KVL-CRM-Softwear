import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHmac } from "crypto";
import { verifyRazorpayWebhookSignature, isRazorpayApiConfigured } from "./razorpay";

const ORIGINAL = process.env.RAZORPAY_WEBHOOK_SECRET;

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

describe("verifyRazorpayWebhookSignature (Phase 27)", () => {
  beforeAll(() => { process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"; });
  afterAll(() => { process.env.RAZORPAY_WEBHOOK_SECRET = ORIGINAL; });

  const body = JSON.stringify({ event: "payment_link.paid", payload: { payment_link: { entity: { id: "plink_123" } } } });

  it("accepts a correctly-signed webhook body", () => {
    const sig = sign(body, "test-webhook-secret");
    expect(verifyRazorpayWebhookSignature(body, sig)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = sign(body, "test-webhook-secret");
    expect(verifyRazorpayWebhookSignature(body + "x", sig)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const sig = sign(body, "wrong-secret");
    expect(verifyRazorpayWebhookSignature(body, sig)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyRazorpayWebhookSignature(body, null)).toBe(false);
  });

  it("fails closed when RAZORPAY_WEBHOOK_SECRET isn't set", () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const sig = sign(body, "test-webhook-secret");
    expect(verifyRazorpayWebhookSignature(body, sig)).toBe(false);
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
  });
});

describe("isRazorpayApiConfigured", () => {
  it("is false when the merchant API key pair isn't set in this test env", () => {
    expect(isRazorpayApiConfigured()).toBe(false);
  });
});
