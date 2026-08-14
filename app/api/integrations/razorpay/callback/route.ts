import { NextRequest, NextResponse } from "next/server";
import { exchangeRazorpayCode } from "@/lib/actions/integrations";

// Razorpay Connect OAuth redirect target. Exchanges the auth code for an
// access token, persists the connection, then bounces back into the CRM
// (Settings > Integrations) with a query flag the UI reads to show status.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/?razorpay=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?razorpay=missing_code`);
  }

  const result = await exchangeRazorpayCode(code, origin);
  return NextResponse.redirect(`${origin}/?razorpay=${result.ok ? "connected" : encodeURIComponent(result.error ?? "error")}`);
}
