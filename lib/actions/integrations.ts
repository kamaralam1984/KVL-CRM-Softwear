"use server";
// Razorpay Connect (OAuth) — lets the CRM accept/manage payments through the
// business's own Razorpay account. Uses Razorpay's real Partner OAuth API
// (https://razorpay.com/docs/partners/oauth/). Requires RAZORPAY_CLIENT_ID /
// RAZORPAY_CLIENT_SECRET env vars to actually redirect/exchange — without
// them getRazorpayConnectUrl reports `configured: false` so the UI can show
// a clear "not configured" state instead of a broken redirect.

import { getServerClient } from "@/lib/supabase/server";

const RAZORPAY_AUTHORIZE_URL = "https://auth.razorpay.com/authorize";
const RAZORPAY_TOKEN_URL = "https://auth.razorpay.com/token";

function callbackUrl(redirectOrigin: string): string {
  return `${redirectOrigin}/api/integrations/razorpay/callback`;
}

export async function getRazorpayConnectUrl(
  redirectOrigin: string,
): Promise<{ configured: boolean; url?: string }> {
  const clientId = process.env.RAZORPAY_CLIENT_ID;
  if (!clientId) return { configured: false };
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl(redirectOrigin),
    scope: "read_write",
    state: "kvl-crm-settings",
  });
  return { configured: true, url: `${RAZORPAY_AUTHORIZE_URL}?${params.toString()}` };
}

export async function exchangeRazorpayCode(
  code: string,
  redirectOrigin: string,
): Promise<{ ok: boolean; error?: string }> {
  const clientId = process.env.RAZORPAY_CLIENT_ID;
  const clientSecret = process.env.RAZORPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { ok: false, error: "Razorpay is not configured on this server." };

  try {
    const res = await fetch(RAZORPAY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl(redirectOrigin),
        code,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[integrations] razorpay token exchange failed", res.status, body);
      return { ok: false, error: `Razorpay rejected the connection (${res.status}).` };
    }
    const data = await res.json();

    const db = getServerClient();
    const { error } = await db.from("integration_connections").upsert(
      {
        provider: "razorpay",
        access_token: data.access_token ?? "",
        account_ref: data.razorpay_account_id ?? "",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "provider" },
    );
    if (error) console.error("[integrations] failed to persist razorpay connection:", error.message);

    return { ok: true };
  } catch (err) {
    console.error("[integrations] razorpay token exchange error", err);
    return { ok: false, error: "Network error while connecting to Razorpay." };
  }
}

export async function getConnectedProviders(): Promise<string[]> {
  try {
    const db = getServerClient();
    const { data, error } = await db.from("integration_connections").select("provider");
    if (error) throw error;
    return (data ?? []).map((r) => String(r.provider));
  } catch (err) {
    console.error("[integrations] getConnectedProviders failed:", err);
    return [];
  }
}

export async function disconnectProvider(provider: string): Promise<void> {
  try {
    const db = getServerClient();
    const { error } = await db.from("integration_connections").delete().eq("provider", provider);
    if (error) console.error("[integrations] disconnectProvider failed:", error.message);
  } catch (err) {
    console.error("[integrations] disconnectProvider error:", err);
  }
}
