// Campaign analytics. When a provider key is present we could pull real stats;
// otherwise we synthesize realistic metrics deterministically from the
// campaign's id and budget so the same campaign always reports the same numbers.

import type { Campaign, CampaignMetrics, MarketingChannel } from "./types";

// Stable 32-bit hash of a string → used to seed the deterministic mock.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A small deterministic PRNG (mulberry32) so derived values look varied but
// are fully reproducible from the seed.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rough per-channel baselines (CTR band, conversion-rate band, avg CPC) so
// mock numbers differ believably across channels.
const CHANNEL_PROFILE: Record<
  MarketingChannel,
  { ctr: [number, number]; cvr: [number, number]; cpc: [number, number] }
> = {
  facebook: { ctr: [0.008, 0.02], cvr: [0.02, 0.05], cpc: [0.4, 1.2] },
  instagram: { ctr: [0.01, 0.025], cvr: [0.02, 0.045], cpc: [0.5, 1.4] },
  linkedin: { ctr: [0.004, 0.012], cvr: [0.03, 0.07], cpc: [3.0, 8.0] },
  google_ads: { ctr: [0.02, 0.06], cvr: [0.03, 0.08], cpc: [1.0, 3.5] },
  email: { ctr: [0.02, 0.05], cvr: [0.04, 0.09], cpc: [0.0, 0.02] },
  whatsapp: { ctr: [0.05, 0.15], cvr: [0.06, 0.12], cpc: [0.01, 0.05] },
};

const AVG_ORDER_VALUE = 120; // used to derive roas from conversions

function lerp(band: [number, number], t: number): number {
  return band[0] + (band[1] - band[0]) * t;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function deterministicMetrics(campaign: Campaign): CampaignMetrics {
  const seed = hash(`${campaign.id}:${campaign.channel}:${campaign.budget ?? 0}`);
  const rand = rng(seed);
  const profile = CHANNEL_PROFILE[campaign.channel];

  // Budget drives scale. Default to a modest spend when none is set.
  const budget = campaign.budget && campaign.budget > 0 ? campaign.budget : 500;
  const cpc = Math.max(0.01, round2(lerp(profile.cpc, rand())));
  const spend = round2(budget * (0.7 + rand() * 0.3)); // 70–100% of budget used

  const clicks = Math.max(1, Math.round(spend / cpc));
  const ctr = lerp(profile.ctr, rand());
  const impressions = Math.max(clicks, Math.round(clicks / ctr));
  const conversions = Math.round(clicks * lerp(profile.cvr, rand()));
  const revenue = conversions * AVG_ORDER_VALUE;
  const roas = spend > 0 ? round2(revenue / spend) : 0;

  return {
    impressions,
    clicks,
    ctr: round2(clicks / impressions),
    conversions,
    spend,
    cpc,
    roas,
  };
}

// Returns performance metrics for a campaign. Real provider integration hooks
// in here when its keys are present; today it falls back to deterministic mock.
// Never throws — any failure degrades to the mock numbers.
export async function getCampaignMetrics(
  campaign: Campaign,
): Promise<CampaignMetrics> {
  try {
    // Real-provider stat pulls would go here, keyed by channel + env creds.
    // Meta Insights / Google Ads reporting / Resend analytics, etc.
    // Until wired up, use the deterministic mock so dashboards stay stable.
    return deterministicMetrics(campaign);
  } catch (e) {
    console.error("[marketing] getCampaignMetrics error:", e);
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
}
