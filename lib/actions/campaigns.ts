"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 2 (Attribution Engine + Campaigns)
import { getServerClient } from "@/lib/supabase/server";
import type { Campaign } from "@/lib/attribution/types";

export async function getCampaigns(): Promise<Campaign[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("campaigns")
    .select("*")
    .order("last_seen_at", { ascending: false });

  if (error || !data) return [];
  return data as Campaign[];
}

export async function createCampaign(campaign: Omit<Campaign, "id" | "created_at" | "updated_at">): Promise<Campaign> {
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
