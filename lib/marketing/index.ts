// Marketing Automation engine entry point.
//   launchCampaign  — validate an input, publish it on its channel, attach metrics
//   analyzeCampaigns — roll a set of campaigns up into portfolio-level numbers
// Neither function throws; failures degrade to mock/empty results.

import { CHANNEL_PUBLISHERS } from "./channels";
import { getCampaignMetrics } from "./analytics";
import type {
  Campaign,
  CampaignMetrics,
  CampaignResult,
  LaunchCampaignInput,
  MarketingChannel,
} from "./types";

const VALID_CHANNELS: MarketingChannel[] = [
  "facebook",
  "instagram",
  "linkedin",
  "google_ads",
  "email",
  "whatsapp",
];

function makeId(): string {
  // Random, collision-unlikely id built inside the function (no top-level Date).
  return `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyMetrics(): CampaignMetrics {
  return {
    impressions: 0,
    clicks: 0,
    ctr: 0,
    conversions: 0,
    spend: 0,
    cpc: 0,
    roas: 0,
  };
}

// Normalize + validate raw input into a full Campaign. Returns null when the
// input is unusable (missing name or an unknown channel).
function toCampaign(input: LaunchCampaignInput): Campaign | null {
  if (!input || typeof input !== "object") return null;
  if (!input.name || typeof input.name !== "string") return null;
  if (!VALID_CHANNELS.includes(input.channel)) return null;

  const now = new Date().toISOString();
  return {
    id: input.id ?? makeId(),
    name: input.name,
    channel: input.channel,
    status: input.status ?? (input.scheduledAt ? "scheduled" : "active"),
    audience: input.audience,
    budget: typeof input.budget === "number" ? input.budget : undefined,
    message: input.message,
    scheduledAt: input.scheduledAt,
    createdAt: input.createdAt ?? now,
  };
}

export async function launchCampaign(
  input: LaunchCampaignInput,
): Promise<CampaignResult> {
  const campaign = toCampaign(input);

  if (!campaign) {
    // Invalid input — return a completed-but-empty result rather than throwing.
    console.error("[marketing] launchCampaign: invalid input", input);
    const now = new Date().toISOString();
    return {
      campaign: {
        id: makeId(),
        name: typeof input?.name === "string" ? input.name : "invalid",
        channel: VALID_CHANNELS.includes(input?.channel)
          ? input.channel
          : "email",
        status: "draft",
        createdAt: now,
      },
      metrics: emptyMetrics(),
      usedRealProvider: false,
    };
  }

  let usedRealProvider = false;
  try {
    const publisher = CHANNEL_PUBLISHERS[campaign.channel];
    const published = await publisher(campaign);
    usedRealProvider = published.usedRealProvider;
    // Stash the provider id on the campaign id trail via message-free means;
    // externalId is informative only, so we surface it through the id field
    // only when we generated the campaign id ourselves and none was supplied.
    if (published.externalId && !input.id) {
      campaign.id = published.externalId;
    }
  } catch (e) {
    console.error("[marketing] launchCampaign publish error:", e);
  }

  let metrics: CampaignMetrics;
  try {
    metrics = await getCampaignMetrics(campaign);
  } catch (e) {
    console.error("[marketing] launchCampaign metrics error:", e);
    metrics = emptyMetrics();
  }

  return { campaign, metrics, usedRealProvider };
}

export type CampaignAnalysis = {
  totalSpend: number;
  totalConversions: number;
  avgRoas: number;
  byChannel: Record<
    string,
    { spend: number; conversions: number; roas: number; count: number }
  >;
};

// Roll a set of already-launched campaigns (with metrics) into portfolio totals.
// Accepts CampaignResult[] so callers can pass launchCampaign output directly.
export function analyzeCampaigns(
  campaigns: CampaignResult[],
): CampaignAnalysis {
  const byChannel: CampaignAnalysis["byChannel"] = {};
  let totalSpend = 0;
  let totalConversions = 0;
  let roasSum = 0;
  let counted = 0;

  try {
    for (const item of campaigns ?? []) {
      const m = item?.metrics;
      const channel = item?.campaign?.channel ?? "unknown";
      if (!m) continue;

      totalSpend += m.spend;
      totalConversions += m.conversions;
      roasSum += m.roas;
      counted += 1;

      const bucket =
        byChannel[channel] ??
        (byChannel[channel] = { spend: 0, conversions: 0, roas: 0, count: 0 });
      bucket.spend += m.spend;
      bucket.conversions += m.conversions;
      bucket.roas += m.roas;
      bucket.count += 1;
    }

    // Convert per-channel roas sums into averages.
    for (const bucket of Object.values(byChannel)) {
      bucket.spend = Math.round(bucket.spend * 100) / 100;
      bucket.roas =
        bucket.count > 0
          ? Math.round((bucket.roas / bucket.count) * 100) / 100
          : 0;
    }
  } catch (e) {
    console.error("[marketing] analyzeCampaigns error:", e);
  }

  return {
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalConversions,
    avgRoas: counted > 0 ? Math.round((roasSum / counted) * 100) / 100 : 0,
    byChannel,
  };
}

export { CHANNEL_PUBLISHERS } from "./channels";
export { getCampaignMetrics } from "./analytics";
export type {
  Campaign,
  CampaignMetrics,
  CampaignResult,
  LaunchCampaignInput,
  MarketingChannel,
} from "./types";
