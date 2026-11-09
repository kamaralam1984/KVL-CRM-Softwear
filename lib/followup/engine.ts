// Follow-up Engine — server-side orchestration. Never throws: every public
// function catches and logs, so a follow-up failure can never break the
// lead-create / webhook / payment flow that triggers it.
//
// Lifecycle of an enrollment:
//   active ──client replies──▶ replied_waiting ──human replies──▶ active (resumes after 72h)
//      │                              │ no human reply in 24h → AI soft nudge (WhatsApp + email)
//      ├─ "ready to pay" reply / payment / deal closed ─▶ payment_ready / won  (drip stops)
//      ├─ STOP / not interested / DNC ─▶ stopped
//      └─ 90 days over ─▶ completed (+ human task to decide)

import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { sendWhatsApp, sendWhatsAppTemplate, sendSms, sendEmail, isWhatsAppConfigured, isSmsConfigured } from "@/lib/messaging/send";
import { logOutboundMessage } from "@/lib/messaging/outbound";
import { initiateCall } from "@/lib/voice";
import { dropRinglessVoicemail } from "@/lib/telephony/ringlessVoicemail";
import { normalizePhone } from "@/lib/identity/resolve";
import { isSuppressed, addSuppression } from "@/lib/compliance/dnc";
import { notifyTeam } from "@/lib/notify/team";
import { getCommsSettings } from "@/lib/comms/settings";
import { createRazorpayPaymentLink, isRazorpayApiConfigured } from "@/lib/payments/razorpay";
import {
  DEFAULT_SEQUENCE, DEFAULT_SEQUENCE_KEY, TERMINAL_STATUSES, RESUME_AFTER_HUMAN_REPLY_HOURS,
  MAX_AI_NUDGES_PER_REPLY, adjustForQuietHours, buildCtx, classifyInbound, fallbackNudge,
  needsAiNudge, renderTemplate, stepDueAt, templateParams, tzOffsetForPhone,
  type EnrollmentStatus, type SequenceStep, type TemplateCtx,
} from "./sequence";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? process.env.BRAND_NAME ?? "KVL Business Solutions";
const STALE_STEP_MS = 48 * 3_600_000; // overdue by more than this → skipped, not sent in a burst
const BATCH = 50;
const MAX_ATTEMPTS = 3;
const NUDGE_MODEL = "claude-sonnet-4-6";

export interface EnrollmentRow {
  id: string;
  lead_id: number;
  sequence_key: string;
  status: EnrollmentStatus;
  step_index: number;
  attempts: number;
  next_run_at: string | null;
  started_at: string;
  ends_at: string | null;
  last_inbound_at: string | null;
  last_human_reply_at: string | null;
  last_ai_nudge_at: string | null;
  ai_nudge_count: number;
  stop_reason: string | null;
  steps: SequenceStep[] | null;
  tz_offset_min: number;
}

interface LeadRow { id: number; name: string | null; company: string | null; email: string | null; phone: string | null; owner: string | null; tags?: string[] | null }
type EnrollmentWithLead = EnrollmentRow & { leads: LeadRow | null };
const LEAD_COLS = "leads(id,name,company,email,phone,owner,tags)";

const stepsOf = (e: EnrollmentRow): SequenceStep[] => (e.steps?.length ? e.steps : DEFAULT_SEQUENCE.steps);

function log(where: string, err: unknown) {
  console.error(`[followup] ${where} failed:`, err);
}

async function event(enrollmentId: string, kind: string, channel = "", ok = true, detail = "") {
  try {
    await getDb().from("followup_events").insert({ enrollment_id: enrollmentId, kind, channel, ok, detail: detail.slice(0, 500) });
  } catch (err) { log("event", err); }
}

async function humanTask(title: string, lead: LeadRow | null, priority: "high" | "medium", tag: string) {
  try {
    await getDb().from("tasks").insert({
      title, priority, due: "Today", assignee: lead?.owner || "Unassigned", status: "pending",
      tags: ["Automation", "Follow-up Engine", tag], company: lead?.company || lead?.name || "",
    });
  } catch (err) { log("humanTask", err); }
}

// ── Sequences (editable, per-lead snapshot) ──────────────────────────────────

/** Picks the sequence for a lead: a source-matched custom one, else the default (DB override or built-in). */
export async function resolveSequence(lead: { tags?: string[] | null }): Promise<{ key: string; steps: SequenceStep[]; durationDays: number }> {
  try {
    const { data } = await getDb().from("followup_sequences").select("*");
    const rows = (data ?? []) as { key: string; steps: SequenceStep[]; duration_days: number; is_default: boolean; match_source: string | null }[];
    const tags = (lead.tags ?? []).map((t) => t.toLowerCase());
    const hit = rows.find((r) => r.match_source && tags.some((t) => t.includes(r.match_source!.toLowerCase()))) ?? rows.find((r) => r.is_default);
    if (hit?.steps?.length) return { key: hit.key, steps: hit.steps, durationDays: hit.duration_days || 90 };
  } catch (err) { log("resolveSequence (using built-in)", err); }
  return { key: DEFAULT_SEQUENCE_KEY, steps: DEFAULT_SEQUENCE.steps, durationDays: DEFAULT_SEQUENCE.durationDays };
}

// ── Enrollment ───────────────────────────────────────────────────────────────

/** Idempotent — enrolling an already-enrolled lead is a no-op. */
export async function enrollLead(leadId: number): Promise<{ ok: boolean; enrollmentId?: string }> {
  try {
    const db = getDb();
    const { data: lead } = await db.from("leads").select("id,phone,tags").eq("id", leadId).maybeSingle();
    const seq = await resolveSequence({ tags: (lead?.tags as string[] | null) ?? [] });
    const tz = tzOffsetForPhone(lead?.phone as string | null);
    const startedAt = new Date();
    const { data, error } = await db.from("followup_enrollments").upsert({
      lead_id: leadId,
      sequence_key: seq.key,
      status: "active",
      step_index: 0,
      steps: seq.steps,
      tz_offset_min: tz,
      started_at: startedAt.toISOString(),
      next_run_at: stepDueAt(startedAt, seq.steps[0], tz).toISOString(),
      ends_at: new Date(startedAt.getTime() + seq.durationDays * 86_400_000).toISOString(),
    }, { onConflict: "lead_id,sequence_key", ignoreDuplicates: true }).select("id").maybeSingle();
    if (error) { log("enrollLead", error.message); return { ok: false }; }
    if (data?.id) await event(data.id, "enrolled", "", true, `${seq.key} — ${seq.steps.length} touches over ${seq.durationDays} days`);
    return { ok: true, enrollmentId: data?.id };
  } catch (err) { log("enrollLead", err); return { ok: false }; }
}

async function getLiveEnrollments(leadIds: number[]): Promise<EnrollmentWithLead[]> {
  if (!leadIds.length) return [];
  const { data } = await getDb()
    .from("followup_enrollments")
    .select(`*, ${LEAD_COLS}`)
    .in("lead_id", leadIds)
    .not("status", "in", "(won,completed,stopped,payment_ready)");
  return (data ?? []) as unknown as EnrollmentWithLead[];
}

/** Resolve a phone/email to lead ids. Phone is compared on its last 10 digits. */
export async function findLeadIds(contact: { phone?: string; email?: string; leadId?: number }): Promise<number[]> {
  try {
    if (contact.leadId) return [contact.leadId];
    const db = getDb();
    const ids = new Set<number>();
    if (contact.phone) {
      const want = normalizePhone(contact.phone).replace(/\D/g, "").slice(-10);
      if (want.length >= 7) {
        const { data } = await db.from("leads").select("id,phone").ilike("phone", `%${want.slice(-5)}%`);
        for (const l of data ?? []) {
          if (String(l.phone ?? "").replace(/\D/g, "").slice(-10) === want) ids.add(l.id as number);
        }
      }
    }
    if (contact.email) {
      const { data } = await db.from("leads").select("id").ilike("email", contact.email.trim());
      for (const l of data ?? []) ids.add(l.id as number);
    }
    return [...ids];
  } catch (err) { log("findLeadIds", err); return []; }
}

// ── State transitions ────────────────────────────────────────────────────────

async function setStatus(e: EnrollmentRow, status: EnrollmentStatus, reason: string, patch: Record<string, unknown> = {}) {
  await getDb().from("followup_enrollments").update({ status, stop_reason: reason, next_run_at: TERMINAL_STATUSES.includes(status) ? null : e.next_run_at, ...patch }).eq("id", e.id);
}

/** When the client says they're ready to pay: send the payment link instantly (dynamic Razorpay link if the lead has a value, else the saved static link). */
async function autoSendPaymentLink(lead: LeadRow, enrollmentId: string): Promise<void> {
  try {
    const s = await getCommsSettings();
    let link = s.links.paymentLink;
    const { data: row } = await getDb().from("leads").select("value").eq("id", lead.id).maybeSingle();
    const value = Number(row?.value ?? 0);
    if (value > 0 && isRazorpayApiConfigured()) {
      const r = await createRazorpayPaymentLink(Math.round(value * 100), `${BRAND} — ${lead.company || lead.name}`, { name: lead.name ?? "", email: lead.email ?? "", contact: lead.phone ?? "" });
      if (r.ok && !r.mock && r.shortUrl) link = r.shortUrl;
    }
    if (!link) return;
    const ctx = buildCtx(lead, BRAND, { paymentLink: link });
    const text = `Great, ${ctx.firstName}! Here is your secure payment link: ${link}\nReply here if you need any help. — ${ctx.owner}, ${BRAND}`;
    const d = await sendText(lead, text, `Your payment link — ${BRAND}`, "whatsapp", "automation");
    await event(enrollmentId, "step_sent", d.channel, d.ok, `Auto payment link: ${d.detail}`);
  } catch (err) { log("autoSendPaymentLink", err); }
}

/** Client replied on any channel. Pauses the drip until a human answers. */
export async function handleInboundReply(
  contact: { phone?: string; email?: string; leadId?: number },
  text: string,
  via = "message",
): Promise<{ intent: string; affected: number; leadOwner?: string }> {
  try {
    const intent = classifyInbound(text);
    const leadIds = await findLeadIds(contact);
    const enrollments = await getLiveEnrollments(leadIds);
    const nowIso = new Date().toISOString();

    // Instant team alert — even when the lead has no live enrollment.
    let owner: string | undefined = enrollments[0]?.leads?.owner || undefined;
    if (leadIds.length && !enrollments.length) {
      const { data } = await getDb().from("leads").select("id,name,company,owner").eq("id", leadIds[0]).maybeSingle();
      owner = (data?.owner as string) || undefined;
      if (intent !== "optout") await notifyTeam({ kind: "reply", leadId: leadIds[0], priority: intent === "payment_intent" ? "high" : "normal", title: `${via} reply from ${data?.company || data?.name || "a lead"}`, body: text.slice(0, 200) });
    }

    for (const e of enrollments) {
      const who = e.leads?.company || e.leads?.name || "a lead";
      if (intent === "optout") {
        await setStatus(e, "stopped", "Client opted out", {});
        await event(e.id, "stopped", "", true, `Opt-out: "${text.slice(0, 80)}"`);
        await addSuppression({ phone: e.leads?.phone, email: e.leads?.email }, { reason: text.slice(0, 80), source: "inbound_stop" });
      } else if (intent === "payment_intent") {
        await setStatus(e, "payment_ready", "Client signalled intent to pay", { last_inbound_at: nowIso });
        await event(e.id, "payment_ready", "", true, `Intent: "${text.slice(0, 80)}"`);
        await humanTask(`💰 Send payment link NOW — ${who} is ready to pay`, e.leads, "high", "Payment Ready");
        await notifyTeam({ kind: "payment_ready", leadId: e.lead_id, priority: "high", title: `💰 ${who} is ready to pay`, body: text.slice(0, 200) });
        if (e.leads) await autoSendPaymentLink(e.leads, e.id);
      } else {
        await setStatus(e, "replied_waiting", "", { last_inbound_at: nowIso, ai_nudge_count: 0, last_ai_nudge_at: null });
        await event(e.id, "inbound_reply", "", true, text.slice(0, 120));
        await notifyTeam({ kind: "reply", leadId: e.lead_id, priority: "normal", title: `${via} reply from ${who}`, body: text.slice(0, 200) });
      }
    }
    return { intent, affected: enrollments.length, leadOwner: owner };
  } catch (err) { log("handleInboundReply", err); return { intent: "normal", affected: 0 }; }
}

/** A human answered the client — clear the 24h clock and resume the drip later. */
export async function handleHumanReply(contact: { phone?: string; email?: string; leadId?: number }): Promise<void> {
  try {
    const enrollments = await getLiveEnrollments(await findLeadIds(contact));
    const now = new Date();
    for (const e of enrollments) {
      await setStatus(e, "active", "", {
        last_human_reply_at: now.toISOString(),
        next_run_at: adjustForQuietHours(new Date(now.getTime() + RESUME_AFTER_HUMAN_REPLY_HOURS * 3_600_000), e.tz_offset_min).toISOString(),
      });
      await event(e.id, "human_reply", "", true, "Team replied — drip resumes in 72h");
    }
  } catch (err) { log("handleHumanReply", err); }
}

/** Payment received / deal closed / manual stop. Works on ANY non-final status. */
export async function endFollowUp(leadId: number, status: "won" | "payment_ready" | "stopped", reason: string): Promise<void> {
  try {
    const db = getDb();
    const { data } = await db.from("followup_enrollments").select("*").eq("lead_id", leadId).not("status", "in", "(won,completed,stopped)");
    for (const e of (data ?? []) as EnrollmentRow[]) {
      await setStatus(e, status, reason);
      await event(e.id, status === "won" ? "completed" : status, "", true, reason);
    }
  } catch (err) { log("endFollowUp", err); }
}

/** Same as endFollowUp, but resolves the lead from a payer's phone/email (payment webhooks). */
export async function endFollowUpByContact(contact: { phone?: string; email?: string }, status: "won" | "payment_ready" | "stopped", reason: string): Promise<void> {
  for (const id of await findLeadIds(contact)) await endFollowUp(id, status, reason);
}

export async function setPaused(enrollmentId: string, paused: boolean): Promise<void> {
  try {
    const db = getDb();
    await db.from("followup_enrollments").update(paused
      ? { status: "paused" }
      : { status: "active", next_run_at: new Date().toISOString() }).eq("id", enrollmentId);
    await event(enrollmentId, paused ? "stopped" : "enrolled", "", true, paused ? "Paused manually" : "Resumed manually");
  } catch (err) { log("setPaused", err); }
}

/** Pull the next scheduled touch forward/back (used by call outcomes: "not picked → WhatsApp now"). */
export async function scheduleNextTouch(leadId: number, at: Date): Promise<void> {
  try {
    await getDb().from("followup_enrollments").update({ next_run_at: at.toISOString() }).eq("lead_id", leadId).eq("status", "active");
  } catch (err) { log("scheduleNextTouch", err); }
}

// ── Delivery ─────────────────────────────────────────────────────────────────

const toHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");

export interface Delivery { ok: boolean; channel: string; detail: string; mock?: boolean; suppressed?: boolean }

export async function sendText(lead: LeadRow, text: string, subject: string, prefer: "whatsapp" | "email", sentBy: string, waTemplate?: { metaName: string; language: string; params: string[] }): Promise<Delivery> {
  const phone = lead.phone ? normalizePhone(lead.phone) : "";
  let suppressedHits = 0;
  const tryWa = async (): Promise<Delivery | null> => {
    if (!phone) return null;
    if (isWhatsAppConfigured() || !isSmsConfigured()) {
      const r = waTemplate
        ? await sendWhatsAppTemplate(phone, { ...waTemplate, fallbackBody: text })
        : await sendWhatsApp(phone, text);
      if (r.suppressed) { suppressedHits++; return null; }
      if (r.ok) { await logOutboundMessage({ channel: "whatsapp", phone, name: lead.name ?? "", body: text, sentBy, providerId: r.providerMessageId, mock: r.mock }); return { ok: true, channel: "whatsapp", mock: r.mock, detail: r.mock ? "mock (provider not configured)" : "sent" }; }
    }
    if (isSmsConfigured()) {
      const r = await sendSms(phone, text);
      if (r.suppressed) { suppressedHits++; return null; }
      if (r.ok) { await logOutboundMessage({ channel: "sms", phone, name: lead.name ?? "", body: text, sentBy, providerId: r.providerMessageId, mock: r.mock }); return { ok: true, channel: "sms", mock: r.mock, detail: r.mock ? "mock" : "sent (WhatsApp fallback)" }; }
    }
    return null;
  };
  const tryEmail = async (): Promise<Delivery | null> => {
    if (!lead.email) return null;
    const r = await sendEmail(lead.email, subject, toHtml(text), { leadId: lead.id, sentBy });
    if (r.suppressed) { suppressedHits++; return null; }
    return r.ok ? { ok: true, channel: "email", mock: r.mock, detail: r.mock ? "mock (provider not configured)" : "sent" } : null;
  };
  const order = prefer === "whatsapp" ? [tryWa, tryEmail] : [tryEmail, tryWa];
  for (const attempt of order) {
    const d = await attempt();
    if (d) return d;
  }
  return { ok: false, channel: prefer, suppressed: suppressedHits > 0, detail: suppressedHits ? "Contact opted out (DNC)" : "No reachable channel (missing phone/email or provider down)" };
}

async function doCall(lead: LeadRow, step: SequenceStep, ctx: TemplateCtx): Promise<Delivery> {
  const script = renderTemplate(step.body, ctx);
  const to = lead.phone ? normalizePhone(lead.phone) : "";
  if (to && (await isSuppressed({ phone: to }, "call"))) return { ok: false, channel: "call", suppressed: true, detail: "Contact opted out (DNC)" };
  if (to && process.env.FOLLOWUP_AI_CALLS === "true") {
    const r = await initiateCall({ to, script, leadCompany: lead.company ?? undefined, provider: "twilio" });
    if (r.usedRealProvider && r.status !== "failed") return { ok: true, channel: "call", detail: `AI call ${r.status}` };
  }
  // Default: a human call task — AI voice calls are opt-in (FOLLOWUP_AI_CALLS=true).
  await humanTask(`📞 Call ${lead.name}${lead.company ? ` (${lead.company})` : ""} — ${script}`, lead, "high", "Call");
  return { ok: true, channel: "call", detail: "Call task created for owner (log the outcome in Comms Hub → Calls)" };
}

async function doVoicemail(lead: LeadRow): Promise<Delivery> {
  const audio = process.env.FOLLOWUP_RVM_AUDIO_URL;
  const to = lead.phone ? normalizePhone(lead.phone) : "";
  if (!audio || !to) return { ok: true, channel: "voicemail", detail: "skipped — set FOLLOWUP_RVM_AUDIO_URL + RVM_* to enable voicemail drops" };
  if (await isSuppressed({ phone: to }, "call")) return { ok: false, channel: "voicemail", suppressed: true, detail: "Contact opted out (DNC)" };
  const r = await dropRinglessVoicemail(to, audio);
  return { ok: r.ok, channel: "voicemail", mock: r.mock, detail: r.mock ? "mock (RVM provider not configured)" : r.detail ?? "dropped" };
}

// ── Cron: scheduled drip steps ───────────────────────────────────────────────

export async function runDueSteps(now = new Date()): Promise<{ processed: number; sent: number; failed: number; skipped: number; completed: number; mock: number; stopped: number }> {
  const out = { processed: 0, sent: 0, failed: 0, skipped: 0, completed: 0, mock: 0, stopped: 0 };
  try {
    const db = getDb();
    const settings = await getCommsSettings();
    const { data } = await db.from("followup_enrollments")
      .select(`*, ${LEAD_COLS}`)
      .eq("status", "active").lte("next_run_at", now.toISOString())
      .order("next_run_at", { ascending: true }).limit(BATCH);

    for (const e of (data ?? []) as unknown as EnrollmentWithLead[]) {
      out.processed++;
      const steps = stepsOf(e);
      const startedAt = new Date(e.started_at);
      const tz = e.tz_offset_min ?? 330;

      // Central DNC: an opted-out contact leaves the drip entirely.
      if (e.leads && (await isSuppressed({ phone: e.leads.phone, email: e.leads.email }, "all"))) {
        await setStatus(e, "stopped", "On Do-Not-Contact list");
        await event(e.id, "stopped", "", true, "Contact is on the DNC list");
        out.stopped++;
        continue;
      }

      // Skip stale steps (e.g. drip was paused for weeks) instead of bursting them out.
      let idx = e.step_index;
      while (idx < steps.length && now.getTime() - stepDueAt(startedAt, steps[idx], tz).getTime() > STALE_STEP_MS) idx++;
      if (idx !== e.step_index) out.skipped += idx - e.step_index;

      if (idx >= steps.length || !e.leads) {
        await setStatus(e, "completed", "Sequence finished");
        await event(e.id, "completed", "", true, "Sequence finished — needs human decision");
        await humanTask(`Follow-up sequence finished for ${e.leads?.company || e.leads?.name || "lead"} — keep nurturing or close as lost?`, e.leads, "medium", "Sequence End");
        out.completed++;
        continue;
      }

      const step = steps[idx];
      const nextStep = steps[idx + 1];
      const nextRun = nextStep ? stepDueAt(startedAt, nextStep, tz) : null;
      // Optimistic claim: only one overlapping cron run wins this step.
      const { data: claimed } = await db.from("followup_enrollments")
        .update({ step_index: idx + 1, next_run_at: (nextRun ?? new Date(now.getTime() + 3_600_000)).toISOString(), attempts: 0 })
        .eq("id", e.id).eq("step_index", e.step_index).eq("status", "active").select("id").maybeSingle();
      if (!claimed) continue;

      const ctx = buildCtx(e.leads, BRAND, settings.links);
      const text = renderTemplate(step.body, ctx);
      let delivery: Delivery;
      if (step.channel === "call") delivery = await doCall(e.leads, step, ctx);
      else if (step.channel === "voicemail") delivery = await doVoicemail(e.leads);
      else {
        let tpl: { metaName: string; language: string; params: string[] } | undefined;
        if (step.channel === "whatsapp" && step.waTemplate) {
          const { data: t } = await db.from("message_templates").select("meta_name,language,body,approved").eq("kind", "whatsapp").eq("name", step.waTemplate).maybeSingle();
          if (t?.approved && t.meta_name) tpl = { metaName: t.meta_name as string, language: (t.language as string) || "en", params: templateParams(t.body as string, ctx) };
        }
        delivery = await sendText(e.leads, text, renderTemplate(step.subject ?? `A note from ${BRAND}`, ctx), step.channel, "automation", tpl);
      }

      if (delivery.suppressed) {
        await setStatus(e, "stopped", "Contact opted out (DNC)");
        await event(e.id, "stopped", delivery.channel, true, delivery.detail);
        out.stopped++;
      } else if (delivery.ok) {
        out.sent++;
        if (delivery.mock) out.mock++;
        await event(e.id, step.channel === "call" ? "call_task" : "step_sent", delivery.channel, true, `Step ${idx + 1}/${steps.length}: ${delivery.detail}`);
        if (!nextStep) {
          await setStatus(e, "completed", "Final touch sent");
          out.completed++;
        }
      } else {
        out.failed++;
        const attempts = e.attempts + 1;
        await event(e.id, "step_failed", delivery.channel, false, delivery.detail);
        // Roll back the claim so the next cron run retries; give up after MAX_ATTEMPTS.
        if (attempts < MAX_ATTEMPTS) {
          await db.from("followup_enrollments").update({ step_index: idx, attempts, next_run_at: new Date(now.getTime() + 3_600_000).toISOString() }).eq("id", e.id);
        } else {
          await notifyTeam({ kind: "step_failed", leadId: e.lead_id, priority: "high", title: `Follow-up to ${e.leads.company || e.leads.name} keeps failing`, body: delivery.detail });
        }
      }
    }
  } catch (err) { log("runDueSteps", err); }
  return out;
}

// ── Cron: 24h no-human-reply → AI soft nudge ─────────────────────────────────

export async function draftSoftNudge(ctx: TemplateCtx, lastClientMessage: string, attempt: number): Promise<{ subject: string; body: string; usedAi: boolean }> {
  const fb = fallbackNudge(ctx, attempt);
  if (!process.env.ANTHROPIC_API_KEY) return { ...fb, usedAi: false };
  try {
    const msg = await new Anthropic().messages.create({
      model: NUDGE_MODEL,
      max_tokens: 300,
      system: `You write a SHORT, warm, non-pushy WhatsApp/email message for ${ctx.brand}. The client wrote to us and our team hasn't replied for 24 hours. Acknowledge their message, apologise briefly for the wait, say a team member will reply personally very soon, and invite them to share a good time to talk. Do NOT invent prices, discounts, promises, dates or facts. Max 55 words. Match the client's language (English / Hindi / Hinglish). Reply ONLY with JSON: {"subject": "...", "body": "..."}.`,
      messages: [{ role: "user", content: `Client first name: ${ctx.firstName}\nCompany: ${ctx.company}\nTeam member: ${ctx.owner}\nNudge number: ${attempt + 1}\nClient's last message: """${lastClientMessage.slice(0, 500)}"""` }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { subject?: string; body?: string };
    if (parsed.body && parsed.body.length > 10) return { subject: parsed.subject || fb.subject, body: parsed.body, usedAi: true };
  } catch (err) { log("draftSoftNudge (using template)", err); }
  return { ...fb, usedAi: false };
}

async function lastInboundText(lead: LeadRow): Promise<string> {
  try {
    const db = getDb();
    const { data: convs } = await db.from("conversations").select("id").eq("lead_id", lead.id);
    const ids = (convs ?? []).map((c) => c.id as string);
    const { data: em } = await db.from("email_log").select("body,created_at").eq("lead_id", lead.id).eq("direction", "inbound").order("created_at", { ascending: false }).limit(1);
    if (!ids.length) return (em?.[0]?.body as string) ?? "";
    const { data } = await db.from("messages").select("body").in("conversation_id", ids).eq("direction", "inbound").order("created_at", { ascending: false }).limit(1);
    return (data?.[0]?.body as string) ?? (em?.[0]?.body as string) ?? "";
  } catch { return ""; }
}

export async function runAiNudges(now = new Date()): Promise<{ checked: number; nudged: number; escalated: number }> {
  const out = { checked: 0, nudged: 0, escalated: 0 };
  try {
    const { data } = await getDb().from("followup_enrollments")
      .select(`*, ${LEAD_COLS}`)
      .eq("status", "replied_waiting").limit(BATCH);

    for (const e of (data ?? []) as unknown as EnrollmentWithLead[]) {
      out.checked++;
      if (!e.leads || !needsAiNudge(e, now)) continue;
      if (adjustForQuietHours(now, e.tz_offset_min).getTime() !== now.getTime()) continue; // lead's quiet hours — next run

      const settings = await getCommsSettings();
      const ctx = buildCtx(e.leads, BRAND, settings.links);
      const draft = await draftSoftNudge(ctx, await lastInboundText(e.leads), e.ai_nudge_count);
      // Soft nudge goes on BOTH WhatsApp and email so it's seen.
      const wa = await sendText(e.leads, draft.body, draft.subject, "whatsapp", "ai");
      const em = e.leads.email && wa.channel !== "email" ? await sendText({ ...e.leads, phone: "" }, draft.body, draft.subject, "email", "ai") : null;
      const ok = wa.ok || Boolean(em?.ok);

      await event(e.id, "ai_nudge", wa.channel, ok, `Nudge ${e.ai_nudge_count + 1}/${MAX_AI_NUDGES_PER_REPLY} (${draft.usedAi ? "AI" : "template"}) via ${[wa.ok && wa.channel, em?.ok && "email"].filter(Boolean).join("+") || "none"}`);
      if (!ok) continue;
      out.nudged++;

      const count = e.ai_nudge_count + 1;
      await getDb().from("followup_enrollments").update({ ai_nudge_count: count, last_ai_nudge_at: now.toISOString() }).eq("id", e.id);
      if (count === 1) {
        await humanTask(`⏰ Reply overdue (24h+) — ${e.leads.company || e.leads.name} is waiting. AI sent a holding message.`, e.leads, "high", "Reply Overdue");
        await notifyTeam({ kind: "overdue_reply", leadId: e.lead_id, priority: "high", title: `⏰ ${e.leads.company || e.leads.name} has waited 24h+ for a reply`, body: "AI sent a holding message — please reply personally." });
      }
      if (count >= MAX_AI_NUDGES_PER_REPLY) out.escalated++;
    }
  } catch (err) { log("runAiNudges", err); }
  return out;
}
