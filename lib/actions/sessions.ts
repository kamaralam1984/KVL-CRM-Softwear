"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 6b (Attribution + Landing Pages + Lead Journey)
import { getServerClient } from "@/lib/supabase/server";
import type { VisitorSession } from "@/lib/tracking/types";

export async function getVisitorSessions(): Promise<VisitorSession[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("visitor_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];
  return data as VisitorSession[];
}
