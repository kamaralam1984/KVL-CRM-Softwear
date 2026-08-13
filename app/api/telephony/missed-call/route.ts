// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// POST /api/telephony/missed-call — webhook a telephony provider (Exotel,
// Knowlarity, MyOperator, etc.) calls when a customer dials the number shown
// on the marketing site (components/marketing/MissedCallBanner.tsx). Dialing
// a phone is an inherently voluntary act — caller ID sharing is a basic
// telecom function, not covert tracking.
//
// Unlike /api/analytics/*, this endpoint is authenticated: it creates real
// Leads and has no per-visitor session context to sanity-check against, so a
// shared secret gate is required. Requires MISSED_CALL_WEBHOOK_SECRET to be
// set — until a real telephony provider account exists, this route is
// deliberately inert (501) rather than silently accepting unauthenticated
// writes.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp, str, plainObject } from "../../analytics/shared";
import { recordSessionStart } from "@/lib/tracking/store";
import { generateSessionId } from "@/lib/tracking/ids";
import { resolveIdentity, normalizePhone } from "@/lib/identity/resolve";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.MISSED_CALL_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    }
    if (req.headers.get("x-webhook-secret") !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(`telephony:missed-call:${clientIp(req)}`, 30, 60_000);
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
    const callerNumber = str(b.caller_number, 40);
    const phone = normalizePhone(callerNumber);
    if (!phone) {
      return NextResponse.json({ ok: false, error: "invalid_caller_number" }, { status: 400 });
    }

    // A synthetic, deterministic visitor_id — repeat missed calls from the
    // same number map to the same visitor row instead of creating a new one
    // each time.
    const visitorId = `call:${phone}`;

    await recordSessionStart({
      sessionId: generateSessionId(),
      visitorId,
      landingPage: "",
      attribution: { source: "missed_call", medium: "phone", campaign: "", term: "", content: "", gclid: "", fbclid: "", msclkid: "" },
      device: {},
    });

    const resolution = await resolveIdentity({ visitorId, name: "", email: "", phone: callerNumber });

    return NextResponse.json({ ok: true, resolution });
  } catch (err) {
    console.error("[telephony] missed-call route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
