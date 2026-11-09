// Real-Postgres test: TEST_DATABASE_URL=postgresql://… npx vitest run lib/auth  (skipped otherwise)
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;
const sent: { to: string; subject: string; body: string }[] = [];
vi.mock("@/lib/messaging/send", () => ({ sendEmail: async (to: string, subject: string, body: string) => { sent.push({ to, subject, body }); return { ok: true, mock: true }; } }));

d("auth service on Postgres", () => {
  let svc: typeof import("./service");
  let db: import("@/lib/db/query").Db;
  const tag = `u${Date.now()}`;
  const email = (n: string) => `${tag}-${n}@example.com`;

  beforeAll(async () => {
    process.env.DATABASE_URL = url; process.env.AUTH_JWT_SECRET = "integration-test-secret-123456";
    svc = await import("./service");
    db = (await import("@/lib/db")).getDb();
  });
  afterAll(async () => {
    await db.sql("delete from auth_users where email like $1", [`${tag}-%`]);
    await (await import("@/lib/db")).closeDb();
  });

  it("signs up (profile created), rejects duplicates and bad input", async () => {
    const r = await svc.signUp({ email: email("a"), password: "pass123", name: "Asha Rao" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.user.name).toBe("Asha Rao");
    expect(["Admin", "Member"]).toContain(r.user.role);    // first-ever user bootstraps as Admin
    const prof = await db.from("profiles").select("name,role,avatar").eq("id", r.user.id).single();
    expect(prof.data).toMatchObject({ name: "Asha Rao", avatar: "AR" });
    const dup = await svc.signUp({ email: email("a").toUpperCase(), password: "pass123" });
    expect(dup).toMatchObject({ ok: false, status: 409 });
    expect(await svc.signUp({ email: "nope", password: "pass123" })).toMatchObject({ ok: false, status: 400 });
    expect(await svc.signUp({ email: email("short"), password: "123" })).toMatchObject({ ok: false, status: 400 });
  });

  it("public signup can't self-assign Super Admin; later users default to Member", async () => {
    const r = await svc.signUp({ email: email("b"), password: "pass123", role: "Super Admin" });
    expect(r.ok && r.user.role).toBe("Member");
  });

  it("signs in with right password only; token resolves to the user", async () => {
    const ok = await svc.signIn(email("a"), "pass123");
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(await svc.signIn(email("a"), "wrong")).toMatchObject({ ok: false, status: 401, error: "Invalid login credentials" });
    expect(await svc.signIn(email("ghost"), "pass123")).toMatchObject({ ok: false, status: 401, error: "Invalid login credentials" });
    expect(await svc.getUserFromToken(ok.accessToken)).toMatchObject({ id: ok.user.id });
    expect(await svc.getUserFromToken(ok.accessToken + "x")).toBeNull();
    const m = await svc.me(ok.accessToken);
    expect(m.ok && m.user.email).toBe(email("a"));
  });

  it("deleted accounts' tokens stop working", async () => {
    const r = await svc.signUp({ email: email("del"), password: "pass123" });
    if (!r.ok) throw new Error("setup");
    await db.from("auth_users").delete().eq("id", r.user.id);
    expect(await svc.getUserFromToken(r.accessToken)).toBeNull();
  });

  it("password reset: emailed single-use link changes the password", async () => {
    sent.length = 0;
    await svc.requestPasswordReset(email("a"), "https://app.test");
    expect(sent).toHaveLength(1);
    const token = sent[0].body.match(/reset-password\?token=([\w-]+)/)![1];
    expect(await svc.resetPassword("bogus-token", "newpass1")).toMatchObject({ ok: false });
    expect(await svc.resetPassword(token, "123")).toMatchObject({ ok: false });       // too short; token NOT consumed
    expect(await svc.resetPassword(token, "newpass1")).toEqual({ ok: true });
    expect(await svc.resetPassword(token, "another1")).toMatchObject({ ok: false });  // single use
    expect((await svc.signIn(email("a"), "pass123")).ok).toBe(false);
    expect((await svc.signIn(email("a"), "newpass1")).ok).toBe(true);
    sent.length = 0;
    await svc.requestPasswordReset(email("nobody"), "https://app.test");              // unknown email: silent, no email
    expect(sent).toHaveLength(0);
  });

  it("expired reset tokens are rejected", async () => {
    sent.length = 0;
    await svc.requestPasswordReset(email("a"), "https://app.test");
    const token = sent[0].body.match(/token=([\w-]+)/)![1];
    await db.sql("update password_resets set expires_at = now() - interval '1 minute' where used_at is null and user_id = (select id from auth_users where lower(email) = $1)", [email("a")]);
    expect(await svc.resetPassword(token, "whatever1")).toMatchObject({ ok: false });
  });

  it("imported bcrypt users can sign in and get upgraded to scrypt", async () => {
    const hash = await bcrypt.hash("imported-pw", 8);
    const { data } = await db.from("auth_users").insert({ email: email("legacy"), password_hash: hash }).select("id").single();
    await db.from("profiles").insert({ id: data.id, name: "Legacy", role: "Manager" });
    const r = await svc.signIn(email("legacy"), "imported-pw");
    expect(r.ok && r.user.role).toBe("Manager");
    const row = await db.from("auth_users").select("password_hash").eq("id", data.id).single();
    expect(row.data.password_hash.startsWith("scrypt:")).toBe(true);
    expect((await svc.signIn(email("legacy"), "imported-pw")).ok).toBe(true);
  });

  it("oauth: links to an existing account by email, creates new ones otherwise", async () => {
    const existing = await svc.signInWithOAuthProfile({ email: email("a").toUpperCase(), provider: "google" });
    expect(existing.ok).toBe(true);
    const fresh = await svc.signInWithOAuthProfile({ email: email("oauth"), name: "Via Google", provider: "google" });
    expect(fresh.ok && fresh.user.name).toBe("Via Google");
    const again = await svc.signInWithOAuthProfile({ email: email("oauth"), provider: "google" });
    expect(again.ok && fresh.ok && again.user.id).toBe(fresh.ok && fresh.user.id);
  });

  it("requireAuth resolves role from profiles via the new token", async () => {
    const { requireAuth } = await import("@/lib/security/session");
    const r = await svc.signIn(email("legacy"), "imported-pw");
    if (!r.ok) throw new Error("setup");
    expect(await requireAuth(r.accessToken)).toMatchObject({ userId: r.user.id, role: "Manager", demo: false });
    expect(await requireAuth("garbage")).toBeNull();
  });
});
