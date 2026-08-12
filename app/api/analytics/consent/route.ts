// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// POST /api/analytics/consent — records a visitor's tracking consent decision.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { recordConsent } from "@/lib/tracking/store";
import { isValidId, plainObject, rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(rateLimitKey(req, "consent"), 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    const b = plainObject(body);
    const visitorId = b.visitor_id;
    const status = b.status === "granted" || b.status === "denied" ? b.status : null;

    if (!isValidId(visitorId) || !status) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    await recordConsent({
      visitorId: visitorId as string,
      status,
      categories: plainObject(b.categories),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[analytics] consent route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
