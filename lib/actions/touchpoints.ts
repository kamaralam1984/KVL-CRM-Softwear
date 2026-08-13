"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6b (Attribution + Landing Pages + Lead Journey)
import { getServerClient } from "@/lib/supabase/server";
import type { CampaignTouchpoint } from "@/lib/attribution/types";

/** Bounded batch fetch — callers scope visitorIds (e.g. only visitors behind Closed leads).
 * Wave 10 — siteId is optional: omitted means "every site" (today's exact behavior). */
export async function getTouchpointsByVisitorIds(visitorIds: string[], siteId?: string): Promise<CampaignTouchpoint[]> {
  if (!visitorIds.length) return [];
  const db = getServerClient();
  let query = db.from("campaign_touchpoints").select("*").in("visitor_id", visitorIds).order("occurred_at", { ascending: true });
  if (siteId) query = query.eq("site_id", siteId);
  const { data, error } = await query;

  if (error || !data) return [];
  return data as CampaignTouchpoint[];
}
