// Phase 40 — Public API. Same auth/rate-limit/reuse pattern as
// app/api/v1/leads/route.ts. Creating a deal with stage "Closed Won" fires
// the deal.won webhook via createDeal → updateDeal's existing wiring only
// applies on update, not create — a deal created already-won is rare
// enough (and not what this endpoint is for) that this is an honest,
// documented gap rather than added complexity for an edge case.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { authenticateApiKey } from "@/lib/apiKeys/auth";
import { getDeals, createDeal } from "@/lib/actions/deals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = rateLimit(`api:v1:deals:${clientIp(req)}`, 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const deals = await getDeals();
    return NextResponse.json({ data: deals.slice(0, 50) });
  } catch (err) {
    console.error("[api/v1/deals] GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`api:v1:deals:${clientIp(req)}`, 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const deal = await createDeal({
      name: body.name,
      company: body.company ?? "",
      value: Number(body.value) || 0,
      probability: 20,
      stage: "Discovery",
      owner: body.owner ?? "",
      avatar: "",
      daysInStage: 0,
    });
    return NextResponse.json({ data: deal }, { status: 201 });
  } catch (err) {
    console.error("[api/v1/deals] POST error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
