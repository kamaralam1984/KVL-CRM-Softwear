// Minimal HS256 JWT (sign + verify) with Node's crypto. Secret: AUTH_JWT_SECRET (>= 16 chars).
import { createHmac, timingSafeEqual } from "crypto";

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
export const SESSION_TTL_SEC = 7 * 24 * 3600;

export function authSecret(): string | null {
  const s = process.env.AUTH_JWT_SECRET;
  return s && s.length >= 16 ? s : null;
}

export function signJwt(payload: Record<string, unknown>, ttlSec = SESSION_TTL_SEC, secret = authSecret()): string | null {
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSec }));
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

export function verifyJwt<T extends Record<string, unknown> = Record<string, unknown>>(token: string, secret = authSecret(), nowSec = Math.floor(Date.now() / 1000)): T | null {
  if (!secret || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
    const got = Buffer.from(parts[2], "base64url");
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (header.alg !== "HS256") return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as T & { exp?: number };
    if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
    return payload;
  } catch { return null; }
}
