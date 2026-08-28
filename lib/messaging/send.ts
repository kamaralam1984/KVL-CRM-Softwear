// Phase 21 — Unified Conversations. Channel-agnostic outbound send, reusing
// the EXACT Twilio REST call already proven in lib/marketing/channels.ts's
// publishWhatsapp (Basic auth, Messages.json endpoint) — generalized here to
// take an arbitrary (to, body) instead of a Campaign, so both the marketing
// engine and the Conversations inbox share one real implementation instead of
// two. Real when Twilio creds are present, mock (logged) otherwise — never throws.
//
// Phase 37 — sendSms's optional `templateKey` looks up an approved
// `sms_templates` row purely for DLT audit-trail logging (which registered
// entity/template a given SMS was sent under). NOTE: Twilio's Messages.json
// API has no first-class DLT entity/template fields — this does not (and
// cannot) make Twilio itself DLT-compliant; it standardizes the record-
// keeping for whichever DLT-registered gateway the user's SMS traffic
// actually routes through. Never blocks sending when a template is missing
// or unapproved — only logs a warning — matching "never throw" here too.

import { findApprovedSmsTemplate } from "@/lib/actions/smsTemplates";

export interface SendResult {
  ok: boolean;
  mock: boolean;
  providerMessageId?: string;
  detail?: string;
}

async function twilioSend(params: {
  from?: string;
  to: string;
  body: string;
  mockPrefix: string;
}): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const { from, to, body, mockPrefix } = params;

  if (!sid || !token || !from) {
    console.log(`[messaging:${mockPrefix}:mock] → ${to} | ${body}`);
    return { ok: true, mock: true, detail: "logged (mock) — Twilio not configured" };
  }

  try {
    const form = new URLSearchParams({ From: from, To: to, Body: body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[messaging:${mockPrefix}] send HTTP ${res.status}`, text);
      return { ok: false, mock: false, detail: `twilio ${res.status}` };
    }
    const j = (await res.json()) as { sid?: string };
    return { ok: true, mock: false, providerMessageId: j.sid };
  } catch (err) {
    console.error(`[messaging:${mockPrefix}] send error:`, err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

/** `to` is a bare E.164 phone number (e.g. "+919812345678"), not `whatsapp:`-prefixed. */
export function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
  const target = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  return twilioSend({ from, to: target, body, mockPrefix: "whatsapp" });
}

export async function sendSms(to: string, body: string, templateKey?: string): Promise<SendResult> {
  if (templateKey) {
    const tpl = await findApprovedSmsTemplate(templateKey);
    if (tpl) {
      console.log(`[messaging:sms:dlt] sending under approved template "${templateKey}" (entity ${tpl.dlt_entity_id}, template ${tpl.dlt_template_id})`);
    } else {
      console.warn(`[messaging:sms:dlt] no approved DLT template registered for "${templateKey}" — sending anyway, register it in Settings → DLT Templates once you complete DLT registration`);
    }
  }
  const from = process.env.TWILIO_SMS_FROM;
  return twilioSend({ from, to, body, mockPrefix: "sms" });
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}
export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM);
}

// Phase 42 — Social DMs. Reuses the exact META_PAGE_ACCESS_TOKEN/META_PAGE_ID/
// META_INSTAGRAM_USER_ID env vars lib/social/publish.ts already uses for
// organic posting — same credential, a different Graph API endpoint (Send
// API instead of Feed/Media), not a new credential type. `recipientId` is
// the sender's Meta-assigned PSID/IGSID (captured from an inbound message),
// never a phone number — Meta's messaging APIs don't expose one.
async function metaSend(params: {
  path: string; // e.g. "{ig-id}/messages" or "{page-id}/messages"
  recipientId: string;
  body: string;
  token: string | undefined;
  mockPrefix: string;
}): Promise<SendResult> {
  const { path, recipientId, body, token, mockPrefix } = params;
  if (!token) {
    console.log(`[messaging:${mockPrefix}:mock] → ${recipientId} | ${body}`);
    return { ok: true, mock: true, detail: "logged (mock) — Meta credentials not configured" };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: body }, access_token: token }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[messaging:${mockPrefix}] send HTTP ${res.status}`, text);
      return { ok: false, mock: false, detail: `meta ${res.status}` };
    }
    const j = (await res.json()) as { message_id?: string };
    return { ok: true, mock: false, providerMessageId: j.message_id };
  } catch (err) {
    console.error(`[messaging:${mockPrefix}] send error:`, err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

export function sendInstagramDm(recipientId: string, body: string): Promise<SendResult> {
  const igUserId = process.env.META_INSTAGRAM_USER_ID;
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!igUserId) return Promise.resolve({ ok: true, mock: true, detail: "logged (mock) — META_INSTAGRAM_USER_ID not configured" });
  return metaSend({ path: `${igUserId}/messages`, recipientId, body, token, mockPrefix: "instagram" });
}

export function sendMessengerMessage(recipientId: string, body: string): Promise<SendResult> {
  const pageId = process.env.META_PAGE_ID;
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!pageId) return Promise.resolve({ ok: true, mock: true, detail: "logged (mock) — META_PAGE_ID not configured" });
  return metaSend({ path: `${pageId}/messages`, recipientId, body, token, mockPrefix: "messenger" });
}

export function isMetaMessagingConfigured(): boolean {
  return Boolean(process.env.META_PAGE_ACCESS_TOKEN && (process.env.META_PAGE_ID || process.env.META_INSTAGRAM_USER_ID));
}
