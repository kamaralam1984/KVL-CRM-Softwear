// AES-256-GCM encryption for credentials stored in the database. Key = SHA-256 of
// SOCIAL_CONFIG_KEY, else WA_CONFIG_KEY, else AUTH_JWT_SECRET (same fallback chain as the WhatsApp
// config, so one server secret protects everything). Ciphertext format "enc:v1:<base64 iv|tag|data>".
// Server-only. Never throws.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export const MASK = "••••";

function key(): Buffer | null {
  const raw = process.env.SOCIAL_CONFIG_KEY ?? process.env.WA_CONFIG_KEY ?? process.env.AUTH_JWT_SECRET;
  return raw ? createHash("sha256").update(raw).digest() : null;
}

export function encryptionAvailable(): boolean { return key() !== null; }

export function encryptSecret(plain: string): string {
  const k = key();
  if (!plain || !k) return plain;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc:v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64")}`;
}

export function decryptSecret(value: string): string {
  if (!value.startsWith("enc:v1:")) return value;
  const k = key();
  if (!k) return "";
  try {
    const buf = Buffer.from(value.slice(7), "base64");
    const d = createDecipheriv("aes-256-gcm", k, buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
  } catch {
    console.error("[secret-box] could not decrypt a saved secret (server key changed?) — re-enter it");
    return "";
  }
}
