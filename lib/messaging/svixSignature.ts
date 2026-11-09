// Resend signs webhooks with Svix: HMAC-SHA256 over `${id}.${timestamp}.${rawBody}`,
// key = base64-decoded part of the "whsec_…" secret, header "v1,<base64>" (space-separated list).
import { createHmac, timingSafeEqual } from "crypto";

export function verifySvixSignature(rawBody: string, h: { id: string | null; timestamp: string | null; signature: string | null }, secret = process.env.RESEND_WEBHOOK_SECRET, now = Date.now()): boolean {
  if (!secret || !h.id || !h.timestamp || !h.signature) return false;
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false; // 5-minute replay window
  try {
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = createHmac("sha256", key).update(`${h.id}.${h.timestamp}.${rawBody}`).digest();
    return h.signature.split(" ").some((part) => {
      const [version, sig] = part.split(",");
      if (version !== "v1" || !sig) return false;
      const got = Buffer.from(sig, "base64");
      return got.length === expected.length && timingSafeEqual(got, expected);
    });
  } catch { return false; }
}
