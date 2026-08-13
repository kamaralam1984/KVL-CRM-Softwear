// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 2 (Attribution Engine + Campaigns)

export interface Campaign {
  id: number;
  site_id: string;
  campaign_key: string;
  name: string;
  source: string;
  medium: string;
  spend: number;
  budget: number;
  status: "active" | "paused" | "ended";
  notes: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignTouchpoint {
  id: number;
  site_id: string;
  visitor_id: string;
  session_id: string | null;
  campaign_id: number | null;
  source: string;
  medium: string;
  campaign: string;
  occurred_at: string;
}

export interface LandingPageStat {
  id: number;
  site_id: string;
  url_path: string;
  hits: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
}

/**
 * Which model distributes credit across a visitor's touchpoints. Spec §31 —
 * always label the model used; never present one as absolute truth.
 */
export type AttributionModel = "first_touch" | "last_touch" | "linear" | "position_based" | "time_decay";

export interface AttributedCredit {
  touchpointId: number;
  campaignId: number | null;
  weight: number;
}
