// Phase 21 — Unified Conversations. Channel-agnostic outbound send, reusing
// the EXACT Twilio REST call already proven in lib/marketing/channels.ts's
// publishWhatsapp (Basic auth, Messages.json endpoint) — generalized here to
// take an arbitrary (to, body) instead of a Campaign, so both the marketing
// engine and the Conversations inbox share one real implementation instead of
// two. Real when Twilio creds are present, mock (logged) otherwise — never throws.

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

export function sendSms(to: string, body: string): Promise<SendResult> {
  const from = process.env.TWILIO_SMS_FROM;
  return twilioSend({ from, to, body, mockPrefix: "sms" });
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}
export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM);
}
