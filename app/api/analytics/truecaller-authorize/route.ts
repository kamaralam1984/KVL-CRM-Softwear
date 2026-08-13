// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// GET /api/analytics/truecaller-authorize — starts the Truecaller One-Tap
// redirect flow. `state` carries the visitor_id through so the callback can
// resolve identity onto the same visitor that clicked the button.

import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/integrations/truecaller";
import { isValidId } from "../shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") || "";
  const fallback = new URL("/contact", req.url);
  if (!isValidId(state)) {
    return NextResponse.redirect(fallback);
  }

  const redirectUri = new URL("/api/analytics/truecaller-callback", req.url).toString();
  const authUrl = getAuthUrl(state, redirectUri);
  if (!authUrl) {
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(authUrl);
}
