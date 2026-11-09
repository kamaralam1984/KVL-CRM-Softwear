// OAuth callback: verifies state, exchanges the code, links/creates the user by VERIFIED email,
// then redirects to /#oauth_token=<session token> (the login screen picks it up and clears the hash).
import { NextRequest, NextResponse } from "next/server";
import { signInWithOAuthProfile } from "@/lib/auth/service";
import { origin } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

async function googleProfile(code: string, redirect: string) {
  const tok = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirect, grant_type: "authorization_code" }) }).then((r) => r.json()) as { access_token?: string };
  if (!tok.access_token) return null;
  const u = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json()) as { email?: string; email_verified?: boolean; name?: string };
  return u.email && u.email_verified ? { email: u.email, name: u.name } : null;
}

async function githubProfile(code: string, redirect: string) {
  const tok = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ code, client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, redirect_uri: redirect }) }).then((r) => r.json()) as { access_token?: string };
  if (!tok.access_token) return null;
  const h = { Authorization: `Bearer ${tok.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "kvl-crm" };
  const [user, emails] = await Promise.all([fetch("https://api.github.com/user", { headers: h }).then((r) => r.json()), fetch("https://api.github.com/user/emails", { headers: h }).then((r) => r.json())]) as [{ name?: string; login?: string }, { email: string; primary: boolean; verified: boolean }[]];
  const primary = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : undefined;
  return primary ? { email: primary.email, name: user.name || user.login } : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const base = origin(req);
  const fail = (msg: string) => { const r = NextResponse.redirect(`${base}/?auth_error=${encodeURIComponent(msg)}`); r.cookies.delete({ name: "oauth_state", path: "/api/auth/oauth" }); return r; };
  try {
    const p = req.nextUrl.searchParams;
    const code = p.get("code"), state = p.get("state");
    if (!code || !state || state !== req.cookies.get("oauth_state")?.value) return fail("Sign-in was cancelled or expired. Please try again.");
    const redirect = `${base}/api/auth/oauth/${provider}/callback`;
    const profile = provider === "google" ? await googleProfile(code, redirect) : provider === "github" ? await githubProfile(code, redirect) : null;
    if (!profile) return fail("Could not verify your email with the provider.");
    const r = await signInWithOAuthProfile({ ...profile, provider: provider as "google" | "github" });
    if (!r.ok) return fail(r.error);
    const res = NextResponse.redirect(`${base}/#oauth_token=${r.accessToken}`);
    res.cookies.delete({ name: "oauth_state", path: "/api/auth/oauth" });
    return res;
  } catch (err) {
    console.error("[auth] oauth callback failed:", err);
    return fail("Sign-in failed. Please try again.");
  }
}
