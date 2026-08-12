import { describe, it, expect } from "vitest";
import {
  applyFirstTouch,
  applyLastTouch,
  applyLinear,
  applyPositionBased,
  applyTimeDecay,
  attributeTouchpoints,
} from "./models";
import type { CampaignTouchpoint } from "./types";

function touchpoint(id: number, campaignId: number, daysAgo: number): CampaignTouchpoint {
  const occurred = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return { id, visitor_id: "KV-V-TEST", session_id: null, campaign_id: campaignId, source: "test", medium: "test", campaign: `c${campaignId}`, occurred_at: occurred };
}

function sumWeights(credits: { weight: number }[]): number {
  return Math.round(credits.reduce((s, c) => s + c.weight, 0) * 1000) / 1000;
}

describe("attribution models", () => {
  const three = [touchpoint(1, 10, 5), touchpoint(2, 20, 3), touchpoint(3, 30, 0)]; // oldest→newest

  it("applyFirstTouch gives 100% credit to the earliest touchpoint", () => {
    const credits = applyFirstTouch(three);
    expect(credits).toEqual([{ touchpointId: 1, campaignId: 10, weight: 1 }]);
  });

  it("applyLastTouch gives 100% credit to the most recent touchpoint", () => {
    const credits = applyLastTouch(three);
    expect(credits).toEqual([{ touchpointId: 3, campaignId: 30, weight: 1 }]);
  });

  it("applyLinear splits credit evenly and sums to 1", () => {
    const credits = applyLinear(three);
    expect(credits).toHaveLength(3);
    for (const c of credits) expect(c.weight).toBeCloseTo(1 / 3, 5);
    expect(sumWeights(credits)).toBe(1);
  });

  it("applyPositionBased uses default 40/20/40 for 3 touchpoints and sums to 1", () => {
    const credits = applyPositionBased(three);
    expect(credits[0].weight).toBeCloseTo(0.4, 5);
    expect(credits[1].weight).toBeCloseTo(0.2, 5);
    expect(credits[2].weight).toBeCloseTo(0.4, 5);
    expect(sumWeights(credits)).toBe(1);
  });

  it("applyPositionBased gives 100% to a single touchpoint", () => {
    const credits = applyPositionBased([touchpoint(1, 10, 0)]);
    expect(credits).toEqual([{ touchpointId: 1, campaignId: 10, weight: 1 }]);
  });

  it("applyPositionBased normalizes first+last weights for exactly 2 touchpoints", () => {
    const credits = applyPositionBased([touchpoint(1, 10, 1), touchpoint(2, 20, 0)]);
    expect(credits[0].weight).toBeCloseTo(0.5, 5);
    expect(credits[1].weight).toBeCloseTo(0.5, 5);
    expect(sumWeights(credits)).toBe(1);
  });

  it("applyTimeDecay weights the most recent touchpoint highest and sums to 1", () => {
    const credits = applyTimeDecay(three);
    expect(sumWeights(credits)).toBe(1);
    // credits are returned in chronological order — last entry is the most recent touch
    const last = credits[credits.length - 1];
    expect(last.touchpointId).toBe(3);
    expect(Math.max(...credits.map((c) => c.weight))).toBe(last.weight);
  });

  it("all models return an empty array for no touchpoints", () => {
    expect(applyFirstTouch([])).toEqual([]);
    expect(applyLastTouch([])).toEqual([]);
    expect(applyLinear([])).toEqual([]);
    expect(applyPositionBased([])).toEqual([]);
    expect(applyTimeDecay([])).toEqual([]);
  });

  it("attributeTouchpoints dispatches to the right model", () => {
    expect(attributeTouchpoints(three, "first_touch")).toEqual(applyFirstTouch(three));
    expect(attributeTouchpoints(three, "last_touch")).toEqual(applyLastTouch(three));
    expect(attributeTouchpoints(three, "linear").length).toBe(3);
  });
});
