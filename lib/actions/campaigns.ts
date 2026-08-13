"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 2 (Attribution Engine + Campaigns)
import { getServerClient } from "@/lib/supabase/server";
import type { Campaign } from "@/lib/attribution/types";

// Wave 10 — siteId is optional: omitted means "every site" (today's exact behavior).
export async function getCampaigns(siteId?: string): Promise<Campaign[]> {
  const db = getServerClient();
  let query = db.from("campaigns").select("*").order("last_seen_at", { ascending: false });
  if (siteId) query = query.eq("site_id", siteId);
  const { data, error } = await query;

  if (error || !data) return [];
  return data as Campaign[];
}

// Wave 10 — site_id omitted from the required input (defaults to
// 'kvl-default' at the DB level) so the existing "Add Campaign" UI needs no
// changes; pass it explicitly only when creating a campaign for another site.
export async function createCampaign(
  campaign: Omit<Campaign, "id" | "created_at" | "updated_at" | "site_id"> & { site_id?: string }
): Promise<Campaign> {
  const db = getServerClient();
  const { data, error } = await db.from("campaigns").insert(campaign).select().single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}

export async function updateCampaign(id: number, patch: Partial<Campaign>): Promise<Campaign> {
  const db = getServerClient();
  const { data, error } = await db.from("campaigns").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}
