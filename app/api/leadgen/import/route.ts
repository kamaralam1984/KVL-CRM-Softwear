// POST /api/leadgen/import — import leads from CSV text or an API payload.
//
// Secure it with the same shared secret as /api/leadgen/run:
//   header:  Authorization: Bearer <LEADGEN_CRON_SECRET | CRON_SECRET>
// If neither env var is set, the route runs open (dev convenience).
//
// Body:
//   { "type": "csv", "data": "<raw csv text>" }
//   { "type": "api", "data": [ { "company": "..." }, ... ] }   // or { leads: [...] }
//
// Returns: { ok, count, leads } on success, or { ok:false, error } with 400/401.

import { NextRequest, NextResponse } from "next/server";
import { parseCsvLeads, parseApiLeads } from "@/lib/leadgen/import";
import type { RawLead } from "@/lib/leadgen/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Same guard style as /api/leadgen/run — only enforced if a secret is set.
  const secret = process.env.LEADGEN_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid or missing JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "body must be an object" }, { status: 400 });
  }

  const { type, data } = body as { type?: unknown; data?: unknown };

  if (type !== "csv" && type !== "api") {
    return NextResponse.json(
      { ok: false, error: 'type must be "csv" or "api"' },
      { status: 400 },
    );
  }

  try {
    let leads: RawLead[];

    if (type === "csv") {
      if (typeof data !== "string") {
        return NextResponse.json(
          { ok: false, error: "csv import requires data to be a string" },
          { status: 400 },
        );
      }
      leads = parseCsvLeads(data);
    } else {
      // type === "api": accept an array or a wrapper object.
      if (data === undefined || data === null) {
        return NextResponse.json(
          { ok: false, error: "api import requires data (array or { leads: [] })" },
          { status: 400 },
        );
      }
      leads = parseApiLeads(data);
    }

    return NextResponse.json({ ok: true, count: leads.length, leads });
  } catch (err) {
    console.error("[leadgen] import error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "import failed" },
      { status: 400 },
    );
  }
}
