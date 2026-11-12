"use server";
// WhatsApp Setup — server actions for the CRM ▸ WhatsApp Setup tab.
// Credentials are high-sensitivity → assertCanStrict (a login token is required, no soft mode).

import { getDb } from "@/lib/db";
import { assertCanStrict } from "@/lib/security/requireAction";
import { loadWaConfig, saveWaConfig, maskWaConfig, waEnv, type WaConfig } from "@/lib/whatsapp/config";
import { whatsappProvider, waDigits, isCloudConfigured, isQrConfigured, type WhatsAppProvider } from "@/lib/messaging/whatsappProviders";
import { sendWhatsApp } from "@/lib/messaging/send";
import { normalizeContactPhone } from "@/lib/whatsapp/broadcast";

const GRAPH = "https://graph.facebook.com/v21.0";
const guard = (t: string | undefined, a: "read" | "update") => assertCanStrict(t, "automation", a);
type Json = Record<string, unknown>;

export interface WaStatus {
  ok: boolean;
  provider: WhatsAppProvider;
  configured: boolean;
  /** "crm" when WhatsApp Setup provides credentials, "env" when only .env does, "none". */
  source: "crm" | "env" | "none";
  lines: { label: string; value: string; tone?: "green" | "amber" | "red" }[];
  qr?: { state: string; dataUrl: string | null; me: string | null; sentToday: number; dailyCap: number };
  error?: string;
}

export async function getWaSetup(token?: string): Promise<{ config: WaConfig; effective: WhatsAppProvider; configured: boolean; envHints: Record<string, boolean> } | null> {
  if (!(await guard(token, "read"))) return null;
  const cfg = await loadWaConfig(true);
  const env = await waEnv();
  const eff = whatsappProvider(env);
  const configured = eff === "cloud" ? isCloudConfigured(env) : eff === "qr" ? isQrConfigured(env) : Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
  return {
    config: maskWaConfig(cfg), effective: eff, configured,
    envHints: { cloud: Boolean(process.env.WHATSAPP_CLOUD_TOKEN), qr: Boolean(process.env.WHATSAPP_QR_URL), twilio: Boolean(process.env.TWILIO_ACCOUNT_SID), twilioToken: Boolean(process.env.TWILIO_AUTH_TOKEN) },
  };
}

export async function saveWaSetup(patch: Partial<WaConfig>, token?: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await guard(token, "update"))) return { ok: false, error: "Login with an admin account to change WhatsApp settings." };
  const ok = await saveWaConfig(patch);
  return ok ? { ok: true } : { ok: false, error: "Could not save (is the database configured?)." };
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: Json }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Json };
}

/** Live check of whichever provider is active: validates credentials and returns number / quality / link state. */
export async function testWaConnection(token?: string): Promise<WaStatus> {
  const base: WaStatus = { ok: false, provider: "twilio", configured: false, source: "none", lines: [] };
  if (!(await guard(token, "read"))) return { ...base, error: "Forbidden" };
  const cfg = await loadWaConfig(true);
  const env = await waEnv();
  const provider = whatsappProvider(env);
  const out: WaStatus = { ...base, provider, source: cfg.provider || cfg.cloud.token || cfg.qr.url || cfg.twilio.from ? "crm" : "env" };
  try {
    if (provider === "cloud") {
      out.configured = isCloudConfigured(env);
      if (!out.configured) return { ...out, source: "none", error: "Enter the Access Token and Phone Number ID." };
      const r = await fetchJson(`${GRAPH}/${env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}?fields=verified_name,display_phone_number,quality_rating`, { headers: { Authorization: `Bearer ${env.WHATSAPP_CLOUD_TOKEN}` } });
      if (!r.ok) return { ...out, error: `Meta rejected the credentials: ${(r.json.error as Json | undefined)?.message ?? r.status}` };
      const q = String(r.json.quality_rating ?? "UNKNOWN");
      out.ok = true;
      out.lines = [
        { label: "Business number", value: String(r.json.display_phone_number ?? "—"), tone: "green" },
        { label: "Verified name", value: String(r.json.verified_name ?? "—") },
        { label: "Quality rating", value: q, tone: q === "GREEN" ? "green" : q === "YELLOW" ? "amber" : q === "RED" ? "red" : undefined },
        { label: "Webhook signing (App Secret)", value: env.META_APP_SECRET ? "set" : "missing — inbound messages will be rejected", tone: env.META_APP_SECRET ? "green" : "red" },
        { label: "Template sync (WABA ID)", value: env.WHATSAPP_CLOUD_WABA_ID ? "ready" : "add WABA ID to sync templates", tone: env.WHATSAPP_CLOUD_WABA_ID ? "green" : "amber" },
      ];
    } else if (provider === "qr") {
      out.configured = isQrConfigured(env);
      if (!out.configured) return { ...out, source: "none", error: "Enter the QR service URL and secret." };
      const r = await fetchJson(`${env.WHATSAPP_QR_URL!.replace(/\/$/, "")}/qr`, { headers: { Authorization: `Bearer ${env.WHATSAPP_QR_SECRET}` } });
      if (!r.ok) return { ...out, error: r.status === 401 ? "QR service rejected the secret." : `QR service answered ${r.status}.` };
      const state = String(r.json.state ?? "");
      out.ok = state === "open";
      out.qr = { state, dataUrl: (r.json.qr as string | null) ?? null, me: (r.json.me as string | null) ?? null, sentToday: Number(r.json.sentToday ?? 0), dailyCap: Number(r.json.dailyCap ?? 0) };
      out.lines = [
        { label: "Link state", value: state === "open" ? "connected" : state === "qr" ? "waiting for QR scan" : state, tone: state === "open" ? "green" : "amber" },
        { label: "Linked number", value: out.qr.me ? `+${out.qr.me.split(":")[0].split("@")[0]}` : "—" },
        { label: "Sent today", value: `${out.qr.sentToday} / ${out.qr.dailyCap}` },
      ];
    } else {
      out.configured = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
      if (!out.configured) return { ...out, source: "none", error: "Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env and the WhatsApp sender number here." };
      const r = await fetchJson(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}.json`, { headers: { Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}` } });
      if (!r.ok) return { ...out, error: `Twilio rejected the credentials (${r.status}).` };
      out.ok = true;
      out.lines = [{ label: "Sender", value: env.TWILIO_WHATSAPP_FROM!, tone: "green" }, { label: "Account", value: String(r.json.friendly_name ?? r.json.status ?? "ok") }];
    }
  } catch (err) { out.error = `Could not reach the provider: ${String((err as Error).message ?? err)}`; }
  return out;
}

/** "Link with phone number": asks the QR service for an 8-character pairing code to type into WhatsApp. */
export async function requestWaPairingCode(phone: string, token?: string): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!(await guard(token, "update"))) return { ok: false, error: "Forbidden" };
  const env = await waEnv();
  if (!isQrConfigured(env)) return { ok: false, error: "QR service not configured." };
  try {
    const r = await fetchJson(`${env.WHATSAPP_QR_URL!.replace(/\/$/, "")}/pair`, { method: "POST", headers: { Authorization: `Bearer ${env.WHATSAPP_QR_SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    return r.ok && r.json.code ? { ok: true, code: String(r.json.code) } : { ok: false, error: String(r.json.error ?? `QR service answered ${r.status}`) };
  } catch (err) { return { ok: false, error: String(err) }; }
}

export async function logoutWaQr(token?: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await guard(token, "update"))) return { ok: false, error: "Forbidden" };
  const env = await waEnv();
  if (!isQrConfigured(env)) return { ok: false, error: "QR service not configured." };
  try {
    const r = await fetchJson(`${env.WHATSAPP_QR_URL!.replace(/\/$/, "")}/logout`, { method: "POST", headers: { Authorization: `Bearer ${env.WHATSAPP_QR_SECRET}` } });
    return r.ok ? { ok: true } : { ok: false, error: `QR service answered ${r.status}` };
  } catch (err) { return { ok: false, error: String(err) }; }
}

/** Sends a real test message through the active provider (bypasses DNC — it's to yourself). */
export async function sendWaTest(phone: string, text: string, token?: string): Promise<{ ok: boolean; detail: string }> {
  if (!(await guard(token, "update"))) return { ok: false, detail: "Forbidden" };
  const cfg = await loadWaConfig();
  const to = normalizeContactPhone(phone, cfg.limits.defaultCountryCode);
  if (!to) return { ok: false, detail: "Enter a valid phone number (with country code)." };
  const r = await sendWhatsApp(to, text.trim() || "✅ Test message from your CRM — WhatsApp is connected.", { bypassSuppression: true });
  if (!r.ok) return { ok: false, detail: r.detail ?? "Send failed" };
  return { ok: true, detail: r.mock ? "Logged only — provider not configured, nothing was sent." : `Sent to +${waDigits(to)}.` };
}

interface MetaTemplate { name: string; language: string; status: string; category?: string; components?: { type: string; text?: string }[] }

/** Pulls every template from the Meta WABA into message_templates (kind 'whatsapp'): body, language, approved flag. */
export async function syncMetaTemplates(token?: string): Promise<{ ok: boolean; added: number; updated: number; approved: number; error?: string }> {
  const fail = (error: string) => ({ ok: false, added: 0, updated: 0, approved: 0, error });
  if (!(await guard(token, "update"))) return fail("Forbidden");
  const env = await waEnv();
  if (!env.WHATSAPP_CLOUD_TOKEN || !env.WHATSAPP_CLOUD_WABA_ID) return fail("Add the Access Token and WhatsApp Business Account (WABA) ID first.");
  try {
    const all: MetaTemplate[] = [];
    let url: string | undefined = `${GRAPH}/${env.WHATSAPP_CLOUD_WABA_ID}/message_templates?fields=name,language,status,category,components&limit=100`;
    for (let page = 0; url && page < 10; page++) {
      const r = await fetchJson(url, { headers: { Authorization: `Bearer ${env.WHATSAPP_CLOUD_TOKEN}` } });
      if (!r.ok) return fail(`Meta: ${(r.json.error as Json | undefined)?.message ?? r.status}`);
      all.push(...((r.json.data as MetaTemplate[] | undefined) ?? []));
      url = (r.json.paging as { next?: string } | undefined)?.next;
    }
    const db = getDb();
    const { data: existing } = await db.from("message_templates").select("id,meta_name,language").eq("kind", "whatsapp");
    const byKey = new Map((existing ?? []).map((e) => [`${e.meta_name}|${e.language}`, String(e.id)]));
    let added = 0, updated = 0, approved = 0;
    for (const t of all) {
      const body = t.components?.find((c) => c.type === "BODY")?.text ?? "";
      const isOk = t.status === "APPROVED";
      if (isOk) approved++;
      const row = { kind: "whatsapp", name: t.name, meta_name: t.name, language: t.language, body, approved: isOk, subject: t.category ?? "" };
      const id = byKey.get(`${t.name}|${t.language}`);
      if (id) { await db.from("message_templates").update({ body, approved: isOk, subject: t.category ?? "" }).eq("id", id); updated++; }
      else { await db.from("message_templates").insert(row); added++; }
    }
    return { ok: true, added, updated, approved };
  } catch (err) { return fail(String((err as Error).message ?? err)); }
}

export interface MetaTemplateInput { name: string; category: "UTILITY" | "MARKETING"; language: string; body: string; examples: string[] }

/** Creates a template on Meta (status PENDING until Meta approves — run "Sync templates" to refresh). */
export async function submitMetaTemplate(p: MetaTemplateInput, token?: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await guard(token, "update"))) return { ok: false, error: "Forbidden" };
  const env = await waEnv();
  if (!env.WHATSAPP_CLOUD_TOKEN || !env.WHATSAPP_CLOUD_WABA_ID) return { ok: false, error: "Add the Access Token and WABA ID in WhatsApp Setup first." };
  const name = p.name.trim();
  if (!/^[a-z0-9_]{1,200}$/.test(name)) return { ok: false, error: "Template name: lowercase letters, numbers and underscores only (e.g. diwali_offer)." };
  const body = p.body.trim();
  if (!body || body.length > 1024) return { ok: false, error: "Body is required (max 1024 characters)." };
  const nums = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1]));
  const n = nums.length ? Math.max(...nums) : 0;
  if (nums.some((x) => x < 1) || new Set(nums).size !== n) return { ok: false, error: "Variables must be numbered {{1}}, {{2}}, … in order, each once." };
  if (/^\s*\{\{/.test(body) || /\}\}\s*$/.test(body)) return { ok: false, error: "Meta does not allow a variable at the very start or end of the body — add some text around it." };
  const examples = p.examples.map((e) => e.trim()).filter(Boolean);
  if (examples.length !== n) return { ok: false, error: `Give exactly ${n} example value${n === 1 ? "" : "s"} (one per variable) — Meta needs them to review the template.` };
  try {
    const r = await fetchJson(`${GRAPH}/${env.WHATSAPP_CLOUD_WABA_ID}/message_templates`, {
      method: "POST", headers: { Authorization: `Bearer ${env.WHATSAPP_CLOUD_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, language: p.language || "en", category: p.category, components: [{ type: "BODY", text: body, ...(n ? { example: { body_text: [examples] } } : {}) }] }),
    });
    if (!r.ok) { const e = r.json.error as Json | undefined; return { ok: false, error: `Meta: ${e?.error_user_msg ?? e?.message ?? r.status}` }; }
    const db = getDb();
    const { data: ex } = await db.from("message_templates").select("id").eq("kind", "whatsapp").eq("meta_name", name).eq("language", p.language || "en").maybeSingle();
    const row = { kind: "whatsapp", name, meta_name: name, language: p.language || "en", body, approved: false, subject: p.category };
    if (ex) await db.from("message_templates").update(row).eq("id", ex.id); else await db.from("message_templates").insert(row);
    return { ok: true };
  } catch (err) { return { ok: false, error: String((err as Error).message ?? err) }; }
}
