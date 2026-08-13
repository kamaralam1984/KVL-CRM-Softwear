// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// POST /api/analytics/push-subscribe — stores a Web Push subscription tied to
// visitor_id only. No name/email/phone ever flows through this route.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { recordPushSubscription } from "@/lib/tracking/store";
import { isValidId, str, plainObject, rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(rateLimitKey(req, "push-subscribe"), 20, 60_000);
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
    const sub = plainObject(b.subscription);
    const keys = plainObject(sub.keys);
    const endpoint = str(sub.endpoint, 1000);
    const p256dh = str(keys.p256dh, 300);
    const auth = str(keys.auth, 300);

    if (!isValidId(visitorId) || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    await recordPushSubscription({ visitorId: visitorId as string, endpoint, p256dh, auth });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[analytics] push-subscribe route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
