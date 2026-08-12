import { describe, it, expect } from "vitest";
import { computeCampaignRoi } from "./roi";
import type { Campaign } from "./types";
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
