"use server";
// Server Actions (callable directly from client components like
// components/crm/sections/Reputation.tsx) — must be "use server" so
// process.env.GOOGLE_BUSINESS_CLIENT_ID etc. resolve on the server, not as
// undefined in the browser bundle.
//
// Phase 26 — Reputation Management. Google Business Profile OAuth Connect +
// review pull, hand-rolled REST mirroring lib/actions/integrations.ts's
// Razorpay Connect exchange-and-store pattern exactly. Real when
// GOOGLE_BUSINESS_CLIENT_ID/SECRET are set and a connection exists in
// `integration_connections`; mock/empty otherwise — never throws.
//
// NOTE (same class of caveat as lib/integrations/truecaller.ts): Google has
// significantly restricted Business Profile API access in recent years — new
// access requests are manually reviewed and not guaranteed to be granted.
// This is flagged in docs/GHL_PARITY_STATUS.md as the riskiest external
// dependency in the whole roadmap. Endpoint shapes here follow Google's
// documented My Business Business Information / Account Management APIs as
// of this writing; re-verify against current docs once real credentials exist.

import { getServerClient } from "@/lib/supabase/server";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/business.manage";

function callbackUrl(redirectOrigin: string): string {
  return `${redirectOrigin}/api/integrations/google-business/callback`;
}

export async function getGoogleBusinessConnectUrl(
  redirectOrigin: string,
): Promise<{ configured: boolean; url?: string }> {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  if (!clientId) return { configured: false };
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl(redirectOrigin),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: "kvl-crm-settings",
  });
  return { configured: true, url: `${AUTHORIZE_URL}?${params.toString()}` };
}

export async function exchangeGoogleBusinessCode(
  code: string,
  redirectOrigin: string,
): Promise<{ ok: boolean; error?: string }> {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { ok: false, error: "Google Business Profile is not configured on this server." };

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl(redirectOrigin),
        code,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[reputation] google-business token exchange failed", res.status, body);
      return { ok: false, error: `Google rejected the connection (${res.status}).` };
    }
    const data = await res.json();

    const db = getServerClient();
    const { error } = await db.from("integration_connections").upsert(
      {
        provider: "google_business",
        access_token: data.access_token ?? "",
        account_ref: data.refresh_token ?? "", // store the refresh token here; access tokens expire in ~1h
        connected_at: new Date().toISOString(),
      },
      { onConflict: "provider" },
    );
    if (error) console.error("[reputation] failed to persist google-business connection:", error.message);

    return { ok: true };
  } catch (err) {
    console.error("[reputation] google-business token exchange error", err);
    return { ok: false, error: "Network error while connecting to Google Business Profile." };
  }
}

export async function isGoogleBusinessConnected(): Promise<boolean> {
  try {
    const db = getServerClient();
    const { data } = await db.from("integration_connections").select("provider").eq("provider", "google_business").maybeSingle();
    return Boolean(data);
  } catch (err) {
    console.error("[reputation] isGoogleBusinessConnected failed:", err);
    return false;
  }
}

export interface GoogleReview {
  externalReviewId: string;
  authorName: string;
  rating: number;
  text: string;
  reviewedAt: string;
}

// Pulls recent reviews for the connected location. Returns [] (not mock data)
// when not configured — callers should treat an empty array as "nothing to
// sync yet", matching the empty-table state the Reputation section already
// shows before any reviews exist.
export async function fetchGoogleReviews(locationId: string): Promise<GoogleReview[]> {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  if (!clientId) return [];

  try {
    const db = getServerClient();
    const { data: conn } = await db.from("integration_connections").select("access_token").eq("provider", "google_business").maybeSingle();
    if (!conn?.access_token) return [];

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationId}/reviews`,
      { headers: { Authorization: `Bearer ${conn.access_token}` } },
    );
    if (!res.ok) {
      console.error(`[reputation] fetchGoogleReviews HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const reviews = (data.reviews ?? []) as Array<{
      reviewId?: string; reviewer?: { displayName?: string }; starRating?: string; comment?: string; createTime?: string;
    }>;
    const RATING_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    return reviews.map((r) => ({
      externalReviewId: r.reviewId ?? "",
      authorName: r.reviewer?.displayName ?? "Anonymous",
      rating: RATING_MAP[r.starRating ?? ""] ?? 0,
      text: r.comment ?? "",
      reviewedAt: r.createTime ?? new Date().toISOString(),
    }));
  } catch (err) {
    console.error("[reputation] fetchGoogleReviews error:", err);
    return [];
  }
}
