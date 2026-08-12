// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
// GET /api/analytics/config — public, minimal SDK config. The one setting
// actually enforced by the tracking SDK this wave; other admin settings
// (consent mode default, retention days) are stored/editable but not yet
// wired into new runtime behavior.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { getAcquisitionSettings } from "@/lib/actions/acquisitionSettings";
import { rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = rateLimit(rateLimitKey(req, "config"), 60, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const settings = await getAcquisitionSettings();
    return NextResponse.json({ trackingEnabled: settings.tracking_enabled !== "false" });
  } catch (err) {
    console.error("[analytics] config route error:", err);
    // Fail open — a config-fetch failure should never disable tracking site-wide.
    return NextResponse.json({ trackingEnabled: true });
  }
}
