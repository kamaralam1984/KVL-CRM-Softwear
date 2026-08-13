// Phase 17 — Lead Intelligence & Acquisition Engine
// POST /api/analytics/identify — records voluntary self-identification
// (email/phone/name submitted by the visitor themselves), then (Wave 3)
// resolves the visitor's history into a CRM Lead — dedupes against existing
// leads by phone/email, creates a new one only if nothing matches.
//
// Wave 10 — accepts cross-origin requests (any embedded client site); dedupe
// is scoped to site_id (lib/identity/resolve.ts) so two different sites'
// customers sharing a phone/email never merge into one lead.

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { markVisitorIdentified, recordEvents } from "@/lib/tracking/store";
import { resolveIdentity } from "@/lib/identity/resolve";
import { resolveSiteFromRequest, jsonWithCors, corsPreflight } from "@/lib/sites/http";
import { isValidId, str, plainObject, rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const limit = rateLimit(rateLimitKey(req, "identify"), 20, 60_000);
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
    if (!isValidId(visitorId)) {
      return jsonWithCors(origin, { ok: false, error: "invalid_visitor_id" }, 400);
    }

    const traits = plainObject(b.traits);
    const safeTraits = {
      name: str(traits.name, 200),
      email: str(traits.email, 200),
      phone: str(traits.phone, 40),
    };

    const [, , resolution] = await Promise.all([
      markVisitorIdentified(visitorId as string, site.site_id),
      recordEvents(
        [
          {
            visitorId: visitorId as string,
            sessionId: isValidId(sessionId) ? (sessionId as string) : null,
            eventName: "identify",
            pageUrl: str(b.page_url, 512),
            properties: safeTraits,
          },
        ],
        site.site_id
      ),
      resolveIdentity({ visitorId: visitorId as string, ...safeTraits }, site.site_id),
    ]);

    return jsonWithCors(origin, { ok: true, resolution });
  } catch (err) {
    console.error("[analytics] identify route error:", err);
    return jsonWithCors(origin, { ok: false, error: "internal_error" }, 500);
  }
}
