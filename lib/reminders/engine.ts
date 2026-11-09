// Reminder Engine — one table (`reminders`), one runner. Sources: tasks (due + 24h-overdue escalation),
// calendar meetings (client 24h/2h/15m + team no-show prompt), invoices (pre-due/due/overdue),
// callbacks (call outcome or a client's "call me tomorrow 5pm"), plus manual ones.
// Every client reminder honours the DNC list and the lead's quiet hours, and is skipped if the
// underlying task/invoice is already done. Never throws.
import { getDb } from "@/lib/db";
import { sendText } from "@/lib/followup/engine";
import { adjustForQuietHours, tzOffsetForPhone, renderTemplate, buildCtx } from "@/lib/followup/sequence";
import { notifyTeam } from "@/lib/notify/team";
import { sendWhatsApp, sendEmail } from "@/lib/messaging/send";
import { getCommsSettings } from "@/lib/comms/settings";
import { normalizePhone } from "@/lib/identity/resolve";
import { parseDue, parseClock, meetingReminderTimes, invoiceReminderPlan } from "./parse";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? process.env.BRAND_NAME ?? "KVL Business Solutions";
const log = (w: string, e: unknown) => console.error(`[reminders] ${w} failed:`, e);

export interface NewReminder {
  kind: "task" | "callback" | "meeting" | "invoice" | "custom";
  audience: "team" | "client";
  leadId?: number; assignee?: string; toPhone?: string; toEmail?: string;
  title: string; body?: string; remindAt: Date; dedupeKey?: string;
}

export async function createReminder(r: NewReminder): Promise<string | null> {
  try {
    const { data, error } = await getDb().from("reminders").insert({
      kind: r.kind, audience: r.audience, lead_id: r.leadId ?? null, assignee: r.assignee ?? "", to_phone: r.toPhone ?? "", to_email: r.toEmail ?? "",
      title: r.title.slice(0, 200), body: r.body ?? "", remind_at: r.remindAt.toISOString(), dedupe_key: r.dedupeKey ?? null,
    }).select("id").single();
    if (error) { if (error.code !== "23505") log("createReminder", error.message); return null; }
    return data.id as string;
  } catch (err) { log("createReminder", err); return null; }
}

// ── Sources → reminders (idempotent via dedupe_key) ─────────────────────────

async function scanTasks(now: Date): Promise<number> {
  const db = getDb();
  const { data } = await db.from("tasks").select("id,title,due,assignee,status,company").neq("status", "completed").limit(500);
  let n = 0;
  for (const t of data ?? []) {
    const due = parseDue(t.due as string, now, 330, 18);
    if (!due) continue;
    if (await createReminder({ kind: "task", audience: "team", assignee: t.assignee as string, title: `Task due: ${t.title}`, body: t.company ? `Client: ${t.company}` : "", remindAt: due, dedupeKey: `task:${t.id}:due` })) n++;
    if (await createReminder({ kind: "task", audience: "team", assignee: "manager", title: `⚠ OVERDUE 24h: ${t.title}`, body: `Assigned to ${t.assignee || "nobody"}`, remindAt: new Date(due.getTime() + 24 * 3_600_000), dedupeKey: `task:${t.id}:overdue` })) n++;
  }
  return n;
}

function eventStart(ev: { day: number; month: number; year: number; time?: string | null }): Date | null {
  const clock = parseClock(String(ev.time ?? "").split("-")[0].trim()) ?? { h: 10, mi: 0 };
  const d = new Date(Date.UTC(ev.year, ev.month, ev.day, clock.h, clock.mi) - 330 * 60_000);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function scanMeetings(now: Date): Promise<number> {
  const db = getDb();
  const { data } = await db.from("calendar_events").select("*").gte("year", now.getUTCFullYear() - 1).limit(500);
  let n = 0;
  for (const ev of data ?? []) {
    const startsAt = eventStart({ day: ev.day, month: ev.month, year: ev.year, time: ev.time });
    if (!startsAt || startsAt.getTime() < now.getTime() - 3_600_000) continue;
    const when = startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    if (ev.contact_phone || ev.contact_email || ev.lead_id) {
      for (const p of meetingReminderTimes(startsAt, now)) {
        const lead = p.label === "24h" ? "tomorrow" : p.label === "2h" ? "in 2 hours" : "in 15 minutes";
        if (await createReminder({ kind: "meeting", audience: "client", leadId: ev.lead_id ?? undefined, toPhone: ev.contact_phone ?? "", toEmail: ev.contact_email ?? "", title: `${ev.title}`,
          body: `Reminder: "${ev.title}" is ${lead} (${when} IST).${ev.meeting_url ? ` Join: ${ev.meeting_url}` : ""} Reply here if you need to reschedule.`, remindAt: p.at, dedupeKey: `cal:${ev.id}:${p.label}` })) n++;
      }
    }
    // Team prompt shortly after the start: attended? If not, send the reschedule message.
    if (await createReminder({ kind: "meeting", audience: "team", assignee: "", leadId: ev.lead_id ?? undefined, title: `Did "${ev.title}" happen?`, body: "If the client did not show, message them to reschedule (Comms Hub → Inbox).", remindAt: new Date(startsAt.getTime() + 15 * 60_000), dedupeKey: `cal:${ev.id}:noshow` })) n++;
  }
  return n;
}

async function scanInvoices(now: Date): Promise<number> {
  const db = getDb();
  const { data } = await db.from("invoices").select("*").neq("status", "paid").limit(500);
  let n = 0;
  for (const inv of data ?? []) {
    const due = parseDue(inv.due as string, now, 330, 10);
    if (!due || (!inv.contact_phone && !inv.contact_email)) continue;
    for (const p of invoiceReminderPlan(due)) {
      if (p.at.getTime() < now.getTime() - 24 * 3_600_000) continue; // don't dredge up old history
      const text = p.label === "pre3" ? "is due in 3 days" : p.label === "due" ? "is due today" : `is ${p.label.replace("over", "")} days overdue`;
      if (await createReminder({ kind: "invoice", audience: "client", toPhone: (inv.contact_phone as string) ?? "", toEmail: (inv.contact_email as string) ?? "", title: `Invoice ${inv.id}`,
        body: `Hi ${inv.client}, friendly reminder: invoice ${inv.id} (₹${Number(inv.amount).toLocaleString("en-IN")}) ${text}. [[Pay here: {{paymentLink}}]] Thank you! — ${BRAND}`, remindAt: p.at, dedupeKey: `inv:${inv.id}:${p.label}` })) n++;
      if (p.label === "over7") await createReminder({ kind: "invoice", audience: "team", assignee: "manager", title: `Invoice ${inv.id} is 7 days overdue (${inv.client})`, body: `₹${inv.amount}`, remindAt: p.at, dedupeKey: `inv:${inv.id}:team7` });
    }
  }
  return n;
}

export async function scanSources(now = new Date()): Promise<number> {
  let n = 0;
  try { n += await scanTasks(now); } catch (err) { log("scanTasks", err); }
  try { n += await scanMeetings(now); } catch (err) { log("scanMeetings", err); }
  try { n += await scanInvoices(now); } catch (err) { log("scanInvoices", err); }
  return n;
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function alreadyDone(dedupe: string | null): Promise<boolean> {
  if (!dedupe) return false;
  const [kind, id] = dedupe.split(":");
  const db = getDb();
  if (kind === "task") { const { data } = await db.from("tasks").select("status").eq("id", id).maybeSingle(); return !data || data.status === "completed"; }
  if (kind === "inv") { const { data } = await db.from("invoices").select("status").eq("id", id).maybeSingle(); return !data || data.status === "paid"; }
  return false;
}

export async function runDueReminders(now = new Date()): Promise<{ scanned: number; sent: number; failed: number; skipped: number; deferred: number }> {
  const out = { scanned: 0, sent: 0, failed: 0, skipped: 0, deferred: 0 };
  try {
    out.scanned = await scanSources(now);
    const db = getDb();
    const settings = await getCommsSettings();
    const { data } = await db.from("reminders").select("*").eq("status", "pending").lte("remind_at", now.toISOString()).order("remind_at").limit(100);

    for (const r of data ?? []) {
      const mark = (status: string, error = "") => db.from("reminders").update({ status, error, sent_at: status === "sent" ? new Date().toISOString() : null }).eq("id", r.id);
      if (await alreadyDone(r.dedupe_key as string | null)) { await mark("skipped", "already completed/paid"); out.skipped++; continue; }
      // A meeting reminder more than 30 min after the start is pointless.
      if (r.kind === "meeting" && r.audience === "client" && now.getTime() - new Date(r.remind_at as string).getTime() > 30 * 60_000) { await mark("skipped", "stale"); out.skipped++; continue; }

      if (r.audience === "team") {
        const who = String(r.assignee ?? "");
        await notifyTeam({ kind: `reminder_${r.kind}`, leadId: (r.lead_id as number | null) ?? undefined, priority: who === "manager" || r.kind === "callback" ? "high" : "normal", title: `⏰ ${r.title}`, body: r.body as string });
        // Also ping the assignee directly (WhatsApp/email) when we know how to reach them.
        if (who && who !== "manager") {
          const { data: tm } = await db.from("team_members").select("phone,email").ilike("name", who).limit(1).maybeSingle();
          const text = `⏰ ${r.title}${r.body ? `\n${r.body}` : ""}`;
          if (tm?.phone) await sendWhatsApp(tm.phone as string, text, { bypassSuppression: true });
          else if (tm?.email) await sendEmail(tm.email as string, `⏰ ${r.title}`, String(text).replace(/\n/g, "<br>"), { bypassSuppression: true, transactional: true, sentBy: "system" });
        }
        await mark("sent"); out.sent++; continue;
      }

      // Client reminder — lead-local quiet hours, DNC (inside sendText), template links.
      const phone = (r.to_phone as string) || "";
      const tz = tzOffsetForPhone(phone);
      const allowed = adjustForQuietHours(now, tz);
      if (allowed.getTime() !== now.getTime()) { await db.from("reminders").update({ remind_at: allowed.toISOString() }).eq("id", r.id); out.deferred++; continue; }

      const lead = { id: (r.lead_id as number) ?? 0, name: "", company: "", owner: "", phone: phone ? normalizePhone(phone) : "", email: (r.to_email as string) || "" };
      const text = renderTemplate(r.body as string, { ...buildCtx(lead, BRAND, settings.links), firstName: "", company: "", owner: "" });
      const d = await sendText(lead, text, `${r.title} — ${BRAND}`, "whatsapp", "automation");
      if (d.suppressed) { await mark("skipped", "contact opted out"); out.skipped++; }
      else if (d.ok) { await mark("sent", d.mock ? "mock (provider not configured)" : ""); out.sent++; }
      else { await mark("failed", d.detail); out.failed++; }
    }
  } catch (err) { log("runDueReminders", err); }
  return out;
}
