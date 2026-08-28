// Phase 22 — Missed-Call Auto Text-Back. The literal GHL "Missed Call Text
// Back" feature: send an automatic reply + create a callback task the moment
// a customer's call goes unanswered. Provider-agnostic — works with whatever
// telephony provider posts to /api/telephony/missed-call (Exotel/Knowlarity/
// MyOperator all normalize to the same caller_number shape there already).

import { getAcquisitionSettings } from "@/lib/actions/acquisitionSettings";
import { sendWhatsApp, sendSms, isWhatsAppConfigured, isSmsConfigured } from "@/lib/messaging/send";
import { ensureConversation } from "@/lib/actions/conversations";
import { getServerClient } from "@/lib/supabase/server";
import { createTask } from "@/lib/actions/tasks";

export async function getMissedCallReplyTemplate(): Promise<string> {
  try {
    const settings = await getAcquisitionSettings();
    return settings.missed_call_reply_template || "Sorry we missed your call! We'll call you back shortly.";
  } catch (err) {
    console.error("[telephony] getMissedCallReplyTemplate failed:", err);
    return "Sorry we missed your call! We'll call you back shortly.";
  }
}

// Sends the auto-reply (WhatsApp preferred, SMS fallback) and creates a
// callback task. Never throws — a failure here must never break the
// telephony webhook's 200/501 response to the provider.
export async function sendMissedCallAutoReply(phone: string): Promise<void> {
  try {
    const template = await getMissedCallReplyTemplate();

    if (isWhatsAppConfigured()) {
      const result = await sendWhatsApp(phone, template);
      const conversationId = await ensureConversation("whatsapp", phone, phone);
      if (conversationId) {
        const db = getServerClient();
        await db.from("messages").insert({ conversation_id: conversationId, direction: "outbound", body: template, provider_message_id: result.providerMessageId ?? null });
      }
    } else if (isSmsConfigured()) {
      await sendSms(phone, template);
    } else {
      console.log(`[telephony:mock] would auto-reply to ${phone}: "${template}"`);
    }

    await createTask({
      title: `Call back ${phone} (missed call)`,
      priority: "high",
      due: "Today",
      assignee: "Unassigned",
      status: "pending",
      tags: ["Missed Call", "Auto-Reply"],
      company: phone,
    } as Parameters<typeof createTask>[0]);
  } catch (err) {
    console.error("[telephony] sendMissedCallAutoReply failed:", err);
  }
}
