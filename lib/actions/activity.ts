"use server";
import { getServerClient } from "@/lib/supabase/server";
import { activityFeed as seedActivity } from "@/lib/data";

export type Activity = (typeof seedActivity)[number];

export async function getActivityFeed(): Promise<Activity[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("activity_feed")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return seedActivity;
  return data as Activity[];
}

export async function createActivity(activity: Omit<Activity, "id">): Promise<Activity> {
  const db = getServerClient();
  const { data, error } = await db
    .from("activity_feed")
    .insert(activity)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Activity;
}

export async function deleteActivity(id: number): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("activity_feed").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
