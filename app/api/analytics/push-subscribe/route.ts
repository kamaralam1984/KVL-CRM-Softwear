// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// POST /api/analytics/push-subscribe — stores a Web Push subscription tied to
// visitor_id only. No name/email/phone ever flows through this route.
//
// Wave 10 — accepts cross-origin requests (any embedded client site), scoped
// and validated by site_id via lib/sites/http.ts.

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { recordPushSubscription } from "@/lib/tracking/store";
import { resolveSiteFromRequest, jsonWithCors, corsPreflight } from "@/lib/sites/http";
import { isValidId, str, plainObject, rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const limit = rateLimit(rateLimitKey(req, "push-subscribe"), 20, 60_000);
    if (!limit.allowed) {
      return jsonWithCors(origin, { ok: false, error: "rate_limited" }, 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonWithCors(origin, { ok: false, error: "invalid_json" }, 400);
    }
    const b = plainObject(body);

    const resolved = await resolveSiteFromRequest(req, b.site_id);
    if ("error" in resolved) return resolved.error;
    const { site } = resolved;

    const visitorId = b.visitor_id;
    const sub = plainObject(b.subscription);
    const keys = plainObject(sub.keys);
    const endpoint = str(sub.endpoint, 1000);
    const p256dh = str(keys.p256dh, 300);
    const auth = str(keys.auth, 300);

    if (!isValidId(visitorId) || !endpoint || !p256dh || !auth) {
      return jsonWithCors(origin, { ok: false, error: "invalid_payload" }, 400);
    }

    await recordPushSubscription({ visitorId: visitorId as string, endpoint, p256dh, auth }, site.site_id);

    return jsonWithCors(origin, { ok: true });
  } catch (err) {
    console.error("[analytics] push-subscribe route error:", err);
    return jsonWithCors(origin, { ok: false, error: "internal_error" }, 500);
  }
}
