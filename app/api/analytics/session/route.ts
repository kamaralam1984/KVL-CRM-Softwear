// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// POST /api/analytics/session — session start/end + attribution capture.
// On "start": sets visitors.first_touch_* only if not already set, always
// refreshes last_touch_* (spec §3 — never overwrite first touch).
//
// Wave 10 — accepts cross-origin requests (any embedded client site), scoped
// and validated by site_id via lib/sites/http.ts.

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { recordSessionStart, recordSessionEnd } from "@/lib/tracking/store";
import { parseAttribution } from "@/lib/tracking/attribution";
import { recordTouchpoint } from "@/lib/attribution/touchpoints";
import { recordLandingPageHit } from "@/lib/attribution/landingPages";
import { applyVisitBonus } from "@/lib/intent/score";
import { resolveSiteFromRequest, jsonWithCors, corsPreflight } from "@/lib/sites/http";
import { isValidId, str, plainObject, rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const limit = rateLimit(rateLimitKey(req, "session"), 30, 60_000);
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
    const sessionId = b.session_id;
    const phase = b.phase === "end" ? "end" : "start";

    if (!isValidId(visitorId) || !isValidId(sessionId)) {
      return jsonWithCors(origin, { ok: false, error: "invalid_ids" }, 400);
    }

    if (phase === "end") {
      await recordSessionEnd(
        {
          sessionId: sessionId as string,
          exitPage: str(b.exit_page, 512),
          durationSeconds: typeof b.duration_seconds === "number" ? Math.max(0, Math.floor(b.duration_seconds)) : 0,
          pagesViewed: typeof b.pages_viewed === "number" ? Math.max(0, Math.floor(b.pages_viewed)) : 0,
        },
        site.site_id
      );
      return jsonWithCors(origin, { ok: true });
    }

    const pageUrl = str(b.page_url, 1024);
    const referrer = str(b.referrer, 1024);
    const host = req.headers.get("host") ?? "";
    const attribution = parseAttribution(pageUrl, referrer, host);
    const device = plainObject(b.device);
    const landingPage = str(b.landing_page || pageUrl, 512);

    const sessionInfo = await recordSessionStart(
      {
        sessionId: sessionId as string,
        visitorId: visitorId as string,
        landingPage,
        attribution,
        device: {
          device: str(device.device, 32),
          browser: str(device.browser, 32),
          os: str(device.os, 32),
          language: str(device.language, 16),
          timezone: str(device.timezone, 64),
        },
      },
      site.site_id
    );

    await Promise.all([
      recordTouchpoint(
        {
          visitorId: visitorId as string,
          sessionId: sessionId as string,
          source: attribution.source,
          medium: attribution.medium,
          campaign: attribution.campaign,
        },
        site.site_id
      ),
      recordLandingPageHit(landingPage, site.site_id),
      applyVisitBonus(visitorId as string, sessionInfo, site.site_id),
    ]);

    return jsonWithCors(origin, { ok: true, attribution });
  } catch (err) {
    console.error("[analytics] session route error:", err);
    return jsonWithCors(origin, { ok: false, error: "internal_error" }, 500);
  }
}
