// First-response automation for inbound WhatsApp/SMS:
//   1. Assign the conversation to a team member (lead owner, else least-loaded teammate).
//   2. AI auto-answer from the editable knowledge base (if enabled) — never invents facts.
//   3. Otherwise an off-hours auto-reply (if business hours are enabled and we're closed).
// A 6-hour cooldown per conversation prevents bot loops. These replies are tagged sent_by
// 'ai'/'auto' so they never count as a HUMAN reply (the 24h SLA keeps running).
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { sendWhatsApp, sendSms } from "@/lib/messaging/send";
import { logOutboundMessage } from "@/lib/messaging/outbound";
import { getCommsSettings } from "./settings";
import { isWithinBusinessHours, nextOpeningLabel } from "./hours";

const COOLDOWN_MS = 6 * 3_600_000;
const MODEL = "claude-sonnet-4-6";
const brand = () => process.env.NEXT_PUBLIC_BRAND_NAME ?? process.env.BRAND_NAME ?? "KVL Business Solutions";

export async function assignConversation(conversationId: string, leadOwner?: string | null): Promise<string> {
  try {
    const db = getDb();
    const { data: conv } = await db.from("conversations").select("assigned_to").eq("id", conversationId).maybeSingle();
    if (conv?.assigned_to) return conv.assigned_to as string;
    let owner = (leadOwner ?? "").trim();
    if (!owner) {
      const { data: team } = await db.from("team_members").select("name");
      const names = (team ?? []).map((t) => t.name as string).filter(Boolean);
      if (names.length) {
        const { data: open } = await db.from("conversations").select("assigned_to").neq("assigned_to", "").eq("status", "open");
        const load = new Map(names.map((n) => [n, 0]));
        for (const o of open ?? []) if (load.has(o.assigned_to as string)) load.set(o.assigned_to as string, (load.get(o.assigned_to as string) ?? 0) + 1);
        owner = [...load.entries()].sort((a, b) => a[1] - b[1])[0][0];
      }
    }
    if (owner) await db.from("conversations").update({ assigned_to: owner }).eq("id", conversationId);
    return owner;
  } catch (err) { console.error("[comms] assignConversation failed:", err); return ""; }
}

export async function aiAnswer(question: string, kb: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY || !kb.trim()) return null;
  try {
    const msg = await new Anthropic().messages.create({
      model: MODEL, max_tokens: 350,
      system: `You are the WhatsApp assistant for ${brand()}. Answer the customer's question using ONLY the facts in the KNOWLEDGE BASE below. Be short (max 60 words), warm, same language as the customer (English/Hindi/Hinglish). NEVER invent prices, offers, dates or promises. If the answer is not clearly in the knowledge base, or the customer wants to pay/negotiate/complain, reply with {"answer": null}. Reply ONLY JSON: {"answer": "..."} .\n\nKNOWLEDGE BASE:\n${kb.slice(0, 6000)}`,
      messages: [{ role: "user", content: question.slice(0, 600) }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { answer?: string | null };
    return parsed.answer && parsed.answer.length > 3 ? parsed.answer : null;
  } catch (err) { console.error("[comms] aiAnswer failed:", err); return null; }
}

export async function maybeAutoRespond(p: { conversationId: string; phone: string; text: string; channel: "whatsapp" | "sms"; name?: string }): Promise<"ai" | "auto" | null> {
  try {
    const db = getDb();
    const { data: conv } = await db.from("conversations").select("last_auto_reply_at").eq("id", p.conversationId).maybeSingle();
    if (conv?.last_auto_reply_at && Date.now() - new Date(conv.last_auto_reply_at as string).getTime() < COOLDOWN_MS) return null;

    const s = await getCommsSettings();
    let reply: string | null = null, by: "ai" | "auto" = "auto";
    if (s.ai_answer.enabled) { reply = await aiAnswer(p.text, s.knowledge_base.text); if (reply) by = "ai"; }
    if (!reply && s.auto_reply.enabled && !isWithinBusinessHours(new Date(), s.business_hours)) {
      reply = s.auto_reply.offHoursText.replace(/\{\{opens\}\}/g, nextOpeningLabel(new Date(), s.business_hours));
    }
    if (!reply) return null;

    const r = p.channel === "whatsapp" ? await sendWhatsApp(p.phone, reply) : await sendSms(p.phone, reply);
    if (!r.ok) return null;
    await logOutboundMessage({ channel: p.channel, phone: p.phone, name: p.name, body: reply, sentBy: by, providerId: r.providerMessageId, mock: r.mock, markAutoReply: true });
    return by;
  } catch (err) { console.error("[comms] maybeAutoRespond failed:", err); return null; }
}

