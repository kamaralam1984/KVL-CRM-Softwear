"use server";
import { getServerClient } from "@/lib/supabase/server";
import { deals as seedDeals } from "@/lib/data";

export type Deal = (typeof seedDeals)[number];

export async function getDeals(): Promise<Deal[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return seedDeals;
  return data as Deal[];
}

export async function createDeal(deal: Omit<Deal, "id">): Promise<Deal> {
  const db = getServerClient();
  const { data, error } = await db
    .from("deals")
    .insert(deal)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Deal;
}

export async function updateDeal(id: number, patch: Partial<Deal>): Promise<Deal> {
  const db = getServerClient();
  const { data, error } = await db
    .from("deals")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Deal;
}

export async function deleteDeal(id: number): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("deals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
