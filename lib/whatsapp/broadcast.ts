// WhatsApp Broadcast engine — send one message to many contacts, safely.
//
//   resolveAudience()  CRM leads (filters / hand-picked) + pasted numbers → de-duplicated, normalised, DNC-checked list
//   createBroadcast()  stores the broadcast + one recipient row each
//   runBroadcastBatch() sends pending recipients for a time budget; called by the UI loop and the cron
//   runDueBroadcasts() cron entry: starts scheduled broadcasts, continues running ones
//
// Guard rails: central DNC (also re-checked inside sendWhatsApp), optional IST send window, rolling-24h
// daily cap, provider pacing (+ QR service's own human-like gap), stop-on-rate-limit/disconnect (recipients
// stay pending and resume on the next run), per-recipient claim so two runners never double-send.
// Server-only. Never throws.

import { getDb } from "@/lib/db";
import { phoneKey } from "@/lib/compliance/dnc";
import { sendWhatsApp, sendWhatsAppMedia, sendWhatsAppTemplate, type SendResult } from "@/lib/messaging/send";
import { logOutboundMessage } from "@/lib/messaging/outbound";
import { loadWaConfig } from "./config";

type Row = Record<string, unknown>;
const STALE_CLAIM_MS = 10 * 60_000;
const OPT_OUT_FOOTER = "\n\nReply STOP to opt out.";

// ── types ────────────────────────────────────────────────────────────────────
export interface Contact { phone: string; name: string; firstName: string; company: string; leadId?: number }
export interface AudienceSpec {
  leadIds?: number[];
  filters?: { statuses?: string[]; stages?: string[]; tags?: string[]; owner?: string; minScore?: number };
  /** Use the CRM filters above (otherwise only `leadIds` + `pasted` are used). */
  useFilters?: boolean;
  /** One contact per line: "+91 98123 45678" or "Asha, 98123 45678". */
  pasted?: string;
}
export interface AudienceResult { contacts: Contact[]; invalid: string[]; duplicates: number; dnc: number; sendable: Contact[] }
export interface BroadcastInput {
  name: string; mode: "text" | "media" | "template"; body: string; mediaUrl?: string;
  templateName?: string; templateLang?: string; templateParams?: string[];
  optOutFooter?: boolean; windowStart?: number | null; windowEnd?: number | null;
  scheduledAtIso?: string | null; audience: AudienceSpec; createdBy?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────
/** "98123 45678" → "+919812345678" (10-digit numbers get the default country code). null = unusable. */
export function normalizeContactPhone(raw: string, countryCode: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  let full = digits;
  if (raw.trim().startsWith("+") || raw.trim().startsWith("00")) full = digits.replace(/^00/, "");
  else if (digits.length === 10 && countryCode) full = countryCode + digits;
  else if (digits.length === 11 && digits.startsWith("0") && countryCode) full = countryCode + digits.slice(1);
  return full.length >= 10 && full.length <= 15 ? `+${full}` : null;
}

/** {{name}} {{firstName}} {{company}} {{phone}} — unknown tags are left empty. */
export function personalize(text: string, v: Record<string, unknown>): string {
  return text.replace(/\{\{\s*(name|firstName|company|phone)\s*\}\}/gi, (_, k: string) => {
    const key = k.toLowerCase() === "firstname" ? "firstName" : k.toLowerCase();
    return String(v[key] ?? "");
  });
}
/** Fills Meta-style {{1}} {{2}} placeholders (used as the plain-text fallback for non-Cloud providers). */
export function fillNumbered(body: string, params: string[]): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "");
}
export function templateParamCount(body: string): number {
  const nums = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 0;
}
const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? "";

function inSendWindow(start: unknown, end: unknown, now = new Date()): boolean {
  if (start == null || end == null) return true;
  const s = Number(start), e = Number(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s === e) return true;
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(now)) % 24;
  return s < e ? h >= s && h < e : h >= s || h < e; // supports overnight windows
}

// ── audience ─────────────────────────────────────────────────────────────────
export async function resolveAudience(spec: AudienceSpec): Promise<AudienceResult> {
  const cfg = await loadWaConfig();
  const cc = cfg.limits.defaultCountryCode;
  const db = getDb();
  const raw: { phone: string; name: string; company: string; leadId?: number }[] = [];
  const invalid: string[] = [];

  const wanted = new Set<number>(spec.leadIds ?? []);
  if (spec.useFilters || wanted.size) {
    let q = db.from("leads").select("id,name,company,phone,status,stage,owner,score,tags");
    if (!spec.useFilters) q = q.in("id", [...wanted]);
    else {
      const f = spec.filters ?? {};
      if (f.statuses?.length) q = q.in("status", f.statuses);
      if (f.stages?.length) q = q.in("stage", f.stages);
      if (f.owner) q = q.eq("owner", f.owner);
      if (f.minScore) q = q.gte("score", f.minScore);
    }
    const { data } = await q.limit(20000);
    const tagFilter = spec.useFilters ? (spec.filters?.tags ?? []) : [];
    for (const l of (data ?? []) as Row[]) {
      if (tagFilter.length && !((l.tags as string[] | null) ?? []).some((t) => tagFilter.includes(t))) continue;
      const id = Number(l.id);
      if (!l.phone) { invalid.push(`${l.name ?? "lead " + id} (no phone)`); continue; }
      raw.push({ phone: String(l.phone), name: String(l.name ?? ""), company: String(l.company ?? ""), leadId: id });
    }
    if (spec.useFilters && wanted.size) { // hand-picked leads are added on top of the filter result
      const { data: extra } = await db.from("leads").select("id,name,company,phone").in("id", [...wanted]);
      for (const l of (extra ?? []) as Row[]) if (l.phone) raw.push({ phone: String(l.phone), name: String(l.name ?? ""), company: String(l.company ?? ""), leadId: Number(l.id) });
    }
  }
  for (const line of (spec.pasted ?? "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^(.*?)[,;\t]\s*([+\d][\d\s\-().]{6,})$/) ?? t.match(/^()([+\d][\d\s\-().]{6,})$/);
    if (!m) { invalid.push(t); continue; }
    raw.push({ phone: m[2], name: m[1].trim(), company: "" });
  }

  const seen = new Set<string>();
  const contacts: Contact[] = [];
  let duplicates = 0;
  for (const r of raw) {
    const phone = normalizeContactPhone(r.phone, cc);
    if (!phone) { invalid.push(`${r.name || r.phone} (${r.phone})`); continue; }
    const key = phoneKey(phone);
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    contacts.push({ phone, name: r.name, firstName: firstName(r.name), company: r.company, leadId: r.leadId });
  }

  const blocked = await suppressedKeys(contacts.map((c) => phoneKey(c.phone)));
  const sendable = contacts.filter((c) => !blocked.has(phoneKey(c.phone)));
  return { contacts, invalid, duplicates, dnc: contacts.length - sendable.length, sendable };
}

async function suppressedKeys(keys: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const db = getDb();
  for (let i = 0; i < keys.length; i += 500) {
    const { data } = await db.from("suppressions").select("phone").in("phone", keys.slice(i, i + 500)).in("channel", ["all", "whatsapp"]);
    for (const r of (data ?? []) as Row[]) out.add(String(r.phone));
  }
  return out;
}

// ── create ───────────────────────────────────────────────────────────────────
export async function createBroadcast(input: BroadcastInput): Promise<{ ok: boolean; id?: string; error?: string; total?: number; skipped?: number }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the broadcast a name." };
  if (input.mode === "template" ? !input.templateName : !input.body.trim() && !input.mediaUrl) return { ok: false, error: input.mode === "template" ? "Pick a template." : "Write a message." };
  if (input.mode === "media" && !/^https:\/\//i.test(input.mediaUrl ?? "")) return { ok: false, error: "Media link must be a public https:// URL." };

  const aud = await resolveAudience(input.audience);
  if (!aud.contacts.length) return { ok: false, error: "No valid recipients — pick leads or paste numbers." };

  const db = getDb();
  const scheduled = input.scheduledAtIso ? new Date(input.scheduledAtIso) : null;
  const { data: b, error } = await db.from("wa_broadcasts").insert({
    name, mode: input.mode, body: input.body, media_url: input.mediaUrl ?? "", template_name: input.templateName ?? "",
    template_lang: input.templateLang || "en", template_params: input.templateParams ?? [], opt_out_footer: input.optOutFooter ?? true,
    window_start: input.windowStart ?? null, window_end: input.windowEnd ?? null,
    status: "draft", scheduled_at: scheduled && !Number.isNaN(+scheduled) ? scheduled.toISOString() : null,
    audience: { ...input.audience, pasted: input.audience.pasted ? `${input.audience.pasted.split(/\r?\n/).length} pasted lines` : undefined },
    total: aud.contacts.length, created_by: input.createdBy ?? "",
  }).select("id").single();
  if (error || !b) return { ok: false, error: error?.message ?? "Could not create broadcast." };
  const id = String(b.id);

  const blocked = new Set(aud.contacts.filter((c) => !aud.sendable.includes(c)).map((c) => c.phone));
  const rows = aud.contacts.map((c) => ({
    broadcast_id: id, phone: c.phone, phone_key: phoneKey(c.phone), name: c.name, lead_id: c.leadId ?? null,
    vars: { name: c.name, firstName: c.firstName, company: c.company, phone: c.phone },
    status: blocked.has(c.phone) ? "skipped" : "pending", error: blocked.has(c.phone) ? "On the Do-Not-Contact list" : "",
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error: e } = await db.from("wa_broadcast_recipients").insert(rows.slice(i, i + 500));
    if (e) { await db.from("wa_broadcasts").delete().eq("id", id); return { ok: false, error: `Could not save recipients: ${e.message}` }; }
  }
  return { ok: true, id, total: aud.contacts.length, skipped: blocked.size };
}

// ── control ──────────────────────────────────────────────────────────────────
export async function setBroadcastStatus(id: string, action: "start" | "pause" | "resume" | "cancel"): Promise<{ ok: boolean; status?: string; error?: string }> {
  const db = getDb();
  const { data: b } = await db.from("wa_broadcasts").select("status,scheduled_at").eq("id", id).maybeSingle();
  if (!b) return { ok: false, error: "Broadcast not found." };
  const cur = String(b.status);
  let next: string | null = null;
  if (action === "start" && cur === "draft") next = b.scheduled_at && new Date(String(b.scheduled_at)).getTime() > Date.now() ? "scheduled" : "running";
  else if (action === "pause" && (cur === "running" || cur === "scheduled")) next = "paused";
  else if (action === "resume" && cur === "paused") next = "running";
  else if (action === "cancel" && ["draft", "scheduled", "running", "paused"].includes(cur)) next = "cancelled";
  if (!next) return { ok: false, error: `Can't ${action} a ${cur} broadcast.` };
  const patch: Row = { status: next, note: "" };
  if (next === "running") patch.started_at = new Date().toISOString();
  if (next === "cancelled") patch.completed_at = new Date().toISOString();
  await db.from("wa_broadcasts").update(patch).eq("id", id);
  if (next === "cancelled") await db.from("wa_broadcast_recipients").update({ status: "skipped", error: "Broadcast cancelled" }).eq("broadcast_id", id).in("status", ["pending", "sending"]);
  return { ok: true, status: next };
}

/** Re-queues failed recipients (not DNC-skipped ones) and resumes the broadcast. */
export async function retryFailed(id: string): Promise<{ ok: boolean; requeued: number }> {
  const db = getDb();
  const { data } = await db.from("wa_broadcast_recipients").update({ status: "pending", error: "", provider_message_id: null, claimed_at: null }).eq("broadcast_id", id).eq("status", "failed").select("id");
  const n = data?.length ?? 0;
  if (n) await db.from("wa_broadcasts").update({ status: "running", note: "", completed_at: null }).eq("id", id).in("status", ["completed", "paused"]);
  return { ok: true, requeued: n };
}

// ── sending ──────────────────────────────────────────────────────────────────
async function sendOne(b: Row, r: Row): Promise<SendResult> {
  const vars = (r.vars ?? {}) as Record<string, unknown>;
  const phone = String(r.phone);
  if (b.mode === "template") {
    const params = ((b.template_params as string[] | null) ?? []).map((p) => personalize(String(p), vars));
    return sendWhatsAppTemplate(phone, { metaName: String(b.template_name), language: String(b.template_lang || "en"), params, fallbackBody: fillNumbered(String(b.body), params) });
  }
  const text = personalize(String(b.body ?? ""), vars) + (b.opt_out_footer ? OPT_OUT_FOOTER : "");
  return b.mode === "media" ? sendWhatsAppMedia(phone, String(b.media_url), text) : sendWhatsApp(phone, text);
}

/** Errors that mean "stop and try later" rather than "this number is bad". */
const TRANSIENT = /\b429\b|rate.?limit|too many|daily cap|not connected|spam|131048|130429|131056|timeout|fetch failed|ECONN|ENOTFOUND/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sentInLast24h(): Promise<number> {
  const { count } = await getDb().from("messages").select("id", { count: "exact", head: true }).eq("sent_by", "broadcast").gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  return count ?? 0;
}

export interface BatchReport { sent: number; failed: number; skipped: number; remaining: number; status: string; note: string }

export async function runBroadcastBatch(id: string, budgetMs = 25_000): Promise<BatchReport> {
  const started = Date.now();
  const db = getDb();
  const rep: BatchReport = { sent: 0, failed: 0, skipped: 0, remaining: 0, status: "", note: "" };
  const finish = async (note = "") => {
    const { count: left } = await db.from("wa_broadcast_recipients").select("id", { count: "exact", head: true }).eq("broadcast_id", id).in("status", ["pending", "sending"]);
    rep.remaining = left ?? 0;
    const { data: cur } = await db.from("wa_broadcasts").select("status").eq("id", id).maybeSingle();
    rep.status = String(cur?.status ?? "");
    if (rep.remaining === 0 && rep.status === "running") {
      await db.from("wa_broadcasts").update({ status: "completed", completed_at: new Date().toISOString(), note: "" }).eq("id", id);
      rep.status = "completed";
    } else if (note && rep.status === "running") await db.from("wa_broadcasts").update({ note }).eq("id", id);
    rep.note = note;
    return rep;
  };

  const { data: b } = await db.from("wa_broadcasts").select("*").eq("id", id).maybeSingle();
  if (!b) return { ...rep, status: "missing" };
  if (b.status === "scheduled" && b.scheduled_at && new Date(String(b.scheduled_at)).getTime() <= Date.now()) {
    await db.from("wa_broadcasts").update({ status: "running", started_at: new Date().toISOString() }).eq("id", id);
    b.status = "running";
  }
  if (b.status !== "running") return finish();
  if (!inSendWindow(b.window_start, b.window_end)) return finish(`Outside the send window (${b.window_start}:00–${b.window_end}:00 IST) — resumes automatically`);

  const cfg = await loadWaConfig();
  let capLeft = Infinity;
  if (cfg.limits.broadcastDailyCap > 0) {
    capLeft = cfg.limits.broadcastDailyCap - (await sentInLast24h());
    if (capLeft <= 0) return finish(`Daily cap of ${cfg.limits.broadcastDailyCap} reached — resumes automatically as the 24h window rolls`);
  }

  // Free up claims left behind by a crashed run.
  await db.from("wa_broadcast_recipients").update({ status: "pending", claimed_at: null }).eq("broadcast_id", id).eq("status", "sending").lt("claimed_at", new Date(Date.now() - STALE_CLAIM_MS).toISOString());

  while (Date.now() - started < budgetMs && capLeft > 0) {
    const { data: batch } = await db.from("wa_broadcast_recipients").select("*").eq("broadcast_id", id).eq("status", "pending").order("created_at").limit(10);
    if (!batch?.length) break;
    for (const r of batch as Row[]) {
      if (Date.now() - started >= budgetMs || capLeft <= 0) return finish();
      // Stop promptly when the user paused/cancelled mid-batch.
      const { data: live } = await db.from("wa_broadcasts").select("status").eq("id", id).maybeSingle();
      if (live?.status !== "running") return finish();
      // Claim: only one runner wins this recipient.
      const { data: claimed } = await db.from("wa_broadcast_recipients").update({ status: "sending", claimed_at: new Date().toISOString() }).eq("id", r.id).eq("status", "pending").select("id");
      if (!claimed?.length) continue;

      const res = await sendOne(b as Row, r);
      const now = new Date().toISOString();
      if (res.suppressed) {
        await db.from("wa_broadcast_recipients").update({ status: "skipped", error: "On the Do-Not-Contact list" }).eq("id", r.id);
        rep.skipped++;
      } else if (res.ok) {
        const body = b.mode === "template" ? fillNumbered(String(b.body), ((b.template_params as string[]) ?? []).map((p) => personalize(String(p), (r.vars ?? {}) as Row))) : personalize(String(b.body ?? ""), (r.vars ?? {}) as Row);
        await db.from("wa_broadcast_recipients").update({ status: "sent", sent_at: now, provider_message_id: res.providerMessageId ?? null, error: res.mock ? "mock — WhatsApp provider not configured, nothing was really sent" : "" }).eq("id", r.id);
        await logOutboundMessage({ channel: "whatsapp", phone: String(r.phone), name: String(r.name ?? ""), body: b.mode === "media" ? `${body}\n[media] ${b.media_url}`.trim() : body, sentBy: "broadcast", providerId: res.providerMessageId, mock: res.mock });
        rep.sent++; capLeft--;
      } else if (TRANSIENT.test(res.detail ?? "")) {
        await db.from("wa_broadcast_recipients").update({ status: "pending", claimed_at: null }).eq("id", r.id); // retry later
        return finish(`Paused automatically: ${res.detail}`);
      } else {
        await db.from("wa_broadcast_recipients").update({ status: "failed", error: (res.detail ?? "Send failed").slice(0, 300) }).eq("id", r.id);
        rep.failed++;
      }
      if (cfg.limits.gapMs) await sleep(cfg.limits.gapMs);
    }
  }
  return finish();
}

/** Cron entry: start due scheduled broadcasts and keep running ones moving. */
export async function runDueBroadcasts(now = new Date(), budgetMs = 25_000): Promise<{ broadcasts: number; sent: number; failed: number }> {
  const out = { broadcasts: 0, sent: 0, failed: 0 };
  try {
    const db = getDb();
    const { data } = await db.from("wa_broadcasts").select("id,status,scheduled_at").in("status", ["scheduled", "running"]).order("created_at").limit(10);
    const started = Date.now();
    for (const b of (data ?? []) as Row[]) {
      if (b.status === "scheduled" && (!b.scheduled_at || new Date(String(b.scheduled_at)) > now)) continue;
      const left = budgetMs - (Date.now() - started);
      if (left < 3000) break;
      const r = await runBroadcastBatch(String(b.id), left);
      out.broadcasts++; out.sent += r.sent; out.failed += r.failed;
    }
  } catch (err) { console.error("[wa-broadcast] runDueBroadcasts failed:", err); }
  return out;
}

/** Inbound message → mark the most recent broadcast message this person received (≤7 days) as replied. */
export async function markBroadcastReply(rawPhone: string): Promise<void> {
  try {
    const key = phoneKey(rawPhone);
    if (!key) return;
    const db = getDb();
    const { data } = await db.from("wa_broadcast_recipients").select("id").eq("phone_key", key).is("replied_at", null)
      .in("status", ["sent", "delivered", "read"]).gte("sent_at", new Date(Date.now() - 7 * 86_400_000).toISOString()).order("sent_at", { ascending: false }).limit(1);
    if (data?.[0]) await db.from("wa_broadcast_recipients").update({ replied_at: new Date().toISOString() }).eq("id", data[0].id);
  } catch (err) { console.error("[wa-broadcast] markBroadcastReply failed:", err); }
}
