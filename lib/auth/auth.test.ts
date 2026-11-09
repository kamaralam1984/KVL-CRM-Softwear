import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { signJwt, verifyJwt } from "./jwt";
import bcrypt from "bcryptjs";

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("s3cret!"), b = await hashPassword("s3cret!");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt:")).toBe(true);
    expect((await verifyPassword("s3cret!", a)).ok).toBe(true);
    expect((await verifyPassword("wrong", a)).ok).toBe(false);
  });
  it("accepts imported bcrypt hashes and flags them for re-hashing", async () => {
    const h = await bcrypt.hash("legacy-pw", 8);
    expect(await verifyPassword("legacy-pw", h)).toEqual({ ok: true, needsRehash: true });
    expect((await verifyPassword("nope", h)).ok).toBe(false);
  });
  it("rejects empty / malformed stored values without throwing", async () => {
    expect((await verifyPassword("x", null)).ok).toBe(false);
    expect((await verifyPassword("x", "garbage")).ok).toBe(false);
    expect((await verifyPassword("x", "scrypt:1:2")).ok).toBe(false);
  });
});

describe("jwt (HS256)", () => {
  const secret = "unit-test-secret-1234567890";
  it("round-trips claims", () => {
    const t = signJwt({ sub: "u1", email: "a@b.c" }, 60, secret)!;
    expect(verifyJwt(t, secret)).toMatchObject({ sub: "u1", email: "a@b.c" });
  });
  it("rejects tampering, wrong secret, expiry, and alg=none", () => {
    const t = signJwt({ sub: "u1" }, 60, secret)!;
    const [h, p, s] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", exp: 9999999999 })).toString("base64url");
    expect(verifyJwt(`${h}.${forged}.${s}`, secret)).toBeNull();
    expect(verifyJwt(t, "another-secret-1234567890")).toBeNull();
    expect(verifyJwt(t, secret, Math.floor(Date.now() / 1000) + 120)).toBeNull();
    const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${p}.`;
    expect(verifyJwt(none, secret)).toBeNull();
    expect(verifyJwt("not.a.jwt", secret)).toBeNull();
  });
  it("signing needs a secret of 16+ chars", () => {
    expect(signJwt({ sub: "x" }, 60, null)).toBeNull();
  });
});
