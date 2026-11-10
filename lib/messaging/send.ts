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
import { whatsappProvider, sendWhatsAppCloud, sendWhatsAppQr, sendWhatsAppCloudMedia, sendWhatsAppQrMedia, sendWhatsAppCloudTemplate, isCloudConfigured, isQrConfigured } from "./whatsappProviders";
import { isSuppressed } from "@/lib/compliance/dnc";
import { unsubscribeUrl } from "@/lib/compliance/token";
import { getDb, dbConfigured } from "@/lib/db";
import { waEnv } from "@/lib/whatsapp/config";

/** Marketing/follow-up sends honour the central DNC list. `bypassSuppression` is for
 *  internal/team alerts and genuinely transactional messages only. */
export interface SendOpts { bypassSuppression?: boolean }
const OPTED_OUT: SendResult = { ok: false, mock: false, suppressed: true, detail: "Contact has opted out (DNC list)" };

export interface SendResult {
  ok: boolean;
  mock: boolean;
  providerMessageId?: string;
  detail?: string;
  /** true → not sent because the contact is on the DNC list. */
  suppressed?: boolean;
}

async function twilioSend(params: {
  from?: string;
  to: string;
  body: string;
  mockPrefix: string;
  mediaUrl?: string;
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
    if (params.mediaUrl) form.set("MediaUrl", params.mediaUrl);
    // Real delivery status (queued → sent → delivered/read/failed) comes back to this webhook.
    if (process.env.NEXT_PUBLIC_APP_URL) form.set("StatusCallback", `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/messaging/twilio-status`);
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
export async function sendWhatsApp(to: string, body: string, opts: SendOpts = {}): Promise<SendResult> {
  if (!opts.bypassSuppression && (await isSuppressed({ phone: to }, "whatsapp"))) return OPTED_OUT;
  // Own-number providers (Meta Cloud API / QR service) — see whatsappProviders.ts.
  const env = await waEnv(); // CRM-saved WhatsApp settings override .env
  const provider = whatsappProvider(env);
  if (provider === "cloud") return sendWhatsAppCloud(to, body, env);
  if (provider === "qr") return sendWhatsAppQr(to, body, env);
  const from = env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
  const target = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  return twilioSend({ from, to: target, body, mockPrefix: "whatsapp" });
}

/** Image / PDF / brochure. `caption` is shown under the media. */
export async function sendWhatsAppMedia(to: string, mediaUrl: string, caption = "", opts: SendOpts = {}): Promise<SendResult> {
  if (!opts.bypassSuppression && (await isSuppressed({ phone: to }, "whatsapp"))) return OPTED_OUT;
  const env = await waEnv();
  const provider = whatsappProvider(env);
  if (provider === "cloud") return sendWhatsAppCloudMedia(to, mediaUrl, caption, env);
  if (provider === "qr") return sendWhatsAppQrMedia(to, mediaUrl, caption, env);
  const from = env.TWILIO_WHATSAPP_FROM;
  const target = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  return twilioSend({ from, to: target, body: caption, mockPrefix: "whatsapp", mediaUrl });
}

/** Approved Meta template (works outside the 24h window). Non-Cloud providers send `fallbackBody` as plain text. */
export async function sendWhatsAppTemplate(to: string, tpl: { metaName: string; language?: string; params: string[]; fallbackBody: string }, opts: SendOpts = {}): Promise<SendResult> {
  if (!opts.bypassSuppression && (await isSuppressed({ phone: to }, "whatsapp"))) return OPTED_OUT;
  const env = await waEnv();
  if (whatsappProvider(env) === "cloud" && tpl.metaName) return sendWhatsAppCloudTemplate(to, tpl.metaName, tpl.language ?? "en", tpl.params, env);
  return sendWhatsApp(to, tpl.fallbackBody, { bypassSuppression: true });
}

export async function sendSms(to: string, body: string, templateKey?: string, opts: SendOpts = {}): Promise<SendResult> {
  if (!opts.bypassSuppression && (await isSuppressed({ phone: to }, "sms"))) return OPTED_OUT;
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
  return whatsAppConfiguredFor(process.env);
}
function whatsAppConfiguredFor(env: NodeJS.ProcessEnv): boolean {
  const provider = whatsappProvider(env);
  if (provider === "cloud") return isCloudConfigured(env);
  if (provider === "qr") return isQrConfigured(env);
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
}
/** Like isWhatsAppConfigured() but also counts WhatsApp settings saved in the CRM (WhatsApp Setup). Prefer this. */
export async function isWhatsAppReady(): Promise<boolean> {
  return whatsAppConfiguredFor(await waEnv());
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

// Phase 45 — Webinar Funnels. The only existing email sender
// (lib/marketing/channels.ts::publishEmail) posts to Resend's /broadcasts
// endpoint — an AUDIENCE broadcast, not addressed to one recipient, so it
// can't be reused for a single reminder email. This calls Resend's regular
// /emails endpoint instead, same credentials (RESEND_API_KEY,
// OUTREACH_FROM_EMAIL), same mock-fallback/never-throw convention.
export interface EmailOpts extends SendOpts {
  leadId?: number;
  sentBy?: string;          // automation | ai | human
  /** Skip the unsubscribe footer/headers (internal & transactional mail only). */
  transactional?: boolean;
}

async function logEmail(row: Record<string, unknown>): Promise<void> {
  if (!dbConfigured()) return;
  try {
    const db = getDb();
    let leadId = row.lead_id as number | undefined;
    if (!leadId && row.to_email) {
      const { data } = await db.from("leads").select("id").ilike("email", String(row.to_email)).limit(1).maybeSingle();
      leadId = data?.id as number | undefined;
    }
    await db.from("email_log").insert({ ...row, lead_id: leadId ?? null, thread_key: String(row.to_email ?? "").toLowerCase() });
  } catch (err) { console.error("[messaging:email] log failed:", err); }
}

export async function sendEmail(to: string, subject: string, body: string, opts: EmailOpts = {}): Promise<SendResult> {
  if (!opts.bypassSuppression && (await isSuppressed({ email: to }, "email"))) return OPTED_OUT;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL ?? process.env.MARKETING_FROM_EMAIL;

  // Unsubscribe footer + RFC 8058 one-click headers on everything except transactional/internal mail.
  const unsub = opts.transactional ? null : unsubscribeUrl(to);
  const html = unsub ? `${body}<br><br><hr style="border:none;border-top:1px solid #ddd"><p style="font-size:11px;color:#888">Don't want these emails? <a href="${unsub}">Unsubscribe</a></p>` : body;
  const headers = unsub ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined;
  const base = { direction: "outbound", from_email: from ?? "", to_email: to, subject, body, sent_by: opts.sentBy ?? "automation", lead_id: opts.leadId };

  if (!key || !from) {
    console.log(`[messaging:email:mock] → ${to} | ${subject}`);
    await logEmail({ ...base, status: "mock" });
    return { ok: true, mock: true, detail: "logged (mock) — Resend not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(headers ? { headers } : {}) }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[messaging:email] send HTTP ${res.status}`, text);
      await logEmail({ ...base, status: "failed", error: `resend ${res.status}` });
      return { ok: false, mock: false, detail: `resend ${res.status}` };
    }
    const j = (await res.json()) as { id?: string };
    await logEmail({ ...base, status: "sent", provider_id: j.id });
    return { ok: true, mock: false, providerMessageId: j.id };
  } catch (err) {
    console.error("[messaging:email] send error:", err);
    await logEmail({ ...base, status: "failed", error: String(err) });
    return { ok: false, mock: false, detail: String(err) };
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && (process.env.OUTREACH_FROM_EMAIL ?? process.env.MARKETING_FROM_EMAIL));
}
