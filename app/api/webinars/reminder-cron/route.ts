// Phase 45 — Webinar Funnels. POST /api/webinars/reminder-cron — mirrors
// app/api/outreach/recurring-cron/route.ts's exact shared-secret + GitHub
// Action cron pattern, but runs every 15 minutes (not daily): reminders
// fire relative to each webinar's own scheduled_at, not a fixed daily time.
//
// NEXT_PUBLIC_APP_URL is required to build the room link inside a reminder
// message — a cron request has no browser origin to read
// (window.location.origin), unlike the client-triggered actions elsewhere
// in this codebase that get the base URL passed in from the caller.

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { sendWhatsApp, sendSms, sendEmail, isWhatsAppConfigured, isSmsConfigured } from "@/lib/messaging/send";

export const dynamic = "force-dynamic";

// Window is wider than the 15-min cron interval so a run that's briefly
// delayed doesn't skip a reminder — reminder_sent_* flags make this safe
// to check on every run without ever double-sending.
const WINDOW_HOURS = 0.3;

async function sendReminder(name: string, phone: string, email: string, title: string, roomUrl: string, whenLabel: string): Promise<boolean> {
  const message = `Hi ${name.split(" ")[0] || name}, reminder: "${title}" ${whenLabel}. Join here: ${roomUrl}`;
  if (phone) {
    const result = isWhatsAppConfigured() ? await sendWhatsApp(phone, message) : isSmsConfigured() ? await sendSms(phone, message) : null;
    if (result?.ok) return true;
  }
  if (email) {
    const result = await sendEmail(email, `Reminder: ${title}`, message);
    return result.ok;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const secret = process.env.WEBINAR_REMINDER_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json({ ok: false, error: "not_configured", detail: "NEXT_PUBLIC_APP_URL not set" }, { status: 501 });
  }

  try {
    const db = getServerClient();
    const now = Date.now();

    const { data: webinars, error: webErr } = await db.from("webinars").select("*").eq("published", true).not("scheduled_at", "is", null);
    let sent24h = 0;
    let sent1h = 0;

    if (!webErr && webinars) {
      for (const w of webinars) {
        const scheduledMs = new Date(w.scheduled_at as string).getTime();
        const hoursUntil = (scheduledMs - now) / 3_600_000;
        if (hoursUntil < 0) continue;

        const due24h = w.reminder_24h && Math.abs(hoursUntil - 24) <= WINDOW_HOURS;
        const due1h = w.reminder_1h && Math.abs(hoursUntil - 1) <= WINDOW_HOURS;
        if (!due24h && !due1h) continue;

        const { data: regs } = await db.from("webinar_registrations").select("*").eq("webinar_id", w.id);
        const roomUrl = `${baseUrl}/webinar/${w.slug}/room`;

        for (const r of regs ?? []) {
          // Gap-check fix — only mark reminder_sent_* once the send actually
          // succeeds. Marking it unconditionally (the original bug) meant a
          // transient failure (Resend/Twilio down, a network blip) silently
          // and permanently lost that reminder — the next cron run would
          // see the flag already true and never retry.
          if (due24h && !r.reminder_sent_24h) {
            const ok = await sendReminder(r.name, r.phone ?? "", r.email ?? "", w.title, `${roomUrl}?r=${r.id}`, "is tomorrow");
            if (ok) {
              sent24h++;
              await db.from("webinar_registrations").update({ reminder_sent_24h: true }).eq("id", r.id);
            }
          }
          if (due1h && !r.reminder_sent_1h) {
            const ok = await sendReminder(r.name, r.phone ?? "", r.email ?? "", w.title, `${roomUrl}?r=${r.id}`, "starts in about an hour");
            if (ok) {
              sent1h++;
              await db.from("webinar_registrations").update({ reminder_sent_1h: true }).eq("id", r.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true, sent24h, sent1h });
  } catch (err) {
    console.error("[webinars] reminder-cron error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
