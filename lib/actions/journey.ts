"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6b (Attribution + Landing Pages + Lead Journey)
// On-demand, single-visitor fetch — called only when that visitor's Journey
// modal is opened, never prefetched for the whole list.
import { getServerClient } from "@/lib/supabase/server";
import type { CampaignTouchpoint } from "@/lib/attribution/types";
import type { VisitorEvent } from "@/lib/tracking/types";

export interface VisitorJourneyLink {
  leadId: number;
  matchedOn: string;
  matchedAt: string;
}

export interface VisitorJourney {
  touchpoints: CampaignTouchpoint[];
  events: VisitorEvent[];
  link: VisitorJourneyLink | null;
}

export async function getVisitorJourney(visitorId: string): Promise<VisitorJourney> {
  const db = getServerClient();

  const [touchpointsRes, eventsRes, linkRes] = await Promise.all([
    db.from("campaign_touchpoints").select("*").eq("visitor_id", visitorId).order("occurred_at", { ascending: true }),
    db.from("visitor_events").select("*").eq("visitor_id", visitorId).order("created_at", { ascending: true }),
    db.from("visitor_identity_links").select("lead_id, matched_on, matched_at").eq("visitor_id", visitorId).maybeSingle(),
  ]);

  const link = linkRes.data
    ? { leadId: linkRes.data.lead_id as number, matchedOn: linkRes.data.matched_on as string, matchedAt: linkRes.data.matched_at as string }
    : null;

  return {
    touchpoints: (touchpointsRes.data as CampaignTouchpoint[]) ?? [],
    events: (eventsRes.data as VisitorEvent[]) ?? [],
    link,
  };
}
