// GET|POST /api/advisor/daily — the AI Business Advisor's daily digest.
//
// Designed to be hit by a morning cron. Returns a computed DailyBriefing from
// real CRM data (revenue, pipeline, hot leads, risks, AI/heuristic advice).
//
// Date resolution: ?date=<ISO> query param, or JSON body { "date": "<ISO>" }.
// If neither is provided the handler uses now.
//
// Optional auth: if LEADGEN_CRON_SECRET (or CRON_SECRET) is set, callers must
// send `Authorization: Bearer <secret>`. Unset → open (dev convenience).

import { NextRequest, NextResponse } from "next/server";
import { generateDailyBriefing } from "@/lib/advisor";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.LEADGEN_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function resolveDate(req: NextRequest): Promise<string> {
  const q = req.nextUrl.searchParams.get("date");
  if (q) return q;
  try {
    const body = await req.json();
    if (body && typeof body.date === "string" && body.date) return body.date;
  } catch {
    // no/invalid body
  }
  return new Date().toISOString();
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const date = await resolveDate(req);
    const briefing = await generateDailyBriefing(date);
    return NextResponse.json({ ok: true, briefing });
  } catch (err) {
    console.error("[advisor] route error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "briefing failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
