// Phase 17 — Lead Intelligence & Acquisition Engine
// POST /api/analytics/identify — records voluntary self-identification
// (email/phone/name submitted by the visitor themselves), then (Wave 3)
// resolves the visitor's history into a CRM Lead — dedupes against existing
// leads by phone/email, creates a new one only if nothing matches.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { markVisitorIdentified, recordEvents } from "@/lib/tracking/store";
import { resolveIdentity } from "@/lib/identity/resolve";
import { isValidId, str, plainObject, rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(rateLimitKey(req, "identify"), 20, 60_000);
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
    const sessionId = b.session_id;
    if (!isValidId(visitorId)) {
      return NextResponse.json({ ok: false, error: "invalid_visitor_id" }, { status: 400 });
    }

    const traits = plainObject(b.traits);
    const safeTraits = {
      name: str(traits.name, 200),
      email: str(traits.email, 200),
      phone: str(traits.phone, 40),
    };

    const [, , resolution] = await Promise.all([
      markVisitorIdentified(visitorId as string),
      recordEvents([
        {
          visitorId: visitorId as string,
          sessionId: isValidId(sessionId) ? (sessionId as string) : null,
          eventName: "identify",
          pageUrl: str(b.page_url, 512),
          properties: safeTraits,
        },
      ]),
      resolveIdentity({ visitorId: visitorId as string, ...safeTraits }),
    ]);

    return NextResponse.json({ ok: true, resolution });
  } catch (err) {
    console.error("[analytics] identify route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
