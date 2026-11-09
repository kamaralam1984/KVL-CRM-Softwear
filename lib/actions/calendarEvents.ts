"use server";
import { getDb } from "@/lib/db";

export type CalendarEvent = {
  id: number;
  day: number;
  month: number;
  year: number;
  title: string;
  time: string;
  type: string;
  color: string;
  contact_phone?: string;
  contact_email?: string;
  meeting_url?: string;
  lead_id?: number | null;
};

export async function getEvents(): Promise<CalendarEvent[]> {
  const db = getDb();
  const { data, error } = await db
    .from("calendar_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as CalendarEvent[];
}

export async function createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  const db = getDb();
  const { data, error } = await db
    .from("calendar_events")
    .insert(event)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CalendarEvent;
}

export async function updateEvent(id: number, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const db = getDb();
  const { data, error } = await db
    .from("calendar_events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CalendarEvent;
}

export async function deleteEvent(id: number): Promise<void> {
  const db = getDb();
  const { error } = await db.from("calendar_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
