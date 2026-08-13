// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 2 (Attribution Engine + Campaigns)

import { getServerClient } from "@/lib/supabase/server";
import { resolveCampaign } from "./campaigns";

/** recordTouchpoint — one entry in the durable per-visitor attribution ledger. */
export async function recordTouchpoint(
  input: {
    visitorId: string;
    sessionId: string;
    source: string;
    medium: string;
    campaign: string;
  },
  siteId: string
): Promise<void> {
  try {
    const campaignId = await resolveCampaign(input, siteId);
    const db = getServerClient();
    await db.from("campaign_touchpoints").insert({
      site_id: siteId,
      visitor_id: input.visitorId,
      session_id: input.sessionId,
      campaign_id: campaignId,
      source: input.source,
      medium: input.medium,
      campaign: input.campaign,
    });
  } catch (err) {
    console.error("[attribution] recordTouchpoint failed", err);
  }
}
