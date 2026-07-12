// POST /api/leadgen/run — triggers the daily lead-generation pipeline.
//
// Secure it with a shared secret so only your cron job can call it:
//   header:  Authorization: Bearer <LEADGEN_CRON_SECRET>
// If LEADGEN_CRON_SECRET is unset, the route runs open (dev convenience).
//
// Body (optional) overrides the defaults:
//   { "queries": ["dentists in Delhi"], "idealCustomer": "...", "dailyTarget": 10 }

import { NextRequest, NextResponse } from "next/server";
import { runLeadGenPipeline, type PipelineConfig } from "@/lib/leadgen/pipeline";

// AI scoring + sourcing can take a while — give it room (Vercel caps this).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DEFAULTS: PipelineConfig = {
  // Multi-source: mix inbound (best), local businesses, and B2B.
  sources: [
    { source: "web_form", queries: [] }, // inbound form leads (highest quality)
    { source: "google_maps", queries: ["dentists in Delhi", "gyms in Mumbai", "digital marketing agencies in Bangalore"] },
    { source: "apollo", queries: ["small business owner"] },
  ],
  idealCustomer:
    "Small-to-medium local businesses that would benefit from a CRM: have a website or online presence, 5-50 employees, actively serving customers.",
  dailyTarget: 10,
  outreach: {
    // Which channels fire automatically. Trim this to control spend / risk.
    channels: ["email", "whatsapp", "call"],
    sender: {
      senderName: process.env.OUTREACH_SENDER_NAME ?? "Team",
      senderCompany: process.env.OUTREACH_SENDER_COMPANY ?? "FreedomWithAI CRM",
      offer: process.env.OUTREACH_OFFER ?? "An AI CRM that finds and follows up with leads automatically",
      calendarLink: process.env.OUTREACH_CALENDAR_LINK,
    },
  },
};

export async function POST(req: NextRequest) {
  // Accept either our own secret or Vercel Cron's CRON_SECRET.
  const secret = process.env.LEADGEN_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let config = DEFAULTS;
  try {
    const body = await req.json();
    config = { ...DEFAULTS, ...body };
  } catch {
    // no body → use defaults
  }

  try {
    const result = await runLeadGenPipeline(config);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[leadgen] pipeline error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "pipeline failed" },
      { status: 500 },
    );
  }
}

// Allow a quick manual GET trigger in the browser during development.
export async function GET(req: NextRequest) {
  return POST(req);
}
