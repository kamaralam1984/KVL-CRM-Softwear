// Signed unsubscribe tokens — HMAC(email), so a link can't be forged for someone else's address.
import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function signUnsubscribe(email: string): string {
  const s = secret();
  if (!s) return "";
  return createHmac("sha256", s).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsubscribe(email: string, token: string): boolean {
  const expected = signUnsubscribe(email);
  if (!expected || !token) return false;
  const a = Buffer.from(expected), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unsubscribeUrl(email: string, appUrl = process.env.NEXT_PUBLIC_APP_URL): string | null {
  const t = signUnsubscribe(email);
  if (!appUrl || !t) return null;
  return `${appUrl.replace(/\/$/, "")}/unsubscribe?e=${encodeURIComponent(email)}&t=${t}`;
}
