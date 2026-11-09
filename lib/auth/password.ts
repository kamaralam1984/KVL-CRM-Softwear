// Password hashing: scrypt (Node built-in, memory-hard). Also verifies bcrypt hashes ($2…) so users
// migrated from a previous provider can still sign in; those are re-hashed to scrypt on first login.
import { scrypt as scryptCb, randomBytes, timingSafeEqual, type ScryptOptions } from "crypto";
import bcrypt from "bcryptjs";

const N = 16384, R = 8, P = 1, KEYLEN = 64;
const scrypt = (pw: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(pw, salt, keylen, opts, (e, k) => (e ? reject(e) : resolve(k))));

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64")}:${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };
  try {
    if (stored.startsWith("$2")) return { ok: await bcrypt.compare(password, stored), needsRehash: true };
    const [scheme, n, r, p, salt, hash] = stored.split(":");
    if (scheme !== "scrypt") return { ok: false, needsRehash: false };
    const expected = Buffer.from(hash, "base64");
    const key = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
    return { ok: key.length === expected.length && timingSafeEqual(key, expected), needsRehash: false };
  } catch { return { ok: false, needsRehash: false }; }
}

/** Burns the same CPU as a real check — used for unknown emails so response time doesn't reveal which accounts exist. */
export async function dummyVerify(): Promise<void> {
  await scrypt("x", Buffer.alloc(16), KEYLEN, { N, r: R, p: P });
}
