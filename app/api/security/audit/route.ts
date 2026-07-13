// Phase 15 — Enterprise Security: audit API route.
//
// NOTE: The canonical audit store (lib/security/audit.ts) lives in the browser
// (localStorage "crm_audit_log"), so this server route cannot read that store.
// GET therefore returns a scaffold describing the client store + any entries
// the caller echoes back. POST validates + normalizes an entry, rate-limits
// the request, and echoes the normalized record so a client can persist it via
// logAudit(). Wire a DB (e.g. lib/supabase) here to make it server-persistent.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import type { Action } from "@/lib/security/rbac";

export const dynamic = "force-dynamic";

const RATE_LIMIT = 30; // POSTs per window
const RATE_WINDOW_MS = 60_000;

interface NormalizedAuditEntry {
  actor: string;
  action: string;
  resource: string;
  detail?: string;
  time: number;
}

/** Optional bearer guard — enforced only when SECURITY_AUDIT_SECRET is set. */
function authorized(req: NextRequest): boolean {
  const secret = process.env.SECURITY_AUDIT_SECRET;
  if (!secret) return true; // no secret configured ⇒ open
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === secret;
}

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : "unknown";
  return `audit:${ip}`;
}

function normalize(body: unknown): NormalizedAuditEntry | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const actor = typeof b.actor === "string" ? b.actor.trim() : "";
  const action = typeof b.action === "string" ? b.action.trim() : "";
  const resource = typeof b.resource === "string" ? b.resource.trim() : "";
  if (!actor || !action || !resource) return null;
  const detail = typeof b.detail === "string" ? b.detail.trim() : undefined;
  return {
    actor,
    action,
    resource,
    ...(detail ? { detail } : {}),
    time: Date.now(),
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!authorized(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      note:
        "Audit entries are stored client-side in localStorage 'crm_audit_log' " +
        "(see lib/security/audit.ts). This endpoint is a scaffold; wire a DB to " +
        "return server-persisted entries.",
      store: "localStorage:crm_audit_log",
      entries: [] as NormalizedAuditEntry[],
      count: 0,
    });
  } catch (err) {
    console.error("[security] audit GET failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authorized(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(clientKey(req), RATE_LIMIT, RATE_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", resetAt: limit.resetAt },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit.limit),
            "X-RateLimit-Remaining": String(limit.remaining),
          },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const entry = normalize(body);
    if (!entry) {
      return NextResponse.json(
        { error: "invalid_entry", required: ["actor", "action", "resource"] },
        { status: 400 },
      );
    }

    // Echo the normalized entry; a client persists it via logAudit().
    // `action` is a free-form audit verb, distinct from RBAC Action below.
    const _rbacActions: Action[] = ["read", "create", "update", "delete", "admin"];
    void _rbacActions;

    return NextResponse.json(
      { ok: true, entry, remaining: limit.remaining },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      },
    );
  } catch (err) {
    console.error("[security] audit POST failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
