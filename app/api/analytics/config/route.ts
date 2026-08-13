// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
// GET /api/analytics/config — public, minimal SDK config. The one setting
// actually enforced by the tracking SDK this wave; other admin settings
// (consent mode default, retention days) are stored/editable but not yet
// wired into new runtime behavior.
//
// Wave 10 — `getAcquisitionSettings()` stays scoped to the default/KVL site
// only (no per-site settings UI yet — see lib/actions/acquisitionSettings.ts),
// so every site currently gets the same tracking_enabled value. Still
// validates the requesting site_id/Origin so an unregistered domain can't
// probe this endpoint at all.

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { getAcquisitionSettings } from "@/lib/actions/acquisitionSettings";
import { resolveSiteFromRequest, jsonWithCors, corsPreflight } from "@/lib/sites/http";
import { rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const limit = rateLimit(rateLimitKey(req, "config"), 60, 60_000);
    if (!limit.allowed) {
      return jsonWithCors(origin, { ok: false, error: "rate_limited" }, 429);
    }

    const resolved = await resolveSiteFromRequest(req, req.nextUrl.searchParams.get("site_id"));
    if ("error" in resolved) return resolved.error;

    const settings = await getAcquisitionSettings();
    return jsonWithCors(origin, { trackingEnabled: settings.tracking_enabled !== "false" });
  } catch (err) {
    console.error("[analytics] config route error:", err);
    // Fail open — a config-fetch failure should never disable tracking site-wide.
    return jsonWithCors(origin, { trackingEnabled: true });
  }
}
