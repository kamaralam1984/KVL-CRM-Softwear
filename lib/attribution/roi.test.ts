import { describe, it, expect } from "vitest";
import { computeCampaignRoi, computeCampaignRoiMultiTouch } from "./roi";
import type { Campaign, CampaignTouchpoint } from "./types";
import type { Lead } from "@/lib/actions/leads";

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    campaign_key: "google:diwali_sale",
    name: "diwali_sale",
    source: "google",
    medium: "cpc",
    spend: 1000,
    budget: 2000,
    status: "active",
    notes: "",
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 1,
    name: "Test Lead",
    company: "",
    email: "test@example.com",
    phone: "",
    score: 50,
    status: "warm",
    stage: "Discovery",
    value: 0,
    owner: "Unassigned",
    avatar: "TL",
    last_contact: "Just now",
    tags: [],
    source: "google",
    campaign: "diwali_sale",
    visitor_id: "KV-V-TEST",
    ...overrides,
  };
}

describe("computeCampaignRoi", () => {
  it("sums value only for Closed leads matching source+campaign+visitor_id", () => {
    const campaign = makeCampaign();
    const leads = [
      makeLead({ id: 1, stage: "Closed", value: 50_000 }),
      makeLead({ id: 2, stage: "Closed", value: 30_000 }),
      makeLead({ id: 3, stage: "Qualified", value: 99_999 }), // not closed — excluded
      makeLead({ id: 4, stage: "Closed", value: 10_000, source: "facebook" }), // wrong source — excluded
      makeLead({ id: 5, stage: "Closed", value: 10_000, visitor_id: null }), // no visitor_id — excluded
    ];

    const roi = computeCampaignRoi(campaign, leads);
    expect(roi.leadCount).toBe(3); // 1,2,3 match source+campaign+visitor_id (regardless of stage)
    expect(roi.closedCount).toBe(2);
    expect(roi.revenue).toBe(80_000);
  });

  it("returns roas = null (not Infinity) when spend is 0", () => {
    const campaign = makeCampaign({ spend: 0 });
    const leads = [makeLead({ stage: "Closed", value: 10_000 })];
    const roi = computeCampaignRoi(campaign, leads);
    expect(roi.roas).toBeNull();
  });

  it("computes roas as revenue / spend when spend is positive", () => {
    const campaign = makeCampaign({ spend: 10_000 });
    const leads = [makeLead({ stage: "Closed", value: 40_000 })];
    const roi = computeCampaignRoi(campaign, leads);
    expect(roi.roas).toBe(4);
  });

  it("returns zeroed results when no leads match (roas is 0, not null, when spend > 0)", () => {
    const roi = computeCampaignRoi(makeCampaign({ spend: 1000 }), []);
    expect(roi).toEqual({ leadCount: 0, closedCount: 0, revenue: 0, roas: 0 });
  });
});

function makeTouchpoint(overrides: Partial<CampaignTouchpoint> = {}): CampaignTouchpoint {
  return {
    id: 1,
    visitor_id: "KV-V-TEST",
    session_id: null,
    campaign_id: 1,
    source: "google",
    medium: "cpc",
    campaign: "diwali_sale",
    occurred_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeCampaignRoiMultiTouch", () => {
  it("a single touchpoint behaves like first-touch — full credit to that campaign", () => {
    const campaignA = makeCampaign({ id: 10 });
    const lead = makeLead({ id: 1, stage: "Closed", value: 20_000, visitor_id: "KV-V-1" });
    const touchpointsByVisitor = new Map([["KV-V-1", [makeTouchpoint({ id: 1, visitor_id: "KV-V-1", campaign_id: 10 })]]]);

    const result = computeCampaignRoiMultiTouch([campaignA], [lead], touchpointsByVisitor, "first_touch");

    expect(result.get(10)).toEqual({ leadCount: 1, closedCount: 1, revenue: 20_000, roas: 20 });
  });

  it("linear model splits a lead's value evenly across every campaign it touched", () => {
    const campaignA = makeCampaign({ id: 10, spend: 1000 });
    const campaignB = makeCampaign({ id: 20, spend: 1000 });
    const lead = makeLead({ id: 1, stage: "Closed", value: 10_000, visitor_id: "KV-V-1" });
    const touchpointsByVisitor = new Map([
      [
        "KV-V-1",
        [
          makeTouchpoint({ id: 1, visitor_id: "KV-V-1", campaign_id: 10, occurred_at: "2026-01-01T00:00:00Z" }),
          makeTouchpoint({ id: 2, visitor_id: "KV-V-1", campaign_id: 20, occurred_at: "2026-01-02T00:00:00Z" }),
        ],
      ],
    ]);

    const result = computeCampaignRoiMultiTouch([campaignA, campaignB], [lead], touchpointsByVisitor, "linear");

    expect(result.get(10)?.revenue).toBe(5_000);
    expect(result.get(20)?.revenue).toBe(5_000);
  });

  it("a null-campaign touchpoint (direct/organic hop) contributes no revenue to any campaign", () => {
    const campaignA = makeCampaign({ id: 10 });
    const lead = makeLead({ id: 1, stage: "Closed", value: 10_000, visitor_id: "KV-V-1" });
    const touchpointsByVisitor = new Map([
      [
        "KV-V-1",
        [
          makeTouchpoint({ id: 1, visitor_id: "KV-V-1", campaign_id: null, occurred_at: "2026-01-01T00:00:00Z" }),
          makeTouchpoint({ id: 2, visitor_id: "KV-V-1", campaign_id: 10, occurred_at: "2026-01-02T00:00:00Z" }),
        ],
      ],
    ]);

    // linear split: 50% to the direct hop (discarded, campaign_id null) + 50% to campaign 10
    const result = computeCampaignRoiMultiTouch([campaignA], [lead], touchpointsByVisitor, "linear");

    expect(result.get(10)?.revenue).toBe(5_000); // only its own share, not the full 10,000
  });

  it("only considers Closed leads with a visitor_id", () => {
    const campaignA = makeCampaign({ id: 10 });
    const leads = [
      makeLead({ id: 1, stage: "Qualified", value: 99_999, visitor_id: "KV-V-1" }),
      makeLead({ id: 2, stage: "Closed", value: 5_000, visitor_id: null }),
    ];
    const touchpointsByVisitor = new Map([["KV-V-1", [makeTouchpoint({ campaign_id: 10 })]]]);

    const result = computeCampaignRoiMultiTouch([campaignA], leads, touchpointsByVisitor, "first_touch");

    // campaignA's default spend (1000) is > 0, so roas is 0 (not null) when revenue is 0.
    expect(result.get(10)).toEqual({ leadCount: 0, closedCount: 0, revenue: 0, roas: 0 });
  });
});
