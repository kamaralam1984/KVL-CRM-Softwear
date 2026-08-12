// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// POST /api/analytics/collect — batched event ingestion from the tracking SDK.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { upsertVisitor, recordEvents } from "@/lib/tracking/store";
import { applyEventPoints } from "@/lib/intent/score";
import { TRACKED_EVENT_NAMES } from "@/lib/tracking/types";
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

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(rateLimitKey(req, "collect"), 120, 60_000);
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
    const events = normalizeEvents(b.events);
    if (!events.length) {
      return NextResponse.json({ ok: true, accepted: 0 });
    }

    const validSessionId = isValidId(sessionId) ? (sessionId as string) : null;
    const pageViewIncrement = events.filter((e) => e.name === "page_view").length;

    await Promise.all([
      upsertVisitor({ visitorId, pageViewIncrement }),
      recordEvents(
        events.map((e) => ({
          visitorId,
          sessionId: validSessionId,
          eventName: e.name,
          pageUrl: e.page_url ?? "",
          properties: e.properties ?? {},
        }))
      ),
      applyEventPoints(visitorId, events.map((e) => e.name)),
    ]);

    return NextResponse.json({ ok: true, accepted: events.length });
  } catch (err) {
    console.error("[analytics] collect route error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
