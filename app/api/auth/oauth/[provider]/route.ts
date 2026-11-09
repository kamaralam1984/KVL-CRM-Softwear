// Starts Google / GitHub sign-in. Env: GOOGLE_CLIENT_ID/_SECRET or GITHUB_CLIENT_ID/_SECRET.
// Redirect URI to register with the provider: <app>/api/auth/oauth/<provider>/callback
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { origin } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const base = origin(req);
  const back = (msg: string) => NextResponse.redirect(`${base}/?auth_error=${encodeURIComponent(msg)}`);
  const state = randomBytes(16).toString("base64url");
  let url: string;
  if (provider === "google" && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: `${base}/api/auth/oauth/google/callback`, response_type: "code", scope: "openid email profile", state, prompt: "select_account" })}`;
  } else if (provider === "github" && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    url = `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: process.env.GITHUB_CLIENT_ID, redirect_uri: `${base}/api/auth/oauth/github/callback`, scope: "user:email", state })}`;
  } else {
    return back(`${provider === "github" ? "GitHub" : "Google"} sign-in isn't set up on this server. Use email + password.`);
  }
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, { httpOnly: true, sameSite: "lax", secure: base.startsWith("https"), maxAge: 600, path: "/api/auth/oauth" });
  return res;
}
