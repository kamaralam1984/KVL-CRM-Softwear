// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
// Pure function — no DB access. Revenue proxy: leads.value where stage === "Closed",
// matched to the campaign by source/name (leads.campaign is a raw string, not a
// campaign_id FK — see lib/identity/resolve.ts, Wave 3). This is first-touch
// attribution (leads.source/campaign come from getVisitorAttribution()'s
// first-touch preference), not the multi-touch models in ./models.ts — label
// accordingly wherever this is surfaced (spec §31: never present a model as
// absolute truth). No lead↔deal/customer FK exists in this schema, so this
// stops at Lead revenue, not Deal/Customer revenue — see Wave 7's roadmap note.

import type { Campaign } from "./types";
import type { Lead } from "@/lib/actions/leads";

export interface CampaignRoi {
  leadCount: number;
  closedCount: number;
  revenue: number;
  roas: number | null;
}

export function computeCampaignRoi(campaign: Campaign, leads: Lead[]): CampaignRoi {
  const matched = leads.filter(
    (l) => l.visitor_id && l.source === campaign.source && l.campaign === campaign.name
  );
  const closed = matched.filter((l) => l.stage === "Closed");
  const revenue = closed.reduce((sum, l) => sum + (l.value || 0), 0);
  const roas = campaign.spend > 0 ? revenue / campaign.spend : null;

  return { leadCount: matched.length, closedCount: closed.length, revenue, roas };
}
