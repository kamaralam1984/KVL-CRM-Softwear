// Phase 40 — Public API. GET lists, POST creates — authenticated via
// Authorization: Bearer <api key> (see lib/apiKeys/auth.ts), rate-limited
// like every other public-facing route in this codebase. Reuses the exact
// same getLeads/createLead the core CRM UI calls — no parallel data path.
//
// NOTE: `leads` has no site_id column (predates this app's multi-site
// model, confirmed by schema review) — this endpoint operates on the one
// global leads table, same as the CRM's own Leads section does today. The
// api_keys.site_id field exists for a future multi-tenant story, not
// enforced here since the underlying table can't support it yet.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { authenticateApiKey } from "@/lib/apiKeys/auth";
import { getLeads, createLead } from "@/lib/actions/leads";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = rateLimit(`api:v1:leads:${clientIp(req)}`, 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const leads = await getLeads();
    return NextResponse.json({ data: leads.slice(0, 50) });
  } catch (err) {
    console.error("[api/v1/leads] GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`api:v1:leads:${clientIp(req)}`, 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const lead = await createLead({
      name: body.name,
      company: body.company ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      score: 50,
      status: "warm",
      stage: "Discovery",
      value: Number(body.value) || 0,
      owner: body.owner ?? "",
      avatar: "",
      last_contact: "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      source: body.source ?? "api",
      campaign: "",
      visitor_id: null,
    });
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (err) {
    console.error("[api/v1/leads] POST error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
