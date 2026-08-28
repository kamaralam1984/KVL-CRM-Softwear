// Phase 21 — Unified Conversations. Verifies Twilio's X-Twilio-Signature per
// their documented algorithm: base64(HMAC-SHA1(authToken, url + sorted
// "key"+"value" pairs from the POST form body)). Hand-rolled with Node's
// built-in crypto — no Twilio SDK, matching lib/security/twofa.ts's same
// zero-dependency convention.
//
// CAVEAT (same class as lib/integrations/truecaller.ts's documented seam):
// `url` must be EXACTLY the public HTTPS URL Twilio was configured to call
// (scheme+host+path+query), byte-for-byte. Behind a reverse proxy/load
// balancer, the URL Next.js sees internally can differ from that public URL
// — re-verify this against the actual deployment before depending on it in
// production; until then this fails closed (returns false) rather than
// silently accepting an unverifiable request.

import { createHmac, timingSafeEqual } from "crypto";

export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;

  try {
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) data += key + params[key];

    const expected = createHmac("sha1", token).update(data, "utf8").digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch (err) {
    console.error("[messaging] verifyTwilioSignature failed", err);
    return false;
  }
}
