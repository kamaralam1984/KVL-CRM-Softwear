// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// POST /api/analytics/consent — records a visitor's tracking consent decision.
//
// Wave 10 — accepts cross-origin requests (any embedded client site), scoped
// and validated by site_id via lib/sites/http.ts.

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { recordConsent } from "@/lib/tracking/store";
import { resolveSiteFromRequest, jsonWithCors, corsPreflight } from "@/lib/sites/http";
import { isValidId, plainObject, rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const limit = rateLimit(rateLimitKey(req, "consent"), 20, 60_000);
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
    const status = b.status === "granted" || b.status === "denied" ? b.status : null;

    if (!isValidId(visitorId) || !status) {
      return jsonWithCors(origin, { ok: false, error: "invalid_payload" }, 400);
    }

    await recordConsent(
      {
        visitorId: visitorId as string,
        status,
        categories: plainObject(b.categories),
      },
      site.site_id
    );

    return jsonWithCors(origin, { ok: true });
  } catch (err) {
    console.error("[analytics] consent route error:", err);
    return jsonWithCors(origin, { ok: false, error: "internal_error" }, 500);
  }
}
