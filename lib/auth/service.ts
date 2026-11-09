// Server-side authentication on Neon: sign up / sign in / sessions / password reset / OAuth user linking.
// Tables: auth_users, password_resets, profiles (see lib/db/schema.sql). Never throws.
import { createHash, randomBytes } from "crypto";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword, dummyVerify } from "./password";
import { signJwt, verifyJwt, authSecret } from "./jwt";
import { sendEmail } from "@/lib/messaging/send";

export interface AuthedUser { id: string; email: string; name: string; role: string }
export type AuthResult = { ok: true; user: AuthedUser; accessToken: string } | { ok: false; error: string; status: number };

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? process.env.BRAND_NAME ?? "KVL CRM";
const normEmail = (e: string) => e.trim().toLowerCase();
const fail = (error: string, status = 400): AuthResult => ({ ok: false, error, status });

export function authConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && authSecret());
}

async function profileOf(userId: string, fallbackName: string): Promise<{ name: string; role: string }> {
  const { data } = await getDb().from("profiles").select("name,role").eq("id", userId).maybeSingle();
  return { name: (data?.name as string) || fallbackName, role: (data?.role as string) || "Member" };
}

function session(user: AuthedUser): AuthResult {
  const accessToken = signJwt({ sub: user.id, email: user.email });
  return accessToken ? { ok: true, user, accessToken } : fail("Authentication is not configured (AUTH_JWT_SECRET)", 501);
}

export async function signUp(input: { email: string; password: string; name?: string; role?: string; provider?: string }): Promise<AuthResult> {
  if (!authConfigured()) return fail("Authentication is not configured on this server", 501);
  const email = normEmail(input.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email address");
  if (!input.password || input.password.length < 6) return fail("Password must be at least 6 characters");
  const db = getDb();
  const { data: existing } = await db.from("auth_users").select("id").ilike("email", email).maybeSingle();
  if (existing) return fail("An account with this email already exists", 409);

  const name = (input.name ?? "").trim() || email.split("@")[0];
  // The very first account bootstraps the workspace as Admin; everyone else is a Member unless an
  // explicit, server-vetted role is passed (tenant signup).
  const { count } = await db.from("auth_users").select("id", { count: "exact", head: true });
  const role = (count ?? 0) === 0 ? "Admin" : input.role === "Admin" ? "Admin" : "Member";
  const { data: user, error } = await db.from("auth_users").insert({
    email, password_hash: await hashPassword(input.password), user_metadata: { name, role }, provider: input.provider ?? "password", last_sign_in_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !user) return fail(error?.code === "23505" ? "An account with this email already exists" : "Could not create the account", error?.code === "23505" ? 409 : 500);
  await db.from("profiles").insert({ id: user.id, name, role, avatar: name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() });
  return session({ id: user.id as string, email, name, role });
}

export async function signIn(emailRaw: string, password: string): Promise<AuthResult> {
  if (!authConfigured()) return fail("Authentication is not configured on this server", 501);
  const email = normEmail(emailRaw);
  const db = getDb();
  const { data: u } = await db.from("auth_users").select("id,email,password_hash,user_metadata").ilike("email", email).maybeSingle();
  if (!u) { await dummyVerify(); return fail("Invalid login credentials", 401); }
  const v = await verifyPassword(password, u.password_hash as string | null);
  if (!v.ok) return fail("Invalid login credentials", 401);
  const patch: Record<string, unknown> = { last_sign_in_at: new Date().toISOString() };
  if (v.needsRehash) patch.password_hash = await hashPassword(password); // upgrade imported bcrypt hashes
  await db.from("auth_users").update(patch).eq("id", u.id);
  const meta = (u.user_metadata ?? {}) as { name?: string };
  const p = await profileOf(u.id as string, meta.name ?? email.split("@")[0]);
  return session({ id: u.id as string, email: u.email as string, ...p });
}

/** Verifies a bearer token and returns the user it belongs to (null if invalid/expired/deleted). */
export async function getUserFromToken(token: string): Promise<{ id: string; email: string } | null> {
  const claims = verifyJwt<{ sub?: string; email?: string }>(token);
  if (!claims?.sub) return null;
  const { data } = await getDb().from("auth_users").select("id,email").eq("id", claims.sub).maybeSingle();
  return data ? { id: data.id as string, email: data.email as string } : null;
}

export async function me(token: string): Promise<AuthResult> {
  const u = await getUserFromToken(token);
  if (!u) return fail("Session expired — please sign in again", 401);
  const p = await profileOf(u.id, u.email.split("@")[0]);
  return session({ id: u.id, email: u.email, ...p });
}

// ── Password reset ───────────────────────────────────────────────────────────
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Always resolves ok (never reveals whether the email has an account). */
export async function requestPasswordReset(emailRaw: string, origin: string): Promise<void> {
  try {
    if (!authConfigured()) return;
    const email = normEmail(emailRaw);
    const db = getDb();
    const { data: u } = await db.from("auth_users").select("id").ilike("email", email).maybeSingle();
    if (!u) return;
    const token = randomBytes(32).toString("base64url");
    await db.from("password_resets").insert({ user_id: u.id, token_hash: sha(token), expires_at: new Date(Date.now() + 3600_000).toISOString() });
    const link = `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;
    await sendEmail(email, `Reset your ${BRAND} password`,
      `<p>We received a request to reset your password.</p><p><a href="${link}">Set a new password</a> (valid for 1 hour).</p><p>If you didn't ask for this, you can ignore this email.</p>`,
      { transactional: true, bypassSuppression: true, sentBy: "system" });
  } catch (err) { console.error("[auth] requestPasswordReset failed:", err); }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (!authConfigured()) return { ok: false, error: "Authentication is not configured on this server" };
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters" };
  const db = getDb();
  const { data: r } = await db.from("password_resets").select("id,user_id,expires_at,used_at").eq("token_hash", sha(token)).maybeSingle();
  if (!r || r.used_at || new Date(r.expires_at as string).getTime() < Date.now()) return { ok: false, error: "This reset link is invalid or has expired" };
  // Single-use: claim the token atomically before changing the password.
  const claim = await db.from("password_resets").update({ used_at: new Date().toISOString() }).eq("id", r.id).is("used_at", null).select("id");
  if (!claim.data?.length) return { ok: false, error: "This reset link is invalid or has expired" };
  await db.from("auth_users").update({ password_hash: await hashPassword(newPassword) }).eq("id", r.user_id);
  return { ok: true };
}

// ── OAuth (Google / GitHub): find-or-create by VERIFIED email ────────────────
export async function signInWithOAuthProfile(p: { email: string; name?: string; provider: "google" | "github" }): Promise<AuthResult> {
  if (!authConfigured()) return fail("Authentication is not configured on this server", 501);
  const email = normEmail(p.email);
  const db = getDb();
  const { data: u } = await db.from("auth_users").select("id,email,user_metadata").ilike("email", email).maybeSingle();
  if (u) {
    await db.from("auth_users").update({ last_sign_in_at: new Date().toISOString() }).eq("id", u.id);
    const pr = await profileOf(u.id as string, p.name ?? email.split("@")[0]);
    return session({ id: u.id as string, email: u.email as string, ...pr });
  }
  return signUp({ email, password: randomBytes(24).toString("base64url"), name: p.name, provider: p.provider });
}
