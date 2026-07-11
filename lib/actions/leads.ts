"use server";
import { getServerClient } from "@/lib/supabase/server";
import { leads as seedLeads } from "@/lib/data";

export type Lead = (typeof seedLeads)[number];

export async function getLeads(): Promise<Lead[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return seedLeads;
  return data as Lead[];
}

export async function createLead(lead: Omit<Lead, "id">): Promise<Lead> {
  const db = getServerClient();
  const { data, error } = await db
    .from("leads")
    .insert(lead)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function updateLead(id: number, patch: Partial<Lead>): Promise<Lead> {
  const db = getServerClient();
  const { data, error } = await db
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function deleteLead(id: number): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
