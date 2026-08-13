"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6b (Attribution + Landing Pages + Lead Journey)
import { getServerClient } from "@/lib/supabase/server";
import type { CampaignTouchpoint } from "@/lib/attribution/types";

/** Bounded batch fetch — callers scope visitorIds (e.g. only visitors behind Closed leads). */
export async function getTouchpointsByVisitorIds(visitorIds: string[]): Promise<CampaignTouchpoint[]> {
  if (!visitorIds.length) return [];
  const db = getServerClient();
  const { data, error } = await db
    .from("campaign_touchpoints")
    .select("*")
    .in("visitor_id", visitorIds)
    .order("occurred_at", { ascending: true });

  if (error || !data) return [];
  return data as CampaignTouchpoint[];
}
