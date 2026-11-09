"use server";
// Communication Hub — server actions for components/crm/sections/CommsHub.tsx.
// Thin, RBAC-gated wrappers (resource "automation") over the engines in lib/{compliance,comms,followup,reminders,telephony,notify}.
// Soft-mode token handling matches the rest of the codebase (see lib/security/requireAction.ts).

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { addSuppression, removeSuppression } from "@/lib/compliance/dnc";
import { getCommsSettings, saveCommsSetting, type CommsSettings } from "@/lib/comms/settings";
import { sendWhatsApp, sendWhatsAppMedia, sendWhatsAppTemplate, sendSms, sendEmail } from "@/lib/messaging/send";
import { logOutboundMessage } from "@/lib/messaging/outbound";
import { handleHumanReply } from "@/lib/followup/engine";
import { DEFAULT_SEQUENCE, type SequenceStep } from "@/lib/followup/sequence";
import { createReminder } from "@/lib/reminders/engine";
import { startClickToCall, type StartCallResult } from "@/lib/telephony/dialer";
import { logCallOutcome } from "@/lib/telephony/outcomes";
import type { CallOutcome } from "@/lib/telephony/outcomeTypes";
import { normalizePhone } from "@/lib/identity/resolve";

type Row = Record<string, unknown>;
const ok = async (t: string | undefined, a: "read" | "create" | "update" | "delete") => assertCan(t, "automation", a);
const fail = (...args: unknown[]) => console.error("[comms]", ...args);

// ── Notifications (bell) ─────────────────────────────────────────────────────
export async function getNotifications(token?: string): Promise<{ items: Row[]; unread: number }> {
  if (!(await ok(token, "read"))) return { items: [], unread: 0 };
  try {
    const { data } = await getServerClient().from("notifications").select("*").order("created_at", { ascending: false }).limit(40);
    const items = (data ?? []) as Row[];
    return { items, unread: items.filter((i) => !i.read).length };
  } catch (e) { fail(e); return { items: [], unread: 0 }; }
}
export async function markNotificationsRead(token?: string): Promise<void> {
  if (!(await ok(token, "update"))) return;
  try { await getServerClient().from("notifications").update({ read: true }).eq("read", false); } catch (e) { fail(e); }
}

// ── Do-Not-Contact ───────────────────────────────────────────────────────────
export async function listSuppressions(token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try { const { data } = await getServerClient().from("suppressions").select("*").order("created_at", { ascending: false }).limit(300); return (data ?? []) as Row[]; } catch (e) { fail(e); return []; }
}
export async function addDnc(contact: { phone?: string; email?: string }, reason: string, token?: string): Promise<boolean> {
  if (!(await ok(token, "create"))) return false;
  await addSuppression(contact, { reason, source: "manual" }); return true;
}
export async function removeDnc(contact: { phone?: string; email?: string }, token?: string): Promise<boolean> {
  if (!(await ok(token, "delete"))) return false;
  await removeSuppression(contact); return true;
}

// ── Templates & quick replies ────────────────────────────────────────────────
export type TemplateInput = { id?: string; kind: "whatsapp" | "email" | "quick_reply"; name: string; subject?: string; body: string; meta_name?: string; language?: string; approved?: boolean };
export async function listTemplates(kind?: string, token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try { let q = getServerClient().from("message_templates").select("*").order("name"); if (kind) q = q.eq("kind", kind); const { data } = await q; return (data ?? []) as Row[]; } catch (e) { fail(e); return []; }
}
export async function saveTemplate(t: TemplateInput, token?: string): Promise<boolean> {
  if (!(await ok(token, t.id ? "update" : "create"))) return false;
  try {
    const row = { kind: t.kind, name: t.name.trim(), subject: t.subject ?? "", body: t.body, meta_name: t.meta_name ?? "", language: t.language ?? "en", approved: Boolean(t.approved), updated_at: new Date().toISOString() };
    const db = getServerClient();
    const { error } = t.id ? await db.from("message_templates").update(row).eq("id", t.id) : await db.from("message_templates").insert(row);
    return !error;
  } catch (e) { fail(e); return false; }
}
export async function deleteTemplate(id: string, token?: string): Promise<boolean> {
  if (!(await ok(token, "delete"))) return false;
  try { await getServerClient().from("message_templates").delete().eq("id", id); return true; } catch (e) { fail(e); return false; }
}

// ── Settings ─────────────────────────────────────────────────────────────────
export async function loadCommsSettings(token?: string): Promise<CommsSettings | null> { return (await ok(token, "read")) ? getCommsSettings() : null; }
export async function saveCommsSettings(patch: Partial<CommsSettings>, token?: string): Promise<boolean> {
  if (!(await ok(token, "update"))) return false;
  let all = true;
  for (const [k, v] of Object.entries(patch)) all = (await saveCommsSetting(k as keyof CommsSettings, v as never)) && all;
  return all;
}

// ── Unified inbox (WhatsApp/SMS/webchat) ─────────────────────────────────────
export async function getInbox(token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try { const { data } = await getServerClient().from("conversations").select("*").order("last_message_at", { ascending: false }).limit(100); return (data ?? []) as Row[]; } catch (e) { fail(e); return []; }
}
export async function getThread(conversationId: string, token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try {
    const db = getServerClient();
    await db.from("conversations").update({ unread_count: 0 }).eq("id", conversationId);
    const { data } = await db.from("messages").select("*").eq("conversation_id", conversationId).order("created_at"); return (data ?? []) as Row[];
  } catch (e) { fail(e); return []; }
}
export async function assignConversationTo(conversationId: string, assignee: string, token?: string): Promise<boolean> {
  if (!(await ok(token, "update"))) return false;
  try { await getServerClient().from("conversations").update({ assigned_to: assignee }).eq("id", conversationId); return true; } catch (e) { fail(e); return false; }
}
export async function listTeamNames(token?: string): Promise<string[]> {
  if (!(await ok(token, "read"))) return [];
  try { const { data } = await getServerClient().from("team_members").select("name").order("name"); return (data ?? []).map((t) => t.name as string); } catch { return []; }
}

/** A HUMAN reply from the hub: text, media (image/PDF URL) or an approved WhatsApp template. Clears the 24h clock. */
export async function sendHumanMessage(p: {
  conversationId: string; channel: "whatsapp" | "sms"; phone: string; body: string; mediaUrl?: string;
  template?: { metaName: string; language: string; params: string[] };
}, token?: string): Promise<{ ok: boolean; detail?: string }> {
  if (!(await ok(token, "create"))) return { ok: false, detail: "Forbidden" };
  const r = p.channel === "sms" ? await sendSms(p.phone, p.body)
    : p.template ? await sendWhatsAppTemplate(p.phone, { ...p.template, fallbackBody: p.body })
    : p.mediaUrl ? await sendWhatsAppMedia(p.phone, p.mediaUrl, p.body)
    : await sendWhatsApp(p.phone, p.body);
  if (!r.ok) return { ok: false, detail: r.detail };
  await logOutboundMessage({ channel: p.channel, phone: p.phone, body: p.mediaUrl ? `${p.body}\n[media] ${p.mediaUrl}`.trim() : p.body, sentBy: "human", providerId: r.providerMessageId, mock: r.mock });
  await handleHumanReply({ phone: p.phone });
  return { ok: true, detail: r.mock ? "Logged (provider not configured)" : "Sent" };
}

// ── Email inbox ──────────────────────────────────────────────────────────────
export async function getEmailThreads(token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try {
    const { data } = await getServerClient().from("email_log").select("id,thread_key,direction,subject,body,status,opens,clicks,lead_id,created_at").order("created_at", { ascending: false }).limit(400);
    const seen = new Map<string, Row & { count: number }>();
    for (const r of (data ?? []) as Row[]) { const k = String(r.thread_key); const cur = seen.get(k); if (cur) cur.count++; else seen.set(k, { ...r, count: 1 }); }
    return [...seen.values()];
  } catch (e) { fail(e); return []; }
}
export async function getEmailThread(threadKey: string, token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try { const { data } = await getServerClient().from("email_log").select("*").eq("thread_key", threadKey).order("created_at"); return (data ?? []) as Row[]; } catch (e) { fail(e); return []; }
}
export async function sendEmailReply(to: string, subject: string, body: string, token?: string): Promise<{ ok: boolean; detail?: string }> {
  if (!(await ok(token, "create"))) return { ok: false, detail: "Forbidden" };
  const r = await sendEmail(to, subject, body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>"), { sentBy: "human", transactional: true });
  if (r.ok) await handleHumanReply({ email: to });
  return { ok: r.ok, detail: r.suppressed ? "This contact opted out of email" : r.detail };
}

// ── Calls ────────────────────────────────────────────────────────────────────
export async function getRecentCalls(token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try { const { data } = await getServerClient().from("call_logs").select("*, leads(name,company)").order("created_at", { ascending: false }).limit(60); return (data ?? []) as Row[]; } catch (e) { fail(e); return []; }
}
export async function searchLeadsForCall(q: string, token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try { const { data } = await getServerClient().from("leads").select("id,name,company,phone,owner").or(`name.ilike.%${q.replace(/[%,]/g, "")}%,company.ilike.%${q.replace(/[%,]/g, "")}%`).limit(8); return (data ?? []) as Row[]; } catch { return []; }
}
export async function placeCall(leadId: number, agentPhone: string, agent: string, token?: string): Promise<StartCallResult> {
  if (!(await ok(token, "create"))) return { ok: false, mode: "manual", detail: "Forbidden" };
  return startClickToCall({ leadId, agentPhone, agent });
}
export async function submitCallOutcome(p: { leadId: number; outcome: CallOutcome; notes?: string; callbackAtIso?: string; callLogId?: string; agent?: string }, token?: string): Promise<{ ok: boolean; action: string }> {
  if (!(await ok(token, "create"))) return { ok: false, action: "Forbidden" };
  return logCallOutcome({ leadId: p.leadId, outcome: p.outcome, notes: p.notes, callbackAt: p.callbackAtIso ? new Date(p.callbackAtIso) : null, callLogId: p.callLogId, agent: p.agent });
}
/** Returns the recording as a data URL (Twilio recordings need auth, so the browser can't fetch them directly). */
export async function getCallRecording(callLogId: string, token?: string): Promise<{ ok: boolean; dataUrl?: string; detail?: string }> {
  if (!(await ok(token, "read"))) return { ok: false, detail: "Forbidden" };
  try {
    const { data } = await getServerClient().from("call_logs").select("recording_url").eq("id", callLogId).maybeSingle();
    const url = String(data?.recording_url ?? "");
    if (!url) return { ok: false, detail: "No recording for this call" };
    const sid = process.env.TWILIO_ACCOUNT_SID, auth = process.env.TWILIO_AUTH_TOKEN;
    const res = await fetch(/\.(mp3|wav)$/.test(url) ? url : `${url}.mp3`, sid && auth && url.includes("twilio.com") ? { headers: { Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}` } } : undefined);
    if (!res.ok) return { ok: false, detail: `Recording fetch failed (${res.status})` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8_000_000) return { ok: false, detail: "Recording too large to preview — open it in Twilio" };
    return { ok: true, dataUrl: `data:audio/mpeg;base64,${buf.toString("base64")}` };
  } catch (e) { fail(e); return { ok: false, detail: "Could not load recording" }; }
}

// ── Reminders ────────────────────────────────────────────────────────────────
export async function listReminders(token?: string): Promise<Row[]> {
  if (!(await ok(token, "read"))) return [];
  try { const { data } = await getServerClient().from("reminders").select("*").order("remind_at", { ascending: false }).limit(120); return (data ?? []) as Row[]; } catch (e) { fail(e); return []; }
}
export async function addReminder(p: { title: string; body?: string; atIso: string; audience: "team" | "client"; assignee?: string; phone?: string; email?: string }, token?: string): Promise<boolean> {
  if (!(await ok(token, "create"))) return false;
  return Boolean(await createReminder({ kind: "custom", audience: p.audience, assignee: p.assignee, toPhone: p.phone ? normalizePhone(p.phone) : "", toEmail: p.email, title: p.title, body: p.body, remindAt: new Date(p.atIso) }));
}
export async function cancelReminder(id: string, token?: string): Promise<boolean> {
  if (!(await ok(token, "update"))) return false;
  try { await getServerClient().from("reminders").update({ status: "cancelled" }).eq("id", id).eq("status", "pending"); return true; } catch (e) { fail(e); return false; }
}

// ── Follow-up sequence editor ────────────────────────────────────────────────
export async function loadSequence(token?: string): Promise<{ name: string; steps: SequenceStep[]; durationDays: number; custom: boolean } | null> {
  if (!(await ok(token, "read"))) return null;
  try {
    const { data } = await getServerClient().from("followup_sequences").select("*").eq("is_default", true).maybeSingle();
    if (data?.steps?.length) return { name: data.name as string, steps: data.steps as SequenceStep[], durationDays: data.duration_days as number, custom: true };
  } catch (e) { fail(e); }
  return { name: DEFAULT_SEQUENCE.name, steps: DEFAULT_SEQUENCE.steps, durationDays: DEFAULT_SEQUENCE.durationDays, custom: false };
}
/** Saves the default sequence. Applies to NEW enrollments only — in-flight leads keep their own snapshot. */
export async function saveSequence(steps: SequenceStep[], token?: string): Promise<{ ok: boolean; detail?: string }> {
  if (!(await ok(token, "update"))) return { ok: false, detail: "Forbidden" };
  const clean = steps.filter((s) => s.body.trim()).map((s) => ({ ...s, atHours: Math.max(0, Math.round(Number(s.atHours) || 0)) })).sort((a, b) => a.atHours - b.atHours);
  if (!clean.length) return { ok: false, detail: "Add at least one step" };
  try {
    const durationDays = Math.max(1, Math.ceil(clean[clean.length - 1].atHours / 24));
    const { error } = await getServerClient().from("followup_sequences").upsert({ key: "custom-default", name: "Custom sequence", steps: clean, duration_days: durationDays, is_default: true, updated_at: new Date().toISOString() }, { onConflict: "key" });
    return { ok: !error, detail: error?.message };
  } catch (e) { fail(e); return { ok: false, detail: String(e) }; }
}
export async function resetSequence(token?: string): Promise<boolean> {
  if (!(await ok(token, "update"))) return false;
  try { await getServerClient().from("followup_sequences").delete().eq("key", "custom-default"); return true; } catch { return false; }
}

// ── Reports ──────────────────────────────────────────────────────────────────
export interface CommsReport {
  funnel: { enrolled: number; active: number; replied: number; paymentReady: number; won: number; stopped: number; completed: number; replyRate: number; conversionRate: number };
  steps: { step: number; channel: string; sent: number; replies: number; replyRate: number }[];
  messages: { total: number; delivered: number; read: number; failed: number; mock: number };
  email: { sent: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number };
  calls: { total: number; byOutcome: Record<string, number> };
  dncCount: number;
}
export async function getCommsReport(token?: string): Promise<CommsReport | null> {
  if (!(await ok(token, "read"))) return null;
  try {
    const db = getServerClient();
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const [{ data: enr }, { data: ev }, { data: msgs }, { data: mails }, { data: calls }, { count: dnc }] = await Promise.all([
      db.from("followup_enrollments").select("id,status").limit(5000),
      db.from("followup_events").select("enrollment_id,kind,channel,detail,created_at").in("kind", ["step_sent", "call_task", "inbound_reply"]).gte("created_at", since).order("created_at").limit(20000),
      db.from("messages").select("status").eq("direction", "outbound").gte("created_at", since).limit(20000),
      db.from("email_log").select("status,opens,clicks").eq("direction", "outbound").gte("created_at", since).limit(20000),
      db.from("call_logs").select("outcome").gte("created_at", since).limit(5000),
      db.from("suppressions").select("id", { count: "exact", head: true }),
    ]);
    const e = (enr ?? []) as Row[];
    const by = (s: string) => e.filter((x) => x.status === s).length;
    const replied = new Set((ev ?? []).filter((x) => x.kind === "inbound_reply").map((x) => x.enrollment_id)).size;
    const enrolled = e.length;

    // Per step: replies that arrived after the step was sent (and before the next one), attributed to the latest step.
    const stepStats = new Map<number, { channel: string; sent: number; replies: number }>();
    const lastStep = new Map<string, number>();
    for (const x of (ev ?? []) as Row[]) {
      if (x.kind === "inbound_reply") { const s = lastStep.get(x.enrollment_id as string); if (s) stepStats.get(s)!.replies++; continue; }
      const m = String(x.detail ?? "").match(/Step (\d+)\//); if (!m) continue;
      const n = Number(m[1]); const cur = stepStats.get(n) ?? { channel: String(x.channel), sent: 0, replies: 0 };
      cur.sent++; stepStats.set(n, cur); lastStep.set(x.enrollment_id as string, n);
    }
    const cnt = (arr: Row[] | null, f: (r: Row) => boolean) => (arr ?? []).filter(f).length;
    const byOutcome: Record<string, number> = {};
    for (const c of (calls ?? []) as Row[]) if (c.outcome) byOutcome[String(c.outcome)] = (byOutcome[String(c.outcome)] ?? 0) + 1;

    return {
      funnel: { enrolled, active: by("active"), replied, paymentReady: by("payment_ready"), won: by("won"), stopped: by("stopped"), completed: by("completed"), replyRate: enrolled ? Math.round((replied / enrolled) * 100) : 0, conversionRate: enrolled ? Math.round(((by("won") + by("payment_ready")) / enrolled) * 100) : 0 },
      steps: [...stepStats.entries()].sort((a, b) => a[0] - b[0]).map(([step, v]) => ({ step, channel: v.channel, sent: v.sent, replies: v.replies, replyRate: v.sent ? Math.round((v.replies / v.sent) * 100) : 0 })),
      messages: { total: (msgs ?? []).length, delivered: cnt(msgs as Row[], (m) => m.status === "delivered"), read: cnt(msgs as Row[], (m) => m.status === "read"), failed: cnt(msgs as Row[], (m) => m.status === "failed"), mock: cnt(msgs as Row[], (m) => m.status === "mock") },
      email: { sent: (mails ?? []).length, delivered: cnt(mails as Row[], (m) => m.status === "delivered"), opened: cnt(mails as Row[], (m) => Number(m.opens) > 0), clicked: cnt(mails as Row[], (m) => Number(m.clicks) > 0), bounced: cnt(mails as Row[], (m) => m.status === "bounced"), complained: cnt(mails as Row[], (m) => m.status === "complained") },
      calls: { total: (calls ?? []).length, byOutcome },
      dncCount: dnc ?? 0,
    };
  } catch (e) { fail(e); return null; }
}
