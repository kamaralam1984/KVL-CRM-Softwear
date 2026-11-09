// Records an automated/AI outbound message in the unified inbox (conversations + messages).
// `sentBy` 'automation' | 'ai' keeps these distinct from HUMAN replies, so the 24h
// human-reply clock in the Follow-up Engine is never reset by a bot.
import { getDb, dbConfigured } from "@/lib/db";

export async function logOutboundMessage(p: {
  channel: "whatsapp" | "sms"; phone: string; name?: string; body: string; sentBy: string;
  providerId?: string; mock?: boolean; markAutoReply?: boolean;
}): Promise<void> {
  if (!dbConfigured()) return;
  try {
    const db = getDb();
    const { data: existing } = await db.from("conversations").select("id").eq("channel", p.channel).eq("contact_phone", p.phone).maybeSingle();
    let id = existing?.id as string | undefined;
    if (!id) {
      const { data: created } = await db.from("conversations").insert({ channel: p.channel, contact_phone: p.phone, contact_name: p.name || p.phone }).select("id").single();
      id = created?.id as string | undefined;
    }
    if (!id) return;
    await db.from("messages").insert({ conversation_id: id, direction: "outbound", body: p.body, provider_message_id: p.providerId ?? null, sent_by: p.sentBy, status: p.mock ? "mock" : "sent" });
    const now = new Date().toISOString();
    await db.from("conversations").update({ last_message_at: now, ...(p.markAutoReply ? { last_auto_reply_at: now } : {}) }).eq("id", id);
  } catch (err) { console.error("[messaging] logOutboundMessage failed:", err); }
}
