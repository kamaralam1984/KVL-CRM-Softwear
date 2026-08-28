"use server";
// Phase 21 — Unified Conversations. CRUD for the new channel-agnostic
// conversations/messages tables, following lib/actions/whatsapp.ts's exact
// shape. Falls back to the legacy whatsapp_conversations table (via
// getWhatsappConversations) when the new tables are empty, so the UI never
// looks broken in demo mode or right after this migration runs.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { getWhatsappConversations, createWhatsappConversation, updateWhatsappConversation, type WhatsappConversation } from "./whatsapp";
import { sendWhatsApp, sendSms, sendInstagramDm, sendMessengerMessage, type SendResult } from "@/lib/messaging/send";

export type Channel = "whatsapp" | "sms" | "instagram" | "messenger" | "webchat";

export type Conversation = {
  id: string;
  channel: Channel;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  lead_id: number | null;
  customer_id: number | null;
  last_message_at: string;
  unread_count: number;
  status: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: string;
  created_at: string;
};

// Legacy whatsapp_conversations rows mapped into the new shape — used only
// as a fallback so the Chats tab isn't empty before this phase's tables have
// any real rows in them.
async function legacyAsConversations(): Promise<Conversation[]> {
  const rows = await getWhatsappConversations();
  return rows.map((r) => ({
    id: `legacy-${r.id}`,
    channel: "whatsapp" as const,
    contact_name: r.contact,
    contact_phone: "",
    contact_email: "",
    lead_id: null,
    customer_id: null,
    last_message_at: new Date().toISOString(),
    unread_count: r.unread ?? 0,
    status: r.status ?? "active",
  }));
}

export async function getConversations(channel?: Channel, accessToken?: string): Promise<Conversation[]> {
  if (!(await assertCan(accessToken, "whatsapp", "read"))) return [];
  try {
    const db = getServerClient();
    let q = db.from("conversations").select("*").order("last_message_at", { ascending: false });
    if (channel) q = q.eq("channel", channel);
    const { data, error } = await q;
    if (error || !data?.length) return legacyAsConversations();
    return data as Conversation[];
  } catch (err) {
    console.error("[conversations] getConversations failed:", err);
    return legacyAsConversations();
  }
}

export async function getMessages(conversationId: string, accessToken?: string): Promise<Message[]> {
  if (!(await assertCan(accessToken, "whatsapp", "read"))) return [];
  if (conversationId.startsWith("legacy-")) return []; // legacy rows have no message thread
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as Message[];
  } catch (err) {
    console.error("[conversations] getMessages failed:", err);
    return [];
  }
}

// Ensures a conversation row exists for (channel, phone) and returns its id —
// used by both outbound sendMessage() and the inbound webhooks.
export async function ensureConversation(
  channel: Channel,
  contactPhone: string,
  contactName: string,
): Promise<string | null> {
  try {
    const db = getServerClient();
    const { data: existing } = await db
      .from("conversations")
      .select("id")
      .eq("channel", channel)
      .eq("contact_phone", contactPhone)
      .maybeSingle();
    if (existing) return existing.id as string;

    const { data: created, error } = await db
      .from("conversations")
      .insert({ channel, contact_phone: contactPhone, contact_name: contactName || contactPhone })
      .select("id")
      .single();
    if (error) { console.error("[conversations] ensureConversation insert failed:", error.message); return null; }
    return created.id as string;
  } catch (err) {
    console.error("[conversations] ensureConversation error:", err);
    return null;
  }
}

async function recordMessage(conversationId: string, direction: "inbound" | "outbound", body: string, providerMessageId?: string): Promise<void> {
  try {
    const db = getServerClient();
    await db.from("messages").insert({ conversation_id: conversationId, direction, body, provider_message_id: providerMessageId ?? null });
    await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
  } catch (err) {
    console.error("[conversations] recordMessage failed:", err);
  }
}

// Called by the inbound webhooks (app/api/{whatsapp,sms}/inbound). Creates/
// finds the conversation, records the message, and bumps unread_count.
// unread_count is a non-atomic read-then-write, same documented residual
// risk as the acquisition-engine's other counters (docs/ACQUISITION_ENGINE_ROADMAP.md
// §4c) — under true concurrency it can rarely under-count by one; a real fix
// needs a Postgres RPC for atomic increments, out of scope for this phase.
export async function recordInboundMessage(
  channel: Channel,
  fromPhone: string,
  body: string,
  providerMessageId?: string,
): Promise<{ conversationId: string | null; leadId: number | null }> {
  const conversationId = await ensureConversation(channel, fromPhone, fromPhone);
  if (!conversationId) return { conversationId: null, leadId: null };

  try {
    const db = getServerClient();
    await db.from("messages").insert({ conversation_id: conversationId, direction: "inbound", body, provider_message_id: providerMessageId ?? null });
    const { data: convRow } = await db.from("conversations").select("unread_count").eq("id", conversationId).maybeSingle();
    await db.from("conversations").update({
      last_message_at: new Date().toISOString(),
      unread_count: (convRow?.unread_count ?? 0) + 1,
    }).eq("id", conversationId);
  } catch (err) {
    console.error("[conversations] recordInboundMessage failed:", err);
  }

  // Dual-write (same pattern as Phase 19's automation store): the existing
  // WhatsApp CRM section's Chats tab still reads whatsapp_conversations, so a
  // real inbound message needs to land there too to actually show up in the
  // UI today — not just in the new canonical tables above. WhatsApp-only for
  // now (that's the section that exists); other channels get their own UI
  // in later phases (23's live-chat widget, etc.) instead of forcing them
  // into a table shaped for WhatsApp specifically.
  if (channel === "whatsapp") {
    try {
      const legacyRows = await getWhatsappConversations();
      const existing = legacyRows.find((r) => r.contact_phone === fromPhone);
      if (existing) {
        await updateWhatsappConversation(existing.id, { message: body, time: "Just now", unread: (existing.unread ?? 0) + 1 });
      } else {
        const initials = fromPhone.replace(/[^0-9]/g, "").slice(-2) || "??";
        await createWhatsappConversation({
          contact: fromPhone, company: "", message: body, time: "Just now",
          unread: 1, status: "active", avatar: initials, contact_phone: fromPhone,
        } as Omit<WhatsappConversation, "id">);
      }
    } catch (err) {
      console.error("[conversations] legacy whatsapp_conversations dual-write failed:", err);
    }
  }

  return { conversationId, leadId: null };
}

// Used by the WhatsApp CRM section's composer (components/crm/sections/WhatsApp.tsx),
// which still displays the legacy whatsapp_conversations list. Sends for real
// when the row has a known contact_phone (set once a real inbound message has
// been received, or entered manually); otherwise behaves exactly as before
// this phase — logged locally only, no regression for the 5 demo rows that
// have never had a phone number.
export async function sendFromLegacyConversation(
  phone: string,
  body: string,
  accessToken?: string,
): Promise<SendResult> {
  if (!(await assertCan(accessToken, "whatsapp", "create"))) return { ok: false, mock: false, detail: "Forbidden" };
  if (!phone) return { ok: true, mock: true, detail: "No phone on file — logged locally only" };

  const result = await sendWhatsApp(phone, body);
  const conversationId = await ensureConversation("whatsapp", phone, phone);
  if (conversationId) await recordMessage(conversationId, "outbound", body, result.providerMessageId);
  return result;
}

// Links a conversation to a Lead once identity resolution finds/creates one
// (called separately so a resolveIdentity failure never blocks the message
// from being recorded above).
export async function linkConversationToLead(conversationId: string, leadId: number): Promise<void> {
  try {
    const db = getServerClient();
    await db.from("conversations").update({ lead_id: leadId }).eq("id", conversationId);
  } catch (err) {
    console.error("[conversations] linkConversationToLead failed:", err);
  }
}

// ─── Phase 23 — Public Live-Chat Widget (webchat channel) ──────────────────
// Webchat is genuinely multi-tenant-embeddable (unlike WhatsApp/SMS, which
// are KVL's own single numbers) — matched by (site_id, external_thread_id =
// visitor_id) instead of phone, since a website visitor has no phone number.
// These are called from app/api/webchat/* — unauthenticated, visitor-facing
// routes (same trust model as /api/analytics/*), so they don't take an
// accessToken/assertCan gate; rate limiting + site/origin validation in the
// route itself is the protection layer here, matching that convention.

export async function ensureWebchatConversation(
  siteId: string,
  visitorId: string,
  name: string,
): Promise<string | null> {
  try {
    const db = getServerClient();
    const { data: existing } = await db
      .from("conversations")
      .select("id")
      .eq("site_id", siteId)
      .eq("channel", "webchat")
      .eq("external_thread_id", visitorId)
      .maybeSingle();
    if (existing) return existing.id as string;

    const { data: created, error } = await db
      .from("conversations")
      .insert({ site_id: siteId, channel: "webchat", external_thread_id: visitorId, contact_name: name || "Website visitor" })
      .select("id")
      .single();
    if (error) { console.error("[conversations] ensureWebchatConversation insert failed:", error.message); return null; }
    return created.id as string;
  } catch (err) {
    console.error("[conversations] ensureWebchatConversation error:", err);
    return null;
  }
}

// Visitor → agent. Records the message and bumps unread_count (same
// non-atomic-increment caveat as recordInboundMessage above).
export async function postWebchatVisitorMessage(conversationId: string, body: string): Promise<void> {
  try {
    const db = getServerClient();
    await db.from("messages").insert({ conversation_id: conversationId, direction: "inbound", body });
    const { data: convRow } = await db.from("conversations").select("unread_count").eq("id", conversationId).maybeSingle();
    await db.from("conversations").update({
      last_message_at: new Date().toISOString(),
      unread_count: (convRow?.unread_count ?? 0) + 1,
    }).eq("id", conversationId);
  } catch (err) {
    console.error("[conversations] postWebchatVisitorMessage failed:", err);
  }
}

// Agent → visitor, from KVlHelpdesk.tsx's LiveChatTab.
export async function sendWebchatAgentReply(conversationId: string, body: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "helpdesk", "create"))) return { ok: false };
  await recordMessage(conversationId, "outbound", body);
  return { ok: true };
}

// Guards the poll route below — a conversation_id alone isn't enough to
// authorize reading it; must also belong to the requesting site+visitor
// (prevents one visitor polling another's thread, or a different site's).
export async function verifyWebchatConversationOwnership(
  conversationId: string,
  siteId: string,
  visitorId: string,
): Promise<boolean> {
  try {
    const db = getServerClient();
    const { data } = await db
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("site_id", siteId)
      .eq("channel", "webchat")
      .eq("external_thread_id", visitorId)
      .maybeSingle();
    return Boolean(data);
  } catch (err) {
    console.error("[conversations] verifyWebchatConversationOwnership failed:", err);
    return false;
  }
}

// Polled by the widget (public/kvl-chat.js) — new agent replies since the
// visitor's last poll. No websocket/Realtime infra exists in this codebase;
// polling is the same honest choice already made for the Acquisition
// dashboard's Live Activity tab (docs/ACQUISITION_ENGINE_ROADMAP.md §17.6a).
export async function getWebchatMessagesSince(conversationId: string, sinceIso: string): Promise<Message[]> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .gt("created_at", sinceIso)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as Message[];
  } catch (err) {
    console.error("[conversations] getWebchatMessagesSince failed:", err);
    return [];
  }
}

// Outbound send from the Conversations UI — really sends via Twilio/Meta when
// configured (lib/messaging/send.ts), always records the message either way.
// For instagram/messenger, `toPhone` holds the recipient's Meta-assigned
// PSID/IGSID (captured from their inbound message), not an actual phone
// number — Channel's original "phone" naming predates these two channels;
// reused rather than adding a parallel identifier column, since the column
// itself is just an opaque per-channel recipient-address string already.
export async function sendMessage(
  conversationId: string,
  channel: Channel,
  toPhone: string,
  body: string,
  accessToken?: string,
): Promise<SendResult> {
  if (!(await assertCan(accessToken, "whatsapp", "create"))) return { ok: false, mock: false, detail: "Forbidden" };

  const result: SendResult =
    channel === "whatsapp" ? await sendWhatsApp(toPhone, body) :
    channel === "sms" ? await sendSms(toPhone, body) :
    channel === "instagram" ? await sendInstagramDm(toPhone, body) :
    channel === "messenger" ? await sendMessengerMessage(toPhone, body) :
    { ok: false, mock: false, detail: `Channel "${channel}" isn't wired to a real send yet` };

  await recordMessage(conversationId, "outbound", body, result.providerMessageId);
  return result;
}
