// POST /api/scoring/score — enhanced AI lead scoring (Phase 4).
// Body: { lead, opportunity?, idealCustomer? } or { leads: ScoreInput[] }.
import { NextRequest, NextResponse } from "next/server";
import { scoreLead, scoreLeads } from "@/lib/scoring";
import type { ScoreInput } from "@/lib/scoring/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.LEADGEN_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const b = body as { lead?: ScoreInput["lead"]; leads?: ScoreInput[]; opportunity?: ScoreInput["opportunity"]; idealCustomer?: string };
  try {
    if (Array.isArray(b.leads)) {
      const scores = await scoreLeads(b.leads);
      return NextResponse.json({ ok: true, scores });
    }
    if (b.lead) {
      const score = await scoreLead({ lead: b.lead, opportunity: b.opportunity, idealCustomer: b.idealCustomer });
      return NextResponse.json({ ok: true, score });
    }
    return NextResponse.json({ error: "provide `lead` or `leads`" }, { status: 400 });
  } catch (err) {
    console.error("[scoring] route error:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "scoring failed" }, { status: 500 });
  }
}
