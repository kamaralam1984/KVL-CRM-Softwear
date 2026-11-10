// Follow-up Engine cron. POST /api/followup/cron — runs every 15 min:
//   1. sends due 90-day drip steps (WhatsApp / email / call task)
//   2. sends AI soft nudges where a client replied and no human answered in 24h
//   3. Reminder Engine: task/meeting/invoice/callback reminders (team + client)
//   4. WhatsApp Broadcasts: starts scheduled ones, continues running ones
// Same shared-secret + GitHub Action cron pattern as /api/webinars/reminder-cron.

import { NextRequest, NextResponse } from "next/server";
import { runDueSteps, runAiNudges } from "@/lib/followup/engine";
import { runDueReminders } from "@/lib/reminders/engine";
import { runDueBroadcasts } from "@/lib/whatsapp/broadcast";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.FOLLOWUP_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const now = new Date();
    const steps = await runDueSteps(now);
    const nudges = await runAiNudges(now);
    const reminders = await runDueReminders(now);
    const broadcasts = await runDueBroadcasts(now, 20_000); // WhatsApp bulk broadcasts keep moving when nobody has the tab open
    return NextResponse.json({ ok: true, steps, nudges, reminders, broadcasts });
  } catch (err) {
    console.error("[followup] cron error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
