// lib/opportunity/index.ts — orchestrator for the AI Opportunity Engine (Phase 3).
//
// analyzeOpportunity(input) takes a (Phase-1 enriched) RawLead — optionally with a
// pre-computed Phase-2 WebsiteAnalysis — and produces a full OpportunityReport:
// it scans the site (if needed), detects business gaps, turns the missing ones
// into sellable ServiceRecommendations, and wraps it all in a narrative pitch.
//
// Like the analyzer, this function NEVER throws. Every failure degrades to a
// partial-but-valid report so the API route can always return a JSON body.

import type {
  OpportunityInput,
  OpportunityReport,
  OpportunityGap,
  ServiceRecommendation,
} from "./types";
import type { WebsiteAnalysis } from "@/lib/analyzer/types";

import { analyzeWebsite } from "@/lib/analyzer";
import { detectGaps } from "./gaps";
import { recommendServices } from "./services";
import { generateRecommendation } from "./recommend";

const clamp = (n: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, Math.round(n)));

// Roughly map raw gap density (0..11 gaps) onto a 0-100 opportunity score.
// Used only as a fallback when the underlying analysis has no score of its own.
function scoreFromGaps(missingCount: number): number {
  return clamp(missingCount * 12);
}

export async function analyzeOpportunity(
  input: OpportunityInput,
): Promise<OpportunityReport> {
  const lead = input.lead;

  // 1. Obtain a WebsiteAnalysis: prefer the caller-supplied one, else scan the
  //    lead's website. Never let a scan failure abort the report.
  let analysis: WebsiteAnalysis | undefined = input.analysis;
  if (!analysis && lead.website) {
    try {
      analysis = await analyzeWebsite(lead.website);
    } catch (err) {
      console.error("[opportunity] website scan failed:", err);
      analysis = undefined;
    }
  }

  // 2. Detect gaps, then keep only the missing ones (the actual opportunities).
  let gaps: OpportunityGap[] = [];
  try {
    gaps = detectGaps(analysis, lead) ?? [];
  } catch (err) {
    console.error("[opportunity] gap detection failed:", err);
    gaps = [];
  }
  const missingGaps = gaps.filter((g) => g.missing);

  // 3. Turn gaps into ranked, sellable service recommendations.
  let services: ServiceRecommendation[] = [];
  try {
    services = recommendServices(gaps, lead) ?? [];
  } catch (err) {
    console.error("[opportunity] service recommendation failed:", err);
    services = [];
  }

  const company = lead.company || lead.name || analysis?.domain || "Unknown company";

  // 4. Narrative pitch (AI if configured, heuristic otherwise).
  let text = "";
  let usedAi = false;
  try {
    const rec = await generateRecommendation(company, missingGaps, services, lead);
    text = rec?.text ?? "";
    usedAi = Boolean(rec?.usedAi);
  } catch (err) {
    console.error("[opportunity] recommendation generation failed:", err);
    text = "";
    usedAi = false;
  }

  // 5. Derived scalars.
  const opportunityScore =
    analysis?.opportunityScore ?? scoreFromGaps(missingGaps.length);

  const totalPotentialValue = services.reduce(
    (sum, s) => sum + (Number.isFinite(s.estimatedValue) ? s.estimatedValue : 0),
    0,
  );

  const topServiceNames = services.slice(0, 3).map((s) => s.name);
  const headline = topServiceNames.length
    ? `Strong candidate for: ${topServiceNames.join(", ")}`
    : `No strong service gaps detected for ${company}`;

  const industry = lead.industry ?? lead.category;

  return {
    company,
    website: lead.website ?? analysis?.url,
    industry,
    gaps: missingGaps,
    services,
    opportunityScore,
    totalPotentialValue,
    headline,
    aiRecommendation: text,
    usedAi,
    analysis,
    generatedAt: Date.now(),
  };
}

// Re-export types + sub-functions for convenience.
export { detectGaps } from "./gaps";
export { recommendServices } from "./services";
export { generateRecommendation } from "./recommend";
export type {
  OpportunityInput,
  OpportunityReport,
  OpportunityGap,
  ServiceRecommendation,
  GapKey,
  ServiceKey,
} from "./types";
