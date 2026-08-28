// Phase 25 — Social Planner. POST /api/social/cron — publishes every
// social_posts row whose scheduled_at has arrived. Same shared-secret
// convention as /api/leadgen/run (accepts either SOCIAL_CRON_SECRET or
// Vercel's CRON_SECRET; runs open if neither is set, dev convenience).
//
// Runs more frequently than the once-a-day leadgen pipeline (posts have
// specific scheduled times, not a daily batch) — see .github/workflows/
// social-scheduler.yml for the suggested cadence.

import { NextRequest, NextResponse } from "next/server";
import { publishDueSocialPosts } from "@/lib/actions/socialPosts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.SOCIAL_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await publishDueSocialPosts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[social] cron route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
