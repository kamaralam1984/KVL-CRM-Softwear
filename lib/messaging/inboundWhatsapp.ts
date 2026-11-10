// Provider-agnostic handling of an inbound WhatsApp message — shared by the
// Twilio, Meta Cloud API and QR-service webhooks so they behave identically:
// record in the inbox → resolve/create the lead → honour STOP/START (central DNC) →
// feed the Follow-up Engine (pause drip, 24h clock, ready-to-pay) → alert the team →
// assign the chat → AI/off-hours auto-reply.

import { recordInboundMessage, linkConversationToLead } from "@/lib/actions/conversations";
import { resolveIdentity, normalizePhone } from "@/lib/identity/resolve";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { handleInboundReply } from "@/lib/followup/engine";
import { classifyInbound } from "@/lib/followup/sequence";
import { addSuppression, removeSuppression } from "@/lib/compliance/dnc";
import { assignConversation, maybeAutoRespond } from "@/lib/comms/autoReply";
import { markBroadcastReply } from "@/lib/whatsapp/broadcast";

const RESUBSCRIBE = /^\s*(start|unstop|subscribe|resume|yes)\s*$/i;

export async function processInboundWhatsapp(rawPhone: string, rawBody: string, providerMessageId?: string, mediaUrl?: string): Promise<void> {
  const phone = normalizePhone(rawPhone.replace(/^whatsapp:/, ""));
  const body = rawBody.slice(0, 4000);
  if (!phone) return;

  const { conversationId, duplicate } = await recordInboundMessage("whatsapp", phone, body, providerMessageId, mediaUrl);
  if (duplicate) return; // webhook retry of a message we already handled — no second auto-reply / drip event / alert

  const resolution = await resolveIdentity({ visitorId: `whatsapp:${phone}`, name: "", email: "", phone }, DEFAULT_SITE_ID).catch(() => null);
  if (conversationId && resolution?.leadId) await linkConversationToLead(conversationId, resolution.leadId);

  await markBroadcastReply(phone); // counts as a "reply" on the latest broadcast this person received

  if (RESUBSCRIBE.test(body)) { await removeSuppression({ phone }); return; }
  const intent = classifyInbound(body);
  if (intent === "optout") await addSuppression({ phone }, { reason: body.slice(0, 80), source: "inbound_stop" });

  const { leadOwner } = await handleInboundReply({ phone, leadId: resolution?.leadId ?? undefined }, body, "WhatsApp");
  if (conversationId) {
    await assignConversation(conversationId, leadOwner);
    if (intent === "normal") await maybeAutoRespond({ conversationId, phone, text: body, channel: "whatsapp" });
  }
}
