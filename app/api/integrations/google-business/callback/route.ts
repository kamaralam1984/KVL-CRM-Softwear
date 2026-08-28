import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleBusinessCode } from "@/lib/reputation/googleBusiness";

// Phase 26 — Google Business Profile OAuth redirect target. Mirrors
// app/api/integrations/razorpay/callback/route.ts exactly: exchanges the
// auth code, persists the connection, bounces back to Settings with a query
// flag the UI reads to show status.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/?google_business=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?google_business=missing_code`);
  }

  const result = await exchangeGoogleBusinessCode(code, origin);
  return NextResponse.redirect(`${origin}/?google_business=${result.ok ? "connected" : encodeURIComponent(result.error ?? "error")}`);
}
