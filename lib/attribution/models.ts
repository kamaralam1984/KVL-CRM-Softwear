// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 2 (Attribution Engine + Campaigns)
// Pure attribution-model functions — no DB access. Each takes a chronologically
// ordered touchpoint list for a single visitor (or lead, once Wave 3 links them)
// and returns per-touchpoint credit weights that sum to 1.0.
//
// Spec §31: support First/Last/Linear/Position-Based/Time-Decay, make the model
// selectable, and never present one as absolute truth — callers must label
// whichever model produced a given number.

import type { AttributedCredit, AttributionModel, CampaignTouchpoint } from "./types";

function sortByTime(touchpoints: CampaignTouchpoint[]): CampaignTouchpoint[] {
  return [...touchpoints].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
}

function credit(touchpoint: CampaignTouchpoint, weight: number): AttributedCredit {
  return { touchpointId: touchpoint.id, campaignId: touchpoint.campaign_id, weight };
}

export function applyFirstTouch(touchpoints: CampaignTouchpoint[]): AttributedCredit[] {
  const sorted = sortByTime(touchpoints);
  if (!sorted.length) return [];
  return [credit(sorted[0], 1)];
}

export function applyLastTouch(touchpoints: CampaignTouchpoint[]): AttributedCredit[] {
  const sorted = sortByTime(touchpoints);
  if (!sorted.length) return [];
  return [credit(sorted[sorted.length - 1], 1)];
}

export function applyLinear(touchpoints: CampaignTouchpoint[]): AttributedCredit[] {
  const sorted = sortByTime(touchpoints);
  if (!sorted.length) return [];
  const weight = 1 / sorted.length;
  return sorted.map((t) => credit(t, weight));
}

export function applyPositionBased(
  touchpoints: CampaignTouchpoint[],
  opts: { firstWeight?: number; lastWeight?: number } = {}
): AttributedCredit[] {
  const sorted = sortByTime(touchpoints);
  const n = sorted.length;
  if (n === 0) return [];
  if (n === 1) return [credit(sorted[0], 1)];

  const firstWeight = opts.firstWeight ?? 0.4;
  const lastWeight = opts.lastWeight ?? 0.4;

  if (n === 2) {
    const total = firstWeight + lastWeight;
    return [credit(sorted[0], firstWeight / total), credit(sorted[1], lastWeight / total)];
  }

  const middleWeight = Math.max(0, 1 - firstWeight - lastWeight);
  const perMiddle = middleWeight / (n - 2);
  return sorted.map((t, i) => {
    if (i === 0) return credit(t, firstWeight);
    if (i === n - 1) return credit(t, lastWeight);
    return credit(t, perMiddle);
  });
}

export function applyTimeDecay(touchpoints: CampaignTouchpoint[], opts: { halfLifeDays?: number } = {}): AttributedCredit[] {
  const sorted = sortByTime(touchpoints);
  if (!sorted.length) return [];
  const halfLifeDays = opts.halfLifeDays ?? 7;
  const lastTime = new Date(sorted[sorted.length - 1].occurred_at).getTime();

  const rawWeights = sorted.map((t) => {
    const daysBeforeLast = Math.max(0, (lastTime - new Date(t.occurred_at).getTime()) / 86_400_000);
    return 2 ** (-daysBeforeLast / halfLifeDays);
  });
  const total = rawWeights.reduce((sum, w) => sum + w, 0) || 1;
  return sorted.map((t, i) => credit(t, rawWeights[i] / total));
}

export function attributeTouchpoints(touchpoints: CampaignTouchpoint[], model: AttributionModel): AttributedCredit[] {
  switch (model) {
    case "first_touch":
      return applyFirstTouch(touchpoints);
    case "last_touch":
      return applyLastTouch(touchpoints);
    case "linear":
      return applyLinear(touchpoints);
    case "position_based":
      return applyPositionBased(touchpoints);
    case "time_decay":
      return applyTimeDecay(touchpoints);
    default:
      return applyLastTouch(touchpoints);
  }
}
