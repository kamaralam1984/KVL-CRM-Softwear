// Follow-up Engine — server-side orchestration. Never throws: every public
// function catches and logs, so a follow-up failure can never break the
// lead-create / webhook / payment flow that triggers it.
//
// Lifecycle of an enrollment:
//   active ──client replies──▶ replied_waiting ──human replies──▶ active (resumes after 72h)
//      │                              │ no human reply in 24h → AI soft nudge (WhatsApp + email)
//      ├─ "ready to pay" reply / payment / deal closed ─▶ payment_ready / won  (drip stops)
//      ├─ STOP / not interested ─▶ stopped
//      └─ 90 days over ─▶ completed (+ human task to decide)

import Anthropic from "@anthropic-ai/sdk";
import { getServerClient } from "@/lib/supabase/server";
import { sendWhatsApp, sendSms, sendEmail, isWhatsAppConfigured, isSmsConfigured } from "@/lib/messaging/send";
import { initiateCall } from "@/lib/voice";
import { normalizePhone } from "@/lib/identity/resolve";
import {
  DEFAULT_SEQUENCE, DEFAULT_SEQUENCE_KEY, TERMINAL_STATUSES, RESUME_AFTER_HUMAN_REPLY_HOURS,
  MAX_AI_NUDGES_PER_REPLY, adjustForQuietHours, buildCtx, classifyInbound, fallbackNudge,
  needsAiNudge, renderTemplate, stepDueAt,
  type EnrollmentStatus, type FollowUpChannel, type SequenceStep, type TemplateCtx,
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
}

interface LeadRow { id: number; name: string | null; company: string | null; email: string | null; phone: string | null; owner: string | null; stage?: string | null }
type EnrollmentWithLead = EnrollmentRow & { leads: LeadRow | null };

function log(where: string, err: unknown) {
  console.error(`[followup] ${where} failed:`, err);
}

async function event(enrollmentId: string, kind: string, channel = "", ok = true, detail = "") {
  try {
    await getServerClient().from("followup_events").insert({ enrollment_id: enrollmentId, kind, channel, ok, detail: detail.slice(0, 500) });
  } catch (err) { log("event", err); }
}

async function humanTask(title: string, lead: LeadRow | null, priority: "high" | "medium", tag: string) {
  try {
    await getServerClient().from("tasks").insert({
      title, priority, due: "Today", assignee: lead?.owner || "Unassigned", status: "pending",
      tags: ["Automation", "Follow-up Engine", tag], company: lead?.company || lead?.name || "",
    });
  } catch (err) { log("humanTask", err); }
}

// ── Enrollment ───────────────────────────────────────────────────────────────

/** Idempotent — enrolling an already-enrolled lead is a no-op. */
export async function enrollLead(leadId: number, sequenceKey = DEFAULT_SEQUENCE_KEY): Promise<{ ok: boolean; enrollmentId?: string }> {
  try {
    const db = getServerClient();
    const seq = DEFAULT_SEQUENCE;
    const startedAt = new Date();
    const first = seq.steps[0];
    const { data, error } = await db.from("followup_enrollments").upsert({
      lead_id: leadId,
      sequence_key: sequenceKey,
      status: "active",
      step_index: 0,
      started_at: startedAt.toISOString(),
      next_run_at: stepDueAt(startedAt, first).toISOString(),
      ends_at: new Date(startedAt.getTime() + seq.durationDays * 86_400_000).toISOString(),
    }, { onConflict: "lead_id,sequence_key", ignoreDuplicates: true }).select("id").maybeSingle();
    if (error) { log("enrollLead", error.message); return { ok: false }; }
    if (data?.id) await event(data.id, "enrolled", "", true, `${seq.name} — ${seq.steps.length} touches over ${seq.durationDays} days`);
    return { ok: true, enrollmentId: data?.id };
  } catch (err) { log("enrollLead", err); return { ok: false }; }
}

async function getLiveEnrollments(leadIds: number[]): Promise<EnrollmentWithLead[]> {
  if (!leadIds.length) return [];
  const { data } = await getServerClient()
    .from("followup_enrollments")
    .select("*, leads(id,name,company,email,phone,owner)")
    .in("lead_id", leadIds)
    .not("status", "in", "(won,completed,stopped,payment_ready)");
  return (data ?? []) as unknown as EnrollmentWithLead[];
}

/** Resolve a phone/email to lead ids. Phone is compared on its last 10 digits. */
export async function findLeadIds(contact: { phone?: string; email?: string; leadId?: number }): Promise<number[]> {
  try {
    if (contact.leadId) return [contact.leadId];
    const db = getServerClient();
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
  await getServerClient().from("followup_enrollments").update({ status, stop_reason: reason, next_run_at: TERMINAL_STATUSES.includes(status) ? null : e.next_run_at, ...patch }).eq("id", e.id);
}

/** Client replied on any channel. Pauses the drip until a human answers. */
export async function handleInboundReply(contact: { phone?: string; email?: string; leadId?: number }, text: string): Promise<{ intent: string; affected: number }> {
  try {
    const intent = classifyInbound(text);
    const enrollments = await getLiveEnrollments(await findLeadIds(contact));
    const nowIso = new Date().toISOString();
    for (const e of enrollments) {
      if (intent === "optout") {
        await setStatus(e, "stopped", "Client opted out", {});
        await event(e.id, "stopped", "", true, `Opt-out: "${text.slice(0, 80)}"`);
      } else if (intent === "payment_intent") {
        await setStatus(e, "payment_ready", "Client signalled intent to pay", { last_inbound_at: nowIso });
        await event(e.id, "payment_ready", "", true, `Intent: "${text.slice(0, 80)}"`);
        await humanTask(`💰 Send payment link NOW — ${e.leads?.company || e.leads?.name} is ready to pay`, e.leads, "high", "Payment Ready");
      } else {
        await setStatus(e, "replied_waiting", "", { last_inbound_at: nowIso, ai_nudge_count: 0, last_ai_nudge_at: null });
        await event(e.id, "inbound_reply", "", true, text.slice(0, 120));
      }
    }
    return { intent, affected: enrollments.length };
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
        next_run_at: adjustForQuietHours(new Date(now.getTime() + RESUME_AFTER_HUMAN_REPLY_HOURS * 3_600_000)).toISOString(),
      });
      await event(e.id, "human_reply", "", true, "Team replied — drip resumes in 72h");
    }
  } catch (err) { log("handleHumanReply", err); }
}

/** Payment received / deal closed / manual stop. Works on ANY non-final status. */
export async function endFollowUp(leadId: number, status: "won" | "payment_ready" | "stopped", reason: string): Promise<void> {
  try {
    const db = getServerClient();
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
    const db = getServerClient();
    await db.from("followup_enrollments").update(paused
      ? { status: "paused" }
      : { status: "active", next_run_at: new Date().toISOString() }).eq("id", enrollmentId);
    await event(enrollmentId, paused ? "stopped" : "enrolled", "", true, paused ? "Paused manually" : "Resumed manually");
  } catch (err) { log("setPaused", err); }
}

// ── Delivery ─────────────────────────────────────────────────────────────────

async function logOutbound(phone: string, name: string, body: string, channel: "whatsapp" | "sms", sentBy: string, providerId?: string) {
  try {
    const db = getServerClient();
    const { data: existing } = await db.from("conversations").select("id").eq("channel", channel).eq("contact_phone", phone).maybeSingle();
    let id = existing?.id as string | undefined;
    if (!id) {
      const { data: created } = await db.from("conversations").insert({ channel, contact_phone: phone, contact_name: name || phone }).select("id").single();
      id = created?.id as string | undefined;
    }
    if (!id) return;
    await db.from("messages").insert({ conversation_id: id, direction: "outbound", body, provider_message_id: providerId ?? null, sent_by: sentBy });
    await db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
  } catch (err) { log("logOutbound", err); }
}

const toHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");

interface Delivery { ok: boolean; channel: string; detail: string }

async function sendText(lead: LeadRow, text: string, subject: string, prefer: "whatsapp" | "email", sentBy: string): Promise<Delivery> {
  const phone = lead.phone ? normalizePhone(lead.phone) : "";
  const tryWa = async (): Promise<Delivery | null> => {
    if (!phone) return null;
    if (isWhatsAppConfigured() || !isSmsConfigured()) {
      const r = await sendWhatsApp(phone, text);
      if (r.ok) { await logOutbound(phone, lead.name ?? "", text, "whatsapp", sentBy, r.providerMessageId); return { ok: true, channel: "whatsapp", detail: r.mock ? "mock" : "sent" }; }
    }
    if (isSmsConfigured()) {
      const r = await sendSms(phone, text);
      if (r.ok) { await logOutbound(phone, lead.name ?? "", text, "sms", sentBy, r.providerMessageId); return { ok: true, channel: "sms", detail: r.mock ? "mock" : "sent (WhatsApp fallback)" }; }
    }
    return null;
  };
  const tryEmail = async (): Promise<Delivery | null> => {
    if (!lead.email) return null;
    const r = await sendEmail(lead.email, subject, toHtml(text));
    return r.ok ? { ok: true, channel: "email", detail: r.mock ? "mock" : "sent" } : null;
  };
  const order = prefer === "whatsapp" ? [tryWa, tryEmail] : [tryEmail, tryWa];
  for (const attempt of order) {
    const d = await attempt();
    if (d) return d;
  }
  return { ok: false, channel: prefer, detail: "No reachable channel (missing phone/email or provider down)" };
}

async function doCall(lead: LeadRow, step: SequenceStep, ctx: TemplateCtx): Promise<Delivery> {
  const script = renderTemplate(step.body, ctx);
  const to = lead.phone ? normalizePhone(lead.phone) : "";
  if (to && process.env.FOLLOWUP_AI_CALLS === "true") {
    const r = await initiateCall({ to, script, leadCompany: lead.company ?? undefined, provider: "twilio" });
    if (r.usedRealProvider && r.status !== "failed") return { ok: true, channel: "call", detail: `AI call ${r.status}` };
  }
  // Default: a human call task — AI voice calls are opt-in (FOLLOWUP_AI_CALLS=true).
  await humanTask(`📞 Call ${lead.name}${lead.company ? ` (${lead.company})` : ""} — ${script}`, lead, "high", "Call");
  return { ok: true, channel: "call", detail: "Call task created for owner" };
}

// ── Cron: scheduled drip steps ───────────────────────────────────────────────

export async function runDueSteps(now = new Date()): Promise<{ processed: number; sent: number; failed: number; skipped: number; completed: number }> {
  const out = { processed: 0, sent: 0, failed: 0, skipped: 0, completed: 0 };
  try {
    const db = getServerClient();
    const { data } = await db.from("followup_enrollments")
      .select("*, leads(id,name,company,email,phone,owner)")
      .eq("status", "active").lte("next_run_at", now.toISOString())
      .order("next_run_at", { ascending: true }).limit(BATCH);

    for (const e of (data ?? []) as unknown as EnrollmentWithLead[]) {
      out.processed++;
      const steps = DEFAULT_SEQUENCE.steps;
      const startedAt = new Date(e.started_at);

      // Skip stale steps (e.g. drip was paused for weeks) instead of bursting them out.
      let idx = e.step_index;
      while (idx < steps.length && now.getTime() - stepDueAt(startedAt, steps[idx]).getTime() > STALE_STEP_MS) idx++;
      if (idx !== e.step_index) out.skipped += idx - e.step_index;

      if (idx >= steps.length || !e.leads) {
        await setStatus(e, "completed", `${DEFAULT_SEQUENCE.durationDays}-day sequence finished`);
        await event(e.id, "completed", "", true, "Sequence finished — needs human decision");
        await humanTask(`Day-${DEFAULT_SEQUENCE.durationDays} follow-up finished for ${e.leads?.company || e.leads?.name || "lead"} — keep nurturing or close as lost?`, e.leads, "medium", "Sequence End");
        out.completed++;
        continue;
      }

      const step = steps[idx];
      const nextStep = steps[idx + 1];
      const nextRun = nextStep ? stepDueAt(startedAt, nextStep) : null;
      // Optimistic claim: only one overlapping cron run wins this step.
      const { data: claimed } = await db.from("followup_enrollments")
        .update({ step_index: idx + 1, next_run_at: (nextRun ?? new Date(now.getTime() + 3_600_000)).toISOString(), attempts: 0 })
        .eq("id", e.id).eq("step_index", e.step_index).eq("status", "active").select("id").maybeSingle();
      if (!claimed) continue;

      const ctx = buildCtx(e.leads, BRAND);
      const text = renderTemplate(step.body, ctx);
      const delivery = step.channel === "call"
        ? await doCall(e.leads, step, ctx)
        : await sendText(e.leads, text, renderTemplate(step.subject ?? `A note from ${BRAND}`, ctx), step.channel as Exclude<FollowUpChannel, "call">, "automation");

      if (delivery.ok) {
        out.sent++;
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
    const db = getServerClient();
    const { data: convs } = await db.from("conversations").select("id").eq("lead_id", lead.id);
    const ids = (convs ?? []).map((c) => c.id as string);
    if (!ids.length) return "";
    const { data } = await db.from("messages").select("body").in("conversation_id", ids).eq("direction", "inbound").order("created_at", { ascending: false }).limit(1);
    return (data?.[0]?.body as string) ?? "";
  } catch { return ""; }
}

export async function runAiNudges(now = new Date()): Promise<{ checked: number; nudged: number; escalated: number }> {
  const out = { checked: 0, nudged: 0, escalated: 0 };
  try {
    if (adjustForQuietHours(now).getTime() !== now.getTime()) return out; // quiet hours — try again later
    const { data } = await getServerClient().from("followup_enrollments")
      .select("*, leads(id,name,company,email,phone,owner)")
      .eq("status", "replied_waiting").limit(BATCH);

    for (const e of (data ?? []) as unknown as EnrollmentWithLead[]) {
      out.checked++;
      if (!e.leads || !needsAiNudge(e, now)) continue;

      const ctx = buildCtx(e.leads, BRAND);
      const draft = await draftSoftNudge(ctx, await lastInboundText(e.leads), e.ai_nudge_count);
      // Soft nudge goes on BOTH WhatsApp and email so it's seen.
      const wa = await sendText(e.leads, draft.body, draft.subject, "whatsapp", "ai");
      const em = e.leads.email && wa.channel !== "email" ? await sendText({ ...e.leads, phone: "" }, draft.body, draft.subject, "email", "ai") : null;
      const ok = wa.ok || Boolean(em?.ok);

      await event(e.id, "ai_nudge", wa.channel, ok, `Nudge ${e.ai_nudge_count + 1}/${MAX_AI_NUDGES_PER_REPLY} (${draft.usedAi ? "AI" : "template"}) via ${[wa.ok && wa.channel, em?.ok && "email"].filter(Boolean).join("+") || "none"}`);
      if (!ok) continue;
      out.nudged++;

      const count = e.ai_nudge_count + 1;
      await getServerClient().from("followup_enrollments").update({ ai_nudge_count: count, last_ai_nudge_at: now.toISOString() }).eq("id", e.id);
      if (count === 1) await humanTask(`⏰ Reply overdue (24h+) — ${e.leads.company || e.leads.name} is waiting. AI sent a holding message.`, e.leads, "high", "Reply Overdue");
      if (count >= MAX_AI_NUDGES_PER_REPLY) out.escalated++;
    }
  } catch (err) { log("runAiNudges", err); }
  return out;
}
