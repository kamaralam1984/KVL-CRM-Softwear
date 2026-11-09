import { describe, it, expect } from "vitest";
import { phoneKey, emailKey, isSuppressed } from "./dnc";
import { signUnsubscribe, verifyUnsubscribe, unsubscribeUrl } from "./token";

describe("phoneKey / emailKey", () => {
  it("treats every format of the same Indian number as one contact", () => {
    for (const p of ["+91 98123-45678", "919812345678", "09812345678", "98123 45678"]) expect(phoneKey(p)).toBe("9812345678");
  });
  it("ignores junk", () => { expect(phoneKey("abc")).toBe(""); expect(phoneKey(undefined)).toBe(""); });
  it("lower-cases email", () => expect(emailKey("  Foo@Bar.COM ")).toBe("foo@bar.com"));
});

describe("isSuppressed", () => {
  it("fails open (sends) when the database isn't configured", async () => expect(await isSuppressed({ phone: "+919812345678" }, "whatsapp")).toBe(false));
});

describe("unsubscribe tokens", () => {
  it("round-trips, case-insensitively, and rejects tampering", () => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret-123";
    const t = signUnsubscribe("A@b.com");
    expect(verifyUnsubscribe("a@b.com", t)).toBe(true);
    expect(verifyUnsubscribe("other@b.com", t)).toBe(false);
    expect(verifyUnsubscribe("a@b.com", t.slice(0, -1) + "0")).toBe(false);
    expect(verifyUnsubscribe("a@b.com", "")).toBe(false);
    expect(unsubscribeUrl("a@b.com", "https://app.test/")).toContain("https://app.test/unsubscribe?e=a%40b.com&t=");
    delete process.env.UNSUBSCRIBE_SECRET;
  });
});
