// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 2 (Attribution Engine + Campaigns)
// Auto-creates a campaign the first time a named utm_campaign is seen. Fails
// soft — a campaign-resolution failure must never break session tracking.

import { getServerClient } from "@/lib/supabase/server";

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function campaignKey(source: string, campaign: string): string {
  return `${slugify(source) || "unknown"}:${slugify(campaign)}`;
}

/**
 * resolveCampaign — find-or-create a `campaigns` row for a named campaign.
 * Returns null when `campaign` is empty (direct/organic traffic never spawns
 * a campaign entity — source-level reporting instead reads source/medium
 * directly off campaign_touchpoints).
 */
export async function resolveCampaign(
  input: { source: string; medium: string; campaign: string },
  siteId: string
): Promise<number | null> {
  const campaign = input.campaign.trim();
  if (!campaign) return null;

  try {
    const db = getServerClient();
    const key = campaignKey(input.source, campaign);
    const now = new Date().toISOString();

    // Atomic upsert — avoids the select-then-insert race where two concurrent
    // first-sightings of the same new campaign both see "not found" and one
    // insert loses to a unique-constraint error (Wave 8 gap-check hardening).
    // campaign_key alone is no longer globally unique (Wave 10) — the DB
    // constraint and this upsert's conflict target are both (site_id, campaign_key).
    const { data, error } = await db
      .from("campaigns")
      .upsert(
        { site_id: siteId, campaign_key: key, name: campaign, source: input.source, medium: input.medium, last_seen_at: now },
        { onConflict: "site_id,campaign_key" }
      )
      .select("id")
      .single();
    if (error || !data) return null;
    return data.id as number;
  } catch (err) {
    console.error("[attribution] resolveCampaign failed", err);
    return null;
  }
}
