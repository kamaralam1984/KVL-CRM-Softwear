// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// POST /api/analytics/collect — batched event ingestion from the tracking SDK.
//
// Wave 10 — accepts cross-origin requests (any embedded client site), scoped
// and validated by site_id via lib/sites/http.ts.

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { upsertVisitor, recordEvents } from "@/lib/tracking/store";
import { applyEventPoints } from "@/lib/intent/score";
import { TRACKED_EVENT_NAMES } from "@/lib/tracking/types";
import { resolveSiteFromRequest, jsonWithCors, corsPreflight } from "@/lib/sites/http";
import { MAX_EVENTS_PER_BATCH, isValidId, str, plainObject, rateLimitKey } from "../shared";

export const dynamic = "force-dynamic";

interface RawEvent {
  name: string;
  page_url?: string;
  properties?: Record<string, unknown>;
}

function normalizeEvents(input: unknown): RawEvent[] {
  if (!Array.isArray(input)) return [];
  const out: RawEvent[] = [];
  for (const raw of input.slice(0, MAX_EVENTS_PER_BATCH)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = str(r.name, 64);
    if (!TRACKED_EVENT_NAMES.includes(name as (typeof TRACKED_EVENT_NAMES)[number])) continue;
    out.push({ name, page_url: str(r.page_url, 512), properties: plainObject(r.properties) });
  }
  return out;
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const limit = rateLimit(rateLimitKey(req, "collect"), 120, 60_000);
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
    const events = normalizeEvents(b.events);
    if (!events.length) {
      return jsonWithCors(origin, { ok: true, accepted: 0 });
    }

    const validSessionId = isValidId(sessionId) ? (sessionId as string) : null;
    const pageViewIncrement = events.filter((e) => e.name === "page_view").length;

    await Promise.all([
      upsertVisitor({ visitorId, pageViewIncrement }, site.site_id),
      recordEvents(
        events.map((e) => ({
          visitorId,
          sessionId: validSessionId,
          eventName: e.name,
          pageUrl: e.page_url ?? "",
          properties: e.properties ?? {},
        })),
        site.site_id
      ),
      applyEventPoints(visitorId, events.map((e) => e.name), site.site_id),
    ]);

    return jsonWithCors(origin, { ok: true, accepted: events.length });
  } catch (err) {
    console.error("[analytics] collect route error:", err);
    return jsonWithCors(origin, { ok: false, error: "internal_error" }, 500);
  }
}
