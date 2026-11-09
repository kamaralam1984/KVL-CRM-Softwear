import { describe, it, expect } from "vitest";
import { nextStatus, mapTwilioStatus } from "./status";
import { verifySvixSignature } from "./svixSignature";
import { createHmac } from "crypto";

describe("nextStatus (never downgrades)", () => {
  it("progresses", () => { expect(nextStatus("sent", "delivered")).toBe("delivered"); expect(nextStatus("delivered", "read")).toBe("read"); });
  it("ignores late/out-of-order older events", () => { expect(nextStatus("read", "delivered")).toBe("read"); expect(nextStatus("delivered", "sent")).toBe("delivered"); });
  it("failed overrides sent/queued but not delivered", () => { expect(nextStatus("sent", "failed")).toBe("failed"); expect(nextStatus("delivered", "failed")).toBe("delivered"); });
  it("recovers from failed on a later delivered", () => expect(nextStatus("failed", "delivered")).toBe("delivered"));
  it("mock can be upgraded", () => expect(nextStatus("mock", "sent")).toBe("sent"));
});

describe("mapTwilioStatus", () => {
  it.each([["queued", "queued"], ["sent", "sent"], ["delivered", "delivered"], ["read", "read"], ["undelivered", "failed"], ["failed", "failed"]])("%s → %s", (i, o) => expect(mapTwilioStatus(i)).toBe(o));
  it("unknown → null", () => expect(mapTwilioStatus("weird")).toBeNull());
});

describe("verifySvixSignature (Resend webhooks)", () => {
  const key = Buffer.from("super-secret-key-bytes");
  const secret = `whsec_${key.toString("base64")}`;
  const body = '{"type":"email.bounced"}';
  const now = 1_700_000_000_000;
  const sign = (id: string, ts: string) => `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
  const ts = String(now / 1000);

  it("accepts a valid signature", () => expect(verifySvixSignature(body, { id: "msg_1", timestamp: ts, signature: sign("msg_1", ts) }, secret, now)).toBe(true));
  it("accepts when one of several signatures matches", () => expect(verifySvixSignature(body, { id: "msg_1", timestamp: ts, signature: `v1,AAAA ${sign("msg_1", ts)}` }, secret, now)).toBe(true));
  it("rejects a tampered body", () => expect(verifySvixSignature(body + " ", { id: "msg_1", timestamp: ts, signature: sign("msg_1", ts) }, secret, now)).toBe(false));
  it("rejects a replayed (old) timestamp", () => { const old = String(now / 1000 - 3600); expect(verifySvixSignature(body, { id: "msg_1", timestamp: old, signature: sign("msg_1", old) }, secret, now)).toBe(false); });
  it("rejects when the secret is missing", () => expect(verifySvixSignature(body, { id: "msg_1", timestamp: ts, signature: sign("msg_1", ts) }, undefined, now)).toBe(false));
});
