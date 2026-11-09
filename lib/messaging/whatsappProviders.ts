// WhatsApp sending via the user's OWN number. Three interchangeable providers,
// picked by WHATSAPP_PROVIDER (or auto-detected from which env vars exist):
//
//   cloud  — Meta WhatsApp Cloud API (official; own number registered in Meta Business)
//            WHATSAPP_CLOUD_TOKEN, WHATSAPP_CLOUD_PHONE_NUMBER_ID
//            optional: WHATSAPP_CLOUD_TEMPLATE_NAME / _LANG — approved template with ONE
//            body variable {{1}}, used automatically when the 24h customer window is closed.
//   qr     — WhatsApp-Web-style linked device via the standalone service in /whatsapp-qr
//            WHATSAPP_QR_URL, WHATSAPP_QR_SECRET   (unofficial — ban risk, see docs)
//   twilio — existing Twilio sender (TWILIO_*), unchanged.
//
// Same convention as the rest of lib/messaging: real when configured, logged mock
// otherwise, never throws.

import type { SendResult } from "./send";

export type WhatsAppProvider = "cloud" | "qr" | "twilio";

export function whatsappProvider(env: NodeJS.ProcessEnv = process.env): WhatsAppProvider {
  const forced = env.WHATSAPP_PROVIDER?.toLowerCase();
  if (forced === "cloud" || forced === "qr" || forced === "twilio") return forced;
  if (env.WHATSAPP_CLOUD_TOKEN && env.WHATSAPP_CLOUD_PHONE_NUMBER_ID) return "cloud";
  if (env.WHATSAPP_QR_URL && env.WHATSAPP_QR_SECRET) return "qr";
  return "twilio";
}

export function isCloudConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.WHATSAPP_CLOUD_TOKEN && env.WHATSAPP_CLOUD_PHONE_NUMBER_ID);
}
export function isQrConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.WHATSAPP_QR_URL && env.WHATSAPP_QR_SECRET);
}

/** "+91 98123-45678" / "whatsapp:+9198…" → "919812345678" (digits only, as both APIs expect). */
export function waDigits(to: string): string {
  return to.replace(/^whatsapp:/, "").replace(/\D/g, "");
}

// Meta error codes meaning "customer-service window closed — a template is required".
const WINDOW_CLOSED_CODES = new Set([131047, 131051, 131026]);

async function cloudPost(phoneNumberId: string, token: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { code?: number; message?: string } };
  return { res, json };
}

export async function sendWhatsAppCloud(to: string, body: string): Promise<SendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const digits = waDigits(to);
  if (!token || !phoneNumberId) {
    console.log(`[messaging:whatsapp-cloud:mock] → ${digits} | ${body}`);
    return { ok: true, mock: true, detail: "logged (mock) — WhatsApp Cloud API not configured" };
  }
  try {
    const text = await cloudPost(phoneNumberId, token, { to: digits, type: "text", text: { body, preview_url: true } });
    if (text.res.ok) return { ok: true, mock: false, providerMessageId: text.json.messages?.[0]?.id };

    const code = text.json.error?.code;
    const template = process.env.WHATSAPP_CLOUD_TEMPLATE_NAME;
    if (code && WINDOW_CLOSED_CODES.has(code) && template) {
      // Outside the 24h window only approved templates may be sent. Meta forbids newlines/tabs in variables.
      const param = body.replace(/[\r\n\t]+/g, " ").replace(/ {5,}/g, "    ").slice(0, 1000);
      const t = await cloudPost(phoneNumberId, token, {
        to: digits, type: "template",
        template: { name: template, language: { code: process.env.WHATSAPP_CLOUD_TEMPLATE_LANG ?? "en" }, components: [{ type: "body", parameters: [{ type: "text", text: param }] }] },
      });
      if (t.res.ok) return { ok: true, mock: false, providerMessageId: t.json.messages?.[0]?.id, detail: "sent via template (24h window closed)" };
      console.error("[messaging:whatsapp-cloud] template send failed", t.json.error);
      return { ok: false, mock: false, detail: `cloud template ${t.res.status}: ${t.json.error?.message ?? ""}` };
    }
    console.error("[messaging:whatsapp-cloud] send failed", text.json.error);
    const hint = code && WINDOW_CLOSED_CODES.has(code) ? " — 24h window closed; set WHATSAPP_CLOUD_TEMPLATE_NAME" : "";
    return { ok: false, mock: false, detail: `cloud ${text.res.status}: ${text.json.error?.message ?? ""}${hint}` };
  } catch (err) {
    console.error("[messaging:whatsapp-cloud] send error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

export async function sendWhatsAppQr(to: string, body: string): Promise<SendResult> {
  const base = process.env.WHATSAPP_QR_URL;
  const secret = process.env.WHATSAPP_QR_SECRET;
  const digits = waDigits(to);
  if (!base || !secret) {
    console.log(`[messaging:whatsapp-qr:mock] → ${digits} | ${body}`);
    return { ok: true, mock: true, detail: "logged (mock) — WhatsApp QR service not configured" };
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: digits, body }),
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
    if (!res.ok || json.ok === false) {
      console.error("[messaging:whatsapp-qr] send failed", res.status, json.error);
      return { ok: false, mock: false, detail: `qr ${res.status}: ${json.error ?? "send failed"}` };
    }
    return { ok: true, mock: false, providerMessageId: json.id };
  } catch (err) {
    console.error("[messaging:whatsapp-qr] send error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

// ── Media + templates ────────────────────────────────────────────────────────

export function mediaKind(url: string): "image" | "video" | "document" {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["mp4", "3gp"].includes(ext)) return "video";
  return "document";
}

export async function sendWhatsAppCloudMedia(to: string, mediaUrl: string, caption = ""): Promise<SendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN, phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const digits = waDigits(to);
  if (!token || !phoneNumberId) {
    console.log(`[messaging:whatsapp-cloud:mock] → ${digits} | media ${mediaUrl} | ${caption}`);
    return { ok: true, mock: true, detail: "logged (mock) — WhatsApp Cloud API not configured" };
  }
  try {
    const kind = mediaKind(mediaUrl);
    const filename = decodeURIComponent(mediaUrl.split("?")[0].split("/").pop() ?? "file");
    const media = kind === "document" ? { link: mediaUrl, caption, filename } : { link: mediaUrl, caption };
    const r = await cloudPost(phoneNumberId, token, { to: digits, type: kind, [kind]: media });
    if (r.res.ok) return { ok: true, mock: false, providerMessageId: r.json.messages?.[0]?.id };
    return { ok: false, mock: false, detail: `cloud ${r.res.status}: ${r.json.error?.message ?? ""}` };
  } catch (err) { return { ok: false, mock: false, detail: String(err) }; }
}

export async function sendWhatsAppQrMedia(to: string, mediaUrl: string, caption = ""): Promise<SendResult> {
  const base = process.env.WHATSAPP_QR_URL, secret = process.env.WHATSAPP_QR_SECRET;
  const digits = waDigits(to);
  if (!base || !secret) {
    console.log(`[messaging:whatsapp-qr:mock] → ${digits} | media ${mediaUrl}`);
    return { ok: true, mock: true, detail: "logged (mock) — WhatsApp QR service not configured" };
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/send`, {
      method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: digits, body: caption, mediaUrl, mediaKind: mediaKind(mediaUrl) }), signal: AbortSignal.timeout(60_000),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
    if (!res.ok || json.ok === false) return { ok: false, mock: false, detail: `qr ${res.status}: ${json.error ?? "send failed"}` };
    return { ok: true, mock: false, providerMessageId: json.id };
  } catch (err) { return { ok: false, mock: false, detail: String(err) }; }
}

export async function sendWhatsAppCloudTemplate(to: string, name: string, language: string, params: string[]): Promise<SendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN, phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const digits = waDigits(to);
  if (!token || !phoneNumberId) {
    console.log(`[messaging:whatsapp-cloud:mock] → ${digits} | template ${name} ${JSON.stringify(params)}`);
    return { ok: true, mock: true, detail: "logged (mock) — WhatsApp Cloud API not configured" };
  }
  try {
    const clean = params.map((p) => ({ type: "text", text: p.replace(/[\r\n\t]+/g, " ").slice(0, 1000) }));
    const r = await cloudPost(phoneNumberId, token, {
      to: digits, type: "template",
      template: { name, language: { code: language }, ...(clean.length ? { components: [{ type: "body", parameters: clean }] } : {}) },
    });
    if (r.res.ok) return { ok: true, mock: false, providerMessageId: r.json.messages?.[0]?.id };
    return { ok: false, mock: false, detail: `cloud template ${r.res.status}: ${r.json.error?.message ?? ""}` };
  } catch (err) { return { ok: false, mock: false, detail: String(err) }; }
}
