// POST /api/analyzer/scan — run the AI Website Analyzer against one URL.
//
// Body:  { "url": "example.com" }  → returns the full WebsiteAnalysis JSON.
// Also supports GET /api/analyzer/scan?url=example.com for quick manual testing.
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <LEADGEN_CRON_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsite } from "@/lib/analyzer";

// A full scan fans out to four analyzers (incl. network fetches) — give it room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.LEADGEN_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null; // open in dev when unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  let url: string | undefined;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url : undefined;
  } catch {
    // no/invalid JSON body → url stays undefined
  }

  if (!url || !url.trim()) {
    return NextResponse.json(
      { error: "missing 'url' in request body" },
      { status: 400 },
    );
  }

  try {
    const analysis = await analyzeWebsite(url);
    return NextResponse.json(analysis);
  } catch (err) {
    // analyzeWebsite never throws, but guard anyway so we always return JSON.
    console.error("[analyzer] scan error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "scan failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.trim()) {
    return NextResponse.json(
      { error: "missing 'url' query parameter" },
      { status: 400 },
    );
  }

  try {
    const analysis = await analyzeWebsite(url);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[analyzer] scan error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "scan failed" },
      { status: 500 },
    );
  }
}
