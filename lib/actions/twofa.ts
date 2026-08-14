"use server";
// Thin server-action wrappers around lib/security/twofa.ts's RFC 6238 TOTP
// helpers, so the client can enroll/verify without the HMAC secret ever
// being computed in the browser.

import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/security/twofa";

export async function startTwoFaEnrollment(accountEmail: string) {
  const secret = generateTotpSecret();
  const url = otpauthUrl(secret, accountEmail || "account", "KVL CRM");
  return { secret, otpauthUrl: url };
}

export async function confirmTwoFaEnrollment(secret: string, token: string): Promise<boolean> {
  return verifyTotp(secret, token, Date.now());
}
