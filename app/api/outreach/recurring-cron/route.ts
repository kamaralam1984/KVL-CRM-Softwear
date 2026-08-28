// Phase 33 — Birthday/Seasonal Auto-Campaigns. POST /api/outreach/recurring-cron
// — daily job: sends a birthday message to any customer whose birthday is
// today, and fires any `campaigns` row whose recurrence_rule is due. Same
// shared-secret + GitHub Action cron pattern as /api/leadgen/run.

import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { sendWhatsApp, sendSms, isWhatsAppConfigured } from "@/lib/messaging/send";
import { birthdayMessage } from "@/lib/outreach/templates/seasonal";

export const dynamic = "force-dynamic";

async function sendToCustomer(phone: string, message: string): Promise<boolean> {
  if (!phone) return false;
  const result = isWhatsAppConfigured() ? await sendWhatsApp(phone, message) : await sendSms(phone, message);
  return result.ok;
}

export async function POST(req: NextRequest) {
  const secret = process.env.OUTREACH_RECURRING_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const db = getServerClient();
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Birthdays — "date" columns come back as "YYYY-MM-DD"; match the MM-DD suffix.
    const { data: customers, error: custErr } = await db.from("customers").select("id, name, phone, birthday").not("birthday", "is", null);
    let birthdaysSent = 0;
    if (!custErr && customers) {
      for (const c of customers) {
        if (typeof c.birthday !== "string" || !c.birthday.endsWith(mmdd)) continue;
        const sent = await sendToCustomer(c.phone ?? "", birthdayMessage(c.name));
        if (sent) birthdaysSent++;
      }
    }

    // Seasonal campaigns due today — recurrence_rule "yearly:MM-DD".
    const { data: campaigns, error: campErr } = await db.from("campaigns").select("id, name, recurrence_rule").not("recurrence_rule", "is", null);
    let campaignsFired = 0;
    if (!campErr && campaigns) {
      for (const camp of campaigns) {
        if (camp.recurrence_rule === `yearly:${mmdd}`) {
          // The acquisition-engine's `campaigns` table (Phase 17 — UTM/spend
          // attribution) is a different concept from lib/marketing/types.ts's
          // Campaign (channel+message, in-memory ads-campaign model) — same
          // naming collision already documented in
          // docs/ACQUISITION_ENGINE_ROADMAP.md §4b. This table has no
          // channel/message field to actually send through yet, so a due
          // seasonal campaign is logged/counted here, not silently faked as
          // sent — wiring a real send needs that field added first.
          console.log(`[outreach] seasonal campaign due today: "${camp.name}" (${camp.id})`);
          campaignsFired++;
        }
      }
    }

    return NextResponse.json({ ok: true, birthdaysSent, campaignsFired });
  } catch (err) {
    console.error("[outreach] recurring-cron error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
