// Provider-agnostic handling of an inbound WhatsApp message — shared by the
// Twilio, Meta Cloud API and QR-service webhooks so they behave identically:
// record in the inbox, resolve/create the lead, then feed the Follow-up Engine
// (pause drip, start 24h clock, opt-out / ready-to-pay detection).

import { recordInboundMessage, linkConversationToLead } from "@/lib/actions/conversations";
import { resolveIdentity, normalizePhone } from "@/lib/identity/resolve";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { handleInboundReply } from "@/lib/followup/engine";

export async function processInboundWhatsapp(rawPhone: string, rawBody: string, providerMessageId?: string): Promise<void> {
  const phone = normalizePhone(rawPhone.replace(/^whatsapp:/, ""));
  const body = rawBody.slice(0, 4000);
  if (!phone) return;

  const { conversationId } = await recordInboundMessage("whatsapp", phone, body, providerMessageId);

  // Voluntary act (the contact messaged us first).
  const resolution = await resolveIdentity({ visitorId: `whatsapp:${phone}`, name: "", email: "", phone }, DEFAULT_SITE_ID).catch(() => null);
  if (conversationId && resolution?.leadId) await linkConversationToLead(conversationId, resolution.leadId);

  await handleInboundReply({ phone, leadId: resolution?.leadId ?? undefined }, body);
}
