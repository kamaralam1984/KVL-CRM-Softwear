"use server";
// WhatsApp Broadcast — server actions for the Broadcast tab (RBAC resource "automation", same as Comms Hub).

import { getDb } from "@/lib/db";
import { assertCan } from "@/lib/security/requireAction";
import {
  personalize, fillNumbered, normalizeContactPhone, resolveAudience, createBroadcast, setBroadcastStatus, retryFailed, runBroadcastBatch, sentInLast24h,
  type AudienceSpec, type BroadcastInput, type BatchReport,
} from "@/lib/whatsapp/broadcast";
import { loadWaConfig, waEnv } from "@/lib/whatsapp/config";
import { whatsappProvider } from "@/lib/messaging/whatsappProviders";
import { sendWhatsApp, sendWhatsAppMedia, sendWhatsAppTemplate } from "@/lib/messaging/send";

type Row = Record<string, unknown>;
const ok = (t: string | undefined, a: "read" | "create" | "update" | "delete") => assertCan(t, "automation", a);

export interface BroadcastSummary {
  id: string; name: string; mode: string; status: string; note: string; scheduled_at: string | null; created_at: string; total: number;
  counts: { pending: number; sent: number; delivered: number; read: number; replied: number; failed: number; skipped: number };
}
const emptyCounts = () => ({ pending: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, skipped: 0 });

export interface QrLive { state: string; me: string | null; sentToday: number; dailyCap: number; maxCap: number; warmup: boolean; linkedDays: number | null }

/** Live health of the QR service (null when not in QR mode / unreachable). Short timeout so the page never hangs. */
async function qrLive(env: NodeJS.ProcessEnv): Promise<QrLive | null> {
  const base = env.WHATSAPP_QR_URL, secret = env.WHATSAPP_QR_SECRET;
  if (!base || !secret) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/status`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(2500), cache: "no-store" });
    if (!res.ok) return { state: "unreachable", me: null, sentToday: 0, dailyCap: 0, maxCap: 0, warmup: false, linkedDays: null };
    const j = (await res.json()) as Partial<QrLive>;
    return { state: String(j.state ?? "unknown"), me: j.me ?? null, sentToday: Number(j.sentToday ?? 0), dailyCap: Number(j.dailyCap ?? 0), maxCap: Number(j.maxCap ?? j.dailyCap ?? 0), warmup: Boolean(j.warmup), linkedDays: j.linkedDays ?? null };
  } catch { return { state: "unreachable", me: null, sentToday: 0, dailyCap: 0, maxCap: 0, warmup: false, linkedDays: null }; }
}

export async function listBroadcasts(token?: string): Promise<{ items: BroadcastSummary[]; sentLast24h: number; dailyCap: number; provider: string; qr: QrLive | null }> {
  if (!(await ok(token, "read"))) return { items: [], sentLast24h: 0, dailyCap: 0, provider: "", qr: null };
  const db = getDb();
  const { data } = await db.from("wa_broadcasts").select("id,name,mode,status,note,scheduled_at,created_at,total").order("created_at", { ascending: false }).limit(30);
  const items: BroadcastSummary[] = ((data ?? []) as Row[]).map((b) => ({ ...(b as unknown as BroadcastSummary), counts: emptyCounts() }));
  if (items.length) {
    const { data: rec } = await db.from("wa_broadcast_recipients").select("broadcast_id,status,replied_at").in("broadcast_id", items.map((i) => i.id)).limit(100000);
    const by = new Map(items.map((i) => [i.id, i]));
    for (const r of (rec ?? []) as Row[]) {
      const it = by.get(String(r.broadcast_id)); if (!it) continue;
      const st = String(r.status) as keyof BroadcastSummary["counts"];
      if (st in it.counts) it.counts[st]++;
      if (r.replied_at) it.counts.replied++;
    }
  }
  const cfg = await loadWaConfig();
  const env = await waEnv();
  const provider = whatsappProvider(env);
  const qr = provider === "qr" ? await qrLive(env) : null;
  // The QR service enforces its own (lower, warm-up aware) daily cap — show the effective one.
  const dailyCap = qr?.dailyCap ? Math.min(cfg.limits.broadcastDailyCap || Infinity, qr.dailyCap) : cfg.limits.broadcastDailyCap;
  return { items, sentLast24h: await sentInLast24h(), dailyCap, provider, qr };
}

export async function getBroadcastRecipients(id: string, status?: string, token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  let q = getDb().from("wa_broadcast_recipients").select("id,phone,name,status,error,sent_at,delivered_at,read_at,replied_at").eq("broadcast_id", id);
  if (status === "replied") q = q.not("replied_at", "is", null);
  else if (status) q = q.eq("status", status);
  const { data } = await q.order("created_at").limit(500);
  return (data ?? []) as Row[];
}

export async function previewAudience(spec: AudienceSpec, token?: string): Promise<{ total: number; sendable: number; dnc: number; duplicates: number; invalid: string[]; sample: { name: string; phone: string }[] }> {
  if (!(await ok(token, "read"))) return { total: 0, sendable: 0, dnc: 0, duplicates: 0, invalid: [], sample: [] };
  const a = await resolveAudience(spec);
  return { total: a.contacts.length, sendable: a.sendable.length, dnc: a.dnc, duplicates: a.duplicates, invalid: a.invalid.slice(0, 20), sample: a.sendable.slice(0, 5).map((c) => ({ name: c.name, phone: c.phone })) };
}

/** Distinct values to build the audience filter chips. */
export async function getAudienceOptions(token?: string): Promise<{ stages: string[]; owners: string[]; tags: string[]; leads: { id: number; name: string; phone: string }[] }> {
  if (!(await ok(token, "read"))) return { stages: [], owners: [], tags: [], leads: [] };
  const { data } = await getDb().from("leads").select("id,name,phone,stage,owner,tags").order("created_at", { ascending: false }).limit(5000);
  const rows = (data ?? []) as Row[];
  const uniq = (xs: unknown[]) => [...new Set(xs.map(String).filter(Boolean))].sort();
  return {
    stages: uniq(rows.map((r) => r.stage)), owners: uniq(rows.map((r) => r.owner)),
    tags: uniq(rows.flatMap((r) => (r.tags as string[] | null) ?? [])),
    leads: rows.filter((r) => r.phone).slice(0, 500).map((r) => ({ id: Number(r.id), name: String(r.name ?? ""), phone: String(r.phone) })),
  };
}

export async function createWaBroadcast(input: BroadcastInput, startNow: boolean, token?: string): Promise<{ ok: boolean; id?: string; error?: string; total?: number; skipped?: number; status?: string }> {
  if (!(await ok(token, "create"))) return { ok: false, error: "Forbidden" };
  const r = await createBroadcast(input);
  if (!r.ok || !r.id) return r;
  if (startNow) { const s = await setBroadcastStatus(r.id, "start"); return { ...r, status: s.status }; }
  return { ...r, status: "draft" };
}

export async function controlBroadcast(id: string, action: "start" | "pause" | "resume" | "cancel" | "retry" | "delete", token?: string): Promise<{ ok: boolean; error?: string; status?: string; requeued?: number }> {
  if (!(await ok(token, action === "delete" ? "delete" : "update"))) return { ok: false, error: "Forbidden" };
  if (action === "retry") return retryFailed(id);
  if (action === "delete") {
    const { data: b } = await getDb().from("wa_broadcasts").select("status").eq("id", id).maybeSingle();
    if (b?.status === "running") return { ok: false, error: "Pause or cancel it before deleting." };
    await getDb().from("wa_broadcasts").delete().eq("id", id);
    return { ok: true };
  }
  return setBroadcastStatus(id, action);
}

/** One batch (~20 s) — the Broadcast tab calls this in a loop while a broadcast runs; the cron does the same when no one is watching. */
export async function runBroadcastNow(id: string, token?: string): Promise<BatchReport | null> {
  if (!(await ok(token, "update"))) return null;
  return runBroadcastBatch(id, 20_000);
}

/** Sends the composed message to ONE number so you can see exactly what clients will get. */
export async function sendBroadcastTest(input: Pick<BroadcastInput, "mode" | "body" | "mediaUrl" | "templateName" | "templateLang" | "templateParams" | "optOutFooter">, phone: string, token?: string): Promise<{ ok: boolean; detail: string }> {
  if (!(await ok(token, "create"))) return { ok: false, detail: "Forbidden" };
  const cfg = await loadWaConfig();
  const to = normalizeContactPhone(phone, cfg.limits.defaultCountryCode);
  if (!to) return { ok: false, detail: "Enter a valid phone number." };
  const vars = { name: "Test Contact", firstName: "Test", company: "Your Company", phone: to };
  const opts = { bypassSuppression: true };
  const r = input.mode === "template"
    ? await (() => { const params = (input.templateParams ?? []).map((p) => personalize(p, vars)); return sendWhatsAppTemplate(to, { metaName: input.templateName ?? "", language: input.templateLang || "en", params, fallbackBody: fillNumbered(input.body, params) }, opts); })()
    : input.mode === "media" ? await sendWhatsAppMedia(to, input.mediaUrl ?? "", personalize(input.body, vars), opts)
    : await sendWhatsApp(to, personalize(input.body, vars) + (input.optOutFooter ? "\n\nReply STOP to opt out." : ""), opts);
  return r.ok ? { ok: true, detail: r.mock ? "Logged only — provider not configured." : "Test sent." } : { ok: false, detail: r.detail ?? "Send failed" };
}
