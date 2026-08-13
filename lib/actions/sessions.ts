"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6b (Attribution + Landing Pages + Lead Journey)
import { getServerClient } from "@/lib/supabase/server";
import type { VisitorSession } from "@/lib/tracking/types";

// Wave 10 — siteId is optional: omitted means "every site" (today's exact behavior).
export async function getVisitorSessions(siteId?: string): Promise<VisitorSession[]> {
  const db = getServerClient();
  let query = db.from("visitor_sessions").select("*").order("started_at", { ascending: false }).limit(500);
  if (siteId) query = query.eq("site_id", siteId);
  const { data, error } = await query;

  if (error || !data) return [];
  return data as VisitorSession[];
}
