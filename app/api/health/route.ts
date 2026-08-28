// Phase 39 — Production Hardening & Observability. GET /api/health — a
// liveness/readiness endpoint for EXTERNAL uptime monitoring (e.g.
// UptimeRobot, Better Uptime) to poll. Deliberately not self-polled from a
// cron inside this app — that wouldn't catch the app itself being down.
// Never throws: any DB failure is reported in the response, not as a 500.

import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  let dbOk = false;
  try {
    const db = getServerClient();
    const { error } = await db.from("sites").select("site_id").limit(1);
    dbOk = !error;
  } catch (err) {
    console.error("[health] db check failed:", err);
  }
  return NextResponse.json({ ok: dbOk, dbOk, timestamp }, { status: dbOk ? 200 : 503 });
}
