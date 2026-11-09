"use server";
import { getDb } from "@/lib/db";
import { whatsappConversations as seedConversations } from "@/lib/data";

export type WhatsappConversation = (typeof seedConversations)[number];

export async function getWhatsappConversations(): Promise<WhatsappConversation[]> {
  const db = getDb();
  const { data, error } = await db
    .from("whatsapp_conversations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return seedConversations;
  return (data ?? []) as WhatsappConversation[];
}

export async function createWhatsappConversation(
  conversation: Omit<WhatsappConversation, "id">,
): Promise<WhatsappConversation> {
  const db = getDb();
  const { data, error } = await db
    .from("whatsapp_conversations")
    .insert(conversation)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WhatsappConversation;
}

export async function updateWhatsappConversation(
  id: number,
  patch: Partial<WhatsappConversation>,
): Promise<WhatsappConversation> {
  const db = getDb();
  const { data, error } = await db
    .from("whatsapp_conversations")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WhatsappConversation;
}

export async function deleteWhatsappConversation(id: number): Promise<void> {
  const db = getDb();
  const { error } = await db.from("whatsapp_conversations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
