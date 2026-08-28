"use server";
import { getServerClient } from "@/lib/supabase/server";
import { leads as seedLeads } from "@/lib/data";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";

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

// Wave 10 — `site_id` isn't part of the base `Lead` type (derived from
// lib/data.ts's seed shape, which predates multi-tenancy); accepted here as
// an extra optional field so resolveIdentity() can tag tracking-originated
// leads without widening every other Lead consumer. Omitted = DB default
// ('kvl-default'), so manually-created leads from the core CRM UI need no changes.
export async function createLead(lead: Omit<Lead, "id"> & { site_id?: string }): Promise<Lead> {
  const db = getServerClient();
  const { data, error } = await db
    .from("leads")
    .insert(lead)
    .select()
    .single();
  if (error) throw new Error(error.message);
  dispatchWebhookEvent("lead.created", data as Record<string, unknown>).catch(() => {});
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
