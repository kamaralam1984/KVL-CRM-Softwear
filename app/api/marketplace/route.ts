// Phase 14 — Marketplace catalog API.
// GET returns the curated module catalog. If MARKETPLACE_API_SECRET is set,
// a matching `Authorization: Bearer <secret>` header is required.

import { NextResponse } from "next/server";
import { CATALOG } from "@/lib/marketplace/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const secret = process.env.MARKETPLACE_API_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization") ?? "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (token !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.json({ modules: CATALOG, count: CATALOG.length });
  } catch (err) {
    console.error("[marketplace] GET /api/marketplace failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
