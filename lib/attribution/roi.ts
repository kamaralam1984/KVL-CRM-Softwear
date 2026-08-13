// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
// Pure function — no DB access. Revenue proxy: leads.value where stage === "Closed",
// matched to the campaign by source/name (leads.campaign is a raw string, not a
// campaign_id FK — see lib/identity/resolve.ts, Wave 3). This is first-touch
// attribution (leads.source/campaign come from getVisitorAttribution()'s
// first-touch preference), not the multi-touch models in ./models.ts — label
// accordingly wherever this is surfaced (spec §31: never present a model as
// absolute truth). No lead↔deal/customer FK exists in this schema, so this
// stops at Lead revenue, not Deal/Customer revenue — see Wave 7's roadmap note.

import { attributeTouchpoints } from "./models";
import type { Campaign, CampaignTouchpoint, AttributionModel } from "./types";
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

/**
 * computeCampaignRoiMultiTouch — Wave 6b. Splits each Closed lead's value
 * across every campaign its visitor actually touched, weighted by the
 * selected attribution model (lib/attribution/models.ts, built Wave 2, wired
 * to a UI for the first time here). Touchpoints with campaign_id === null
 * (direct/organic hops) contribute no revenue to any campaign — there's
 * nothing to credit. `touchpointsByVisitor` should already be scoped to only
 * the visitors behind Closed leads (see lib/actions/touchpoints.ts) — this
 * function does no DB access itself.
 */
export function computeCampaignRoiMultiTouch(
  campaigns: Campaign[],
  leads: Lead[],
  touchpointsByVisitor: Map<string, CampaignTouchpoint[]>,
  model: AttributionModel
): Map<number, CampaignRoi> {
  const revenueByCampaign = new Map<number, number>();
  const closedLeadIdsByCampaign = new Map<number, Set<number>>();

  const closedLeads = leads.filter((l) => l.visitor_id && l.stage === "Closed");

  for (const lead of closedLeads) {
    const touchpoints = touchpointsByVisitor.get(lead.visitor_id as string) ?? [];
    if (!touchpoints.length) continue;

    const credits = attributeTouchpoints(touchpoints, model);
    for (const credit of credits) {
      if (credit.campaignId === null) continue;
      const revenue = (lead.value || 0) * credit.weight;
      revenueByCampaign.set(credit.campaignId, (revenueByCampaign.get(credit.campaignId) ?? 0) + revenue);
      if (!closedLeadIdsByCampaign.has(credit.campaignId)) closedLeadIdsByCampaign.set(credit.campaignId, new Set());
      closedLeadIdsByCampaign.get(credit.campaignId)!.add(lead.id);
    }
  }

  const result = new Map<number, CampaignRoi>();
  for (const campaign of campaigns) {
    const revenue = revenueByCampaign.get(campaign.id) ?? 0;
    const closedCount = closedLeadIdsByCampaign.get(campaign.id)?.size ?? 0;
    const roas = campaign.spend > 0 ? revenue / campaign.spend : null;
    result.set(campaign.id, { leadCount: closedCount, closedCount, revenue, roas });
  }
  return result;
}
