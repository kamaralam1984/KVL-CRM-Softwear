"use server";
import { getServerClient } from "@/lib/supabase/server";
import { emailCampaigns as seedCampaigns } from "@/lib/data";

export type EmailCampaign = (typeof seedCampaigns)[number];

export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return seedCampaigns;
  return data as EmailCampaign[];
}

export async function createEmailCampaign(campaign: Omit<EmailCampaign, "id">): Promise<EmailCampaign> {
  const db = getServerClient();
  const { data, error } = await db
    .from("email_campaigns")
    .insert(campaign)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EmailCampaign;
}

export async function updateEmailCampaign(id: number, patch: Partial<EmailCampaign>): Promise<EmailCampaign> {
  const db = getServerClient();
  const { data, error } = await db
    .from("email_campaigns")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EmailCampaign;
}

export async function deleteEmailCampaign(id: number): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("email_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
