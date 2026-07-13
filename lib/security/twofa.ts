// Phase 15 — Enterprise Security: TOTP (RFC 6238) two-factor helpers.
// Zero external dependencies — uses Node's built-in crypto for HMAC-SHA1.
// Server-only (imports "crypto"). Base32 per RFC 4648 (no padding on secrets).

import { createHmac, randomBytes } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_DIGITS = 6;
const DEFAULT_PERIOD_S = 30;
// Allowed clock drift in steps on either side of the current window.
const DEFAULT_WINDOW = 1;

/** Encode raw bytes to an unpadded RFC 4648 base32 string. */
function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

/** Decode a base32 string (case-insensitive, ignores spaces/padding). */
function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue; // skip invalid chars defensively
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * generateTotpSecret — a random base32 secret (default 20 bytes / 160 bits,
 * the RFC-recommended size for HMAC-SHA1). Returns an unpadded base32 string.
 */
export function generateTotpSecret(byteLength = 20): string {
  try {
    return base32Encode(randomBytes(byteLength));
  } catch (err) {
    console.error("[security] generateTotpSecret failed", err);
    return "";
  }
}

/**
 * otpauthUrl — build an otpauth:// provisioning URI for authenticator apps
 * (Google Authenticator, Authy, 1Password, …).
 */
export function otpauthUrl(
  secret: string,
  account: string,
  issuer: string,
): string {
  try {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: "SHA1",
      digits: String(DEFAULT_DIGITS),
      period: String(DEFAULT_PERIOD_S),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  } catch (err) {
    console.error("[security] otpauthUrl failed", err);
    return "";
  }
}

/** Compute the HOTP code for a given counter value. */
function hotp(secret: Buffer, counter: number, digits: number): string {
  // 8-byte big-endian counter.
  const buf = Buffer.alloc(8);
  // Use two 32-bit halves to stay safe past 2^32.
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  buf.writeUInt32BE(high, 0);
  buf.writeUInt32BE(low, 4);

  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = binary % 10 ** digits;
  return code.toString().padStart(digits, "0");
}

/** Constant-time string comparison to resist timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * verifyTotp — validate a user-supplied token against the secret at time atMs.
 * `atMs` is passed in (no top-level Date.now) so it is deterministic/testable.
 * Accepts ±DEFAULT_WINDOW steps of clock drift. Returns false on any error.
 */
export function verifyTotp(
  secret: string,
  token: string,
  atMs: number,
  opts?: { digits?: number; periodS?: number; window?: number },
): boolean {
  try {
    const digits = opts?.digits ?? DEFAULT_DIGITS;
    const periodS = opts?.periodS ?? DEFAULT_PERIOD_S;
    const window = opts?.window ?? DEFAULT_WINDOW;

    const normalized = String(token ?? "").replace(/\s+/g, "");
    if (!/^\d+$/.test(normalized)) return false;

    const key = base32Decode(secret);
    if (key.length === 0) return false;

    const counter = Math.floor(atMs / 1000 / periodS);
    for (let offset = -window; offset <= window; offset++) {
      const expected = hotp(key, counter + offset, digits);
      if (timingSafeEqual(expected, normalized)) return true;
    }
    return false;
  } catch (err) {
    console.error("[security] verifyTotp failed", err);
    return false;
  }
}
