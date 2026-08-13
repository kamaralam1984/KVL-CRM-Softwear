// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// GET /api/analytics/truecaller-callback — Truecaller redirects here after
// the visitor taps their own in-app consent screen. Verifies the code
// server-side (never trusts a client-supplied profile), then resolves
// identity through the exact same dedupe/create-lead/automation path as
// every other voluntary identification channel.

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthorizationCode } from "@/lib/integrations/truecaller";
import { resolveIdentity } from "@/lib/identity/resolve";
import { markVisitorIdentified } from "@/lib/tracking/store";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { isValidId } from "../shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const redirectTo = new URL("/contact", req.url);

  if (!isValidId(state) || !code) {
    redirectTo.searchParams.set("truecaller", "failed");
    return NextResponse.redirect(redirectTo);
  }

  const redirectUri = new URL("/api/analytics/truecaller-callback", req.url).toString();
  const profile = await verifyAuthorizationCode(code, redirectUri);
  if (!profile) {
    redirectTo.searchParams.set("truecaller", "failed");
    return NextResponse.redirect(redirectTo);
  }

  // Wave 10 — TruecallerButton only renders on KVL's own site today (a React
  // component, not part of the standalone embed script), so this flow is
  // hardcoded to the default site rather than threading site_id through the
  // OAuth `state` param for a feature that can't yet run anywhere else.
  await markVisitorIdentified(state, DEFAULT_SITE_ID);
  await resolveIdentity({ visitorId: state, name: profile.name, email: "", phone: profile.phone }, DEFAULT_SITE_ID);

  redirectTo.searchParams.set("truecaller", "verified");
  return NextResponse.redirect(redirectTo);
}
