// Phase 42 — Social DMs. Verifies Meta's `X-Hub-Signature-256` header per
// their documented algorithm: `sha256=` + hex(HMAC-SHA256(appSecret, rawBody)).
// Structurally closest existing precedent in this codebase is
// lib/payments/razorpay.ts's verifyRazorpayWebhookSignature (HMAC-SHA256 over
// a raw body, timingSafeEqual) — same shape, adapted for Meta's `sha256=`
// prefix instead of a bare hex digest. Hand-rolled with Node's built-in
// crypto, matching every other signature-verification helper here.

import { createHmac, timingSafeEqual } from "crypto";

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signatureHeader) return false;

  try {
    const prefix = "sha256=";
    if (!signatureHeader.startsWith(prefix)) return false;
    const provided = signatureHeader.slice(prefix.length);

    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch (err) {
    console.error("[messaging] verifyMetaSignature failed:", err);
    return false;
  }
}
