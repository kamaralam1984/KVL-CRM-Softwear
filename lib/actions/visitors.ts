"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
import { getServerClient } from "@/lib/supabase/server";
import type { Visitor } from "@/lib/tracking/types";

export async function getVisitors(): Promise<Visitor[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("visitors")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];
  return data as Visitor[];
}
