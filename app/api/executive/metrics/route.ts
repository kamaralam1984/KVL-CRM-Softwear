// GET /api/executive/metrics — Executive Dashboard metrics snapshot (Phase 10).
//
// Returns an ExecutiveMetrics JSON payload computed from live CRM data (with
// seed fallback in demo mode). getExecutiveMetrics() never throws, so this
// route always responds with JSON.
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <EXECUTIVE_METRICS_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { getExecutiveMetrics } from "@/lib/executive";

// Gathers from several data sources; give it room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.EXECUTIVE_METRICS_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null; // open in dev when unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const metrics = await getExecutiveMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    // getExecutiveMetrics never throws, but guard anyway so we always return JSON.
    console.error("[executive] metrics route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "metrics failed" },
      { status: 500 },
    );
  }
}
