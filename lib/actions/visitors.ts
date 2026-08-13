"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
import { getServerClient } from "@/lib/supabase/server";
import type { Visitor } from "@/lib/tracking/types";

// Wave 10 — siteId is optional: omitted means "every site" (today's exact
// behavior), matching how the dashboard defaults to an "All Sites" view.
export async function getVisitors(siteId?: string): Promise<Visitor[]> {
  const db = getServerClient();
  let query = db.from("visitors").select("*").order("last_seen_at", { ascending: false }).limit(200);
  if (siteId) query = query.eq("site_id", siteId);
  const { data, error } = await query;

  if (error || !data) return [];
  return data as Visitor[];
}
