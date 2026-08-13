// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// Truecaller for Business "One-Tap" verify adapter. Isolates the one
// genuinely uncertain seam in this feature to two small functions: the exact
// authorize/token endpoint URLs and payload shape below are built to the
// general shape of Truecaller's documented OAuth-style verify flow, but MUST
// be re-checked against the current Truecaller for Business Partner docs
// (with a real TRUECALLER_PARTNER_KEY/SECRET) before this goes live. Nothing
// outside this file needs to know or care once that verification is done.
//
// Both functions fail soft to null/false when unconfigured — the feature
// stays fully inert (button doesn't render, callback 404s) until real
// Partner credentials exist, same convention as every other external
// integration seam in this project (see docs/ACQUISITION_ENGINE_ROADMAP.md
// §5, "External accounts checklist").

const TRUECALLER_AUTHORIZE_URL = "https://oauth-account-noneu.truecaller.com/v1/authorize";
const TRUECALLER_TOKEN_URL = "https://oauth-account-noneu.truecaller.com/v1/token";

export function isTruecallerConfigured(): boolean {
  return !!(process.env.TRUECALLER_PARTNER_KEY && process.env.TRUECALLER_PARTNER_SECRET);
}

/** Builds the redirect URL to Truecaller's authorize endpoint. `state` should
 * be the visitor_id, so the callback can resolve identity onto the same visitor. */
export function getAuthUrl(state: string, redirectUri: string): string | null {
  const partnerKey = process.env.TRUECALLER_PARTNER_KEY;
  if (!partnerKey) return null;
  const params = new URLSearchParams({
    client_id: partnerKey,
    redirect_uri: redirectUri,
    state,
    scope: "profile",
    response_type: "code",
  });
  return `${TRUECALLER_AUTHORIZE_URL}?${params.toString()}`;
}

/** Exchanges the authorization code Truecaller redirected back with for a
 * verified name + phone. Returns null on any failure or if not configured —
 * callers must treat null as "identity not verified," never as an error to
 * surface to the visitor beyond a generic "couldn't verify" message. */
export async function verifyAuthorizationCode(code: string, redirectUri: string): Promise<{ name: string; phone: string } | null> {
  const partnerKey = process.env.TRUECALLER_PARTNER_KEY;
  const partnerSecret = process.env.TRUECALLER_PARTNER_SECRET;
  if (!partnerKey || !partnerSecret || !code) return null;

  try {
    const res = await fetch(TRUECALLER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: partnerKey,
        client_secret: partnerSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();

    const first = data?.payload?.name?.first ?? "";
    const last = data?.payload?.name?.last ?? "";
    const name = [first, last].filter(Boolean).join(" ").trim();
    const rawPhone = data?.payload?.phoneNumbers?.[0];
    const phone = rawPhone ? `+${String(rawPhone).replace(/^\+/, "")}` : "";
    if (!phone) return null;

    return { name, phone };
  } catch (err) {
    console.error("[truecaller] verifyAuthorizationCode failed", err);
    return null;
  }
}
