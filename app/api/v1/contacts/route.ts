// Phase 40 — Public API. "Contacts" is the public-facing name for this
// codebase's `customers` table (there's no separate contacts concept) —
// named to match common CRM API vocabulary. Same auth/rate-limit/reuse
// pattern as app/api/v1/leads/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { authenticateApiKey } from "@/lib/apiKeys/auth";
import { getCustomers, createCustomer } from "@/lib/actions/customers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = rateLimit(`api:v1:contacts:${clientIp(req)}`, 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const contacts = await getCustomers();
    return NextResponse.json({ data: contacts.slice(0, 50) });
  } catch (err) {
    console.error("[api/v1/contacts] GET error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`api:v1:contacts:${clientIp(req)}`, 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const contact = await createCustomer({
      name: body.name,
      contact: body.contact ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      value: Number(body.value) || 0,
      segment: body.segment ?? "SMB",
      health: 80,
      status: "active",
      avatar: "",
      since: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      nextRenewal: "",
    });
    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (err) {
    console.error("[api/v1/contacts] POST error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
