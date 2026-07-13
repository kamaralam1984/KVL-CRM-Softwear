// POST /api/opportunity/analyze — run the AI Opportunity Engine for one lead.
//
// Body (either shape):
//   { "lead": RawLead, "analysis"?: WebsiteAnalysis }  → full report for the lead
//   { "url": "example.com" }                            → wraps url into a minimal
//                                                          RawLead and reports on it
//
// Returns the full OpportunityReport JSON.
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <LEADGEN_CRON_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { analyzeOpportunity } from "@/lib/opportunity";
import type { RawLead } from "@/lib/leadgen/types";
import type { WebsiteAnalysis } from "@/lib/analyzer/types";

// A report may trigger a full website scan (network fetches) — give it room.
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

// Best-effort hostname extraction for building a minimal lead from a bare url.
function deriveDomain(url: string): string {
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./i, "");
  } catch {
    return url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      ?.split("?")[0] ?? url;
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  let lead: RawLead | undefined;
  let analysis: WebsiteAnalysis | undefined;
  let url: string | undefined;

  try {
    const body = await req.json();
    if (body?.lead && typeof body.lead === "object") {
      lead = body.lead as RawLead;
    }
    if (body?.analysis && typeof body.analysis === "object") {
      analysis = body.analysis as WebsiteAnalysis;
    }
    if (typeof body?.url === "string") {
      url = body.url;
    }
  } catch {
    // no/invalid JSON body → inputs stay undefined
  }

  // If only a url was provided, synthesize a minimal RawLead for it.
  if (!lead && url && url.trim()) {
    const domain = deriveDomain(url);
    lead = {
      name: domain,
      company: domain,
      website: url,
      source: "company_website",
    };
  }

  if (!lead) {
    return NextResponse.json(
      { error: "missing 'lead' or 'url' in request body" },
      { status: 400 },
    );
  }

  try {
    const report = await analyzeOpportunity({ lead, analysis });
    return NextResponse.json(report);
  } catch (err) {
    // analyzeOpportunity never throws, but guard anyway so we always return JSON.
    console.error("[opportunity] analyze error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "analysis failed" },
      { status: 500 },
    );
  }
}
