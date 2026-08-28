import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHmac } from "crypto";
import { verifyMetaSignature } from "./metaSignature";

const ORIGINAL_SECRET = process.env.META_APP_SECRET;

function sign(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

describe("verifyMetaSignature (Phase 42)", () => {
  beforeAll(() => { process.env.META_APP_SECRET = "test-app-secret"; });
  afterAll(() => { process.env.META_APP_SECRET = ORIGINAL_SECRET; });

  const body = JSON.stringify({ object: "instagram", entry: [{ messaging: [{ sender: { id: "123" }, message: { text: "hi" } }] }] });

  it("accepts a correctly-signed body", () => {
    const sig = sign(body, "test-app-secret");
    expect(verifyMetaSignature(body, sig)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = sign(body, "test-app-secret");
    expect(verifyMetaSignature(body + "x", sig)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const sig = sign(body, "wrong-secret");
    expect(verifyMetaSignature(body, sig)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyMetaSignature(body, null)).toBe(false);
  });

  it("rejects a signature without the sha256= prefix", () => {
    const sig = createHmac("sha256", "test-app-secret").update(body, "utf8").digest("hex");
    expect(verifyMetaSignature(body, sig)).toBe(false);
  });

  it("fails closed when META_APP_SECRET isn't set", () => {
    delete process.env.META_APP_SECRET;
    const sig = sign(body, "test-app-secret");
    expect(verifyMetaSignature(body, sig)).toBe(false);
    process.env.META_APP_SECRET = "test-app-secret";
  });
});
