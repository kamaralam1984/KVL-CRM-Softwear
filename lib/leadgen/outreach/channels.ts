// Channel senders. Each tries a real provider when its keys are set, otherwise
// logs (mock) so the flow runs today. Each records the touch into the matching
// CRM table so it shows up in the dashboard.

import { getServerClient } from "@/lib/supabase/server";
import type { ScoredLead } from "../types";
import type { OutreachMessage, OutreachResult, SenderProfile } from "./types";

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// --- EMAIL (Resend) -------------------------------------------------------
export async function sendEmail(
  lead: ScoredLead,
  msg: OutreachMessage,
  sender: SenderProfile,
): Promise<OutreachResult> {
  const base = { lead: lead.company, channel: "email" as const };
  if (!lead.email || !msg.email) return { ...base, status: "skipped", detail: "no email/copy", usedMockProvider: false };

  const key = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL;
  let status: OutreachResult["status"] = "sent";
  let detail = "logged (mock)";
  let mock = true;

  if (key && from) {
    mock = false;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: lead.email, subject: msg.email.subject, text: msg.email.body }),
      });
      if (!res.ok) return { ...base, status: "failed", detail: `resend ${res.status}`, usedMockProvider: false };
      detail = ((await res.json()) as { id?: string }).id ?? "sent";
    } catch (e) {
      return { ...base, status: "failed", detail: String(e), usedMockProvider: false };
    }
  } else {
    console.log(`[outreach:email:mock] → ${lead.email} | ${msg.email.subject}`);
  }

  await record("email_campaigns", {
    name: `Auto: ${lead.company}`,
    status: "Sent",
    recipients: 1,
    openRate: 0,
    clickRate: 0,
  });
  return { ...base, status, detail, usedMockProvider: mock };
}

// --- WHATSAPP (Twilio / MSG91) -------------------------------------------
export async function sendWhatsapp(lead: ScoredLead, msg: OutreachMessage): Promise<OutreachResult> {
  const base = { lead: lead.company, channel: "whatsapp" as const };
  if (!lead.phone || !msg.whatsapp) return { ...base, status: "skipped", detail: "no phone/copy", usedMockProvider: false };

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromWa = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
  let mock = true;
  let detail = "logged (mock)";

  if (sid && token && fromWa) {
    mock = false;
    try {
      const body = new URLSearchParams({ From: fromWa, To: `whatsapp:${lead.phone}`, Body: msg.whatsapp.body });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) return { ...base, status: "failed", detail: `twilio ${res.status}`, usedMockProvider: false };
      detail = ((await res.json()) as { sid?: string }).sid ?? "sent";
    } catch (e) {
      return { ...base, status: "failed", detail: String(e), usedMockProvider: false };
    }
  } else {
    console.log(`[outreach:whatsapp:mock] → ${lead.phone} | ${msg.whatsapp.body}`);
  }

  await record("whatsapp_conversations", {
    contact: lead.name,
    company: lead.company,
    message: msg.whatsapp.body,
    time: "just now",
    unread: 0,
    status: "active",
    avatar: initials(lead.company),
  });
  return { ...base, status: "sent", detail, usedMockProvider: mock };
}

// --- SMS (Twilio / MSG91) -------------------------------------------------
export async function sendSms(lead: ScoredLead, msg: OutreachMessage): Promise<OutreachResult> {
  const base = { lead: lead.company, channel: "sms" as const };
  if (!lead.phone || !msg.sms) return { ...base, status: "skipped", detail: "no phone/copy", usedMockProvider: false };

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (sid && token && from) {
    try {
      const body = new URLSearchParams({ From: from, To: lead.phone, Body: msg.sms.body });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) return { ...base, status: "failed", detail: `twilio ${res.status}`, usedMockProvider: false };
      const j = (await res.json()) as { sid?: string };
      return { ...base, status: "sent", detail: j.sid ?? "sent", usedMockProvider: false };
    } catch (e) {
      return { ...base, status: "failed", detail: String(e), usedMockProvider: false };
    }
  }
  console.log(`[outreach:sms:mock] → ${lead.phone} | ${msg.sms.body}`);
  return { ...base, status: "sent", detail: "logged (mock)", usedMockProvider: true };
}

// --- CALL (create a task for a human — legal-safe default) ----------------
export async function queueCall(lead: ScoredLead, msg: OutreachMessage): Promise<OutreachResult> {
  const base = { lead: lead.company, channel: "call" as const };
  await record("tasks", {
    title: `Call ${lead.company} (${lead.phone ?? "no phone"})`,
    priority: lead.score >= 80 ? "high" : "medium",
    due: "Today",
    assignee: "Unassigned",
    status: "pending",
    tags: ["Call", "Lead"],
    company: lead.company,
    notes: msg.call?.talkingPoints,
  });
  return { ...base, status: "task_created", detail: "call task added", usedMockProvider: false };
}

// Best-effort insert; never throw (demo mode has no DB).
async function record(table: string, row: Record<string, unknown>): Promise<void> {
  try {
    const db = getServerClient();
    const { error } = await db.from(table).insert(row);
    if (error) console.error(`[outreach] record ${table} failed:`, error.message);
  } catch (e) {
    console.error(`[outreach] record ${table} error:`, e);
  }
}
