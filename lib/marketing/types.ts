// Types for the Marketing Automation engine (Phase 8).
// A campaign targets one channel, carries copy/budget/audience, and after it is
// launched we attach performance metrics (real from the ad platform, or mock).

export type MarketingChannel =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "google_ads"
  | "email"
  | "whatsapp";

export type CampaignStatus = "draft" | "scheduled" | "active" | "completed";

export type Campaign = {
  id: string;
  name: string;
  channel: MarketingChannel;
  status: CampaignStatus;
  audience?: string; // free-text targeting description / segment
  budget?: number; // total spend cap, in currency units
  message?: string; // ad copy / creative body
  scheduledAt?: string; // ISO timestamp for a scheduled launch
  createdAt: string; // ISO timestamp
};

export type CampaignMetrics = {
  impressions: number;
  clicks: number;
  ctr: number; // click-through rate, clicks / impressions
  conversions: number;
  spend: number;
  cpc: number; // cost per click, spend / clicks
  roas: number; // return on ad spend
};

export type CampaignResult = {
  campaign: Campaign;
  metrics: CampaignMetrics;
  usedRealProvider: boolean;
};

// Input accepted by launchCampaign — id/status/createdAt are optional and get
// filled in with sensible defaults when omitted.
export type LaunchCampaignInput = {
  id?: string;
  name: string;
  channel: MarketingChannel;
  status?: CampaignStatus;
  audience?: string;
  budget?: number;
  message?: string;
  scheduledAt?: string;
  createdAt?: string;
};

// What each channel publisher returns.
export type PublishResult = {
  externalId?: string; // provider-side campaign/message id
  usedRealProvider: boolean;
};
