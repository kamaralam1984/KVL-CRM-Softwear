"use server";
import { getDb } from "@/lib/db";
import { deals as seedDeals } from "@/lib/data";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";

export type Deal = (typeof seedDeals)[number];

export async function getDeals(): Promise<Deal[]> {
  const db = getDb();
  const { data, error } = await db
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return seedDeals;
  return (data ?? []) as Deal[];
}

export async function createDeal(deal: Omit<Deal, "id">): Promise<Deal> {
  const db = getDb();
  const { data, error } = await db
    .from("deals")
    .insert(deal)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Deal;
}

export async function updateDeal(id: number, patch: Partial<Deal>): Promise<Deal> {
  const db = getDb();
  const { data, error } = await db
    .from("deals")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  if (patch.stage === "Closed Won") dispatchWebhookEvent("deal.won", data as Record<string, unknown>).catch(() => {});
  return data as Deal;
}

export async function deleteDeal(id: number): Promise<void> {
  const db = getDb();
  const { error } = await db.from("deals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
