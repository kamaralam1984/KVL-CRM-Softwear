// Phase 4 — Enhanced AI Lead Scoring: deterministic heuristic factor engine.
// Pure function. Produces an explainable, weighted 0-100 score plus confidence,
// close probability and an estimated deal value. Used directly, and as the
// fallback whenever the AI path (./ai) is unavailable or fails.

import type { ScoreFactor, ScoreInput } from "./types";
import type { RawLead } from "@/lib/leadgen/types";

const clamp = (n: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, n));

const round = (n: number): number => Math.round(n);

// --- individual factor scorers (each returns 0-100) ---------------------------

// 1. contact_completeness — how reachable is this lead?
function contactCompleteness(lead: RawLead): { value: number; note: string } {
  const dm = lead.decisionMaker;
  const checks = [
    Boolean(lead.email || dm?.email),
    Boolean(lead.phone || dm?.phone),
    Boolean(lead.website),
    Boolean(dm?.name || dm?.title || dm?.linkedin),
  ];
  const hit = checks.filter(Boolean).length;
  return {
    value: clamp((hit / checks.length) * 100),
    note: `${hit}/4 contact channels present`,
  };
}

// 2. website_quality — from the Phase-2 scan when we have it, else neutral.
function websiteQuality(input: ScoreInput): { value: number; note: string } {
  const overall = input.opportunity?.analysis?.overallScore;
  if (typeof overall === "number") {
    return { value: clamp(overall), note: `website scan score ${round(overall)}` };
  }
  if (input.lead.website) {
    return { value: 55, note: "website exists, not scanned" };
  }
  return { value: 50, note: "no website signal (neutral)" };
}

// 3. company_fit — right-sized company + a known industry fits our ICP best.
function companyFit(lead: RawLead): { value: number; note: string } {
  let v = 40;
  const emp = lead.employeeCount;
  if (typeof emp === "number") {
    // Sweet spot: 10-200 employees (enough budget, not enterprise-slow).
    if (emp >= 10 && emp <= 200) v = 90;
    else if (emp >= 5 && emp < 10) v = 70;
    else if (emp > 200 && emp <= 1000) v = 65;
    else if (emp > 1000) v = 45;
    else v = 50; // 1-4 employees: tiny
  } else {
    v = 50; // unknown size — neutral
  }
  if (lead.industry) v += 10;
  else v -= 5;
  return {
    value: clamp(v),
    note: emp ? `${emp} employees${lead.industry ? `, ${lead.industry}` : ""}` : "size unknown",
  };
}

// 4. opportunity_value — scaled from Phase-3 total potential value.
function opportunityValue(input: ScoreInput): { value: number; note: string } {
  const total = input.opportunity?.totalPotentialValue;
  if (typeof total !== "number" || total <= 0) {
    return { value: 45, note: "no opportunity report" };
  }
  // $0 -> ~0, $100k+ -> ~100. Diminishing past 100k.
  const scaled = clamp((total / 100000) * 100);
  return { value: scaled, note: `$${Math.round(total).toLocaleString()} potential` };
}

// 5. engagement_signal — how "warm" the source is.
function engagementSignal(lead: RawLead): { value: number; note: string } {
  const map: Partial<Record<RawLead["source"], number>> = {
    web_form: 95,          // inbound, self-identified intent
    api_import: 80,
    google_news: 78,       // buying-signal (funding, expansion)
    linkedin: 70,
    apollo: 62,
    hunter: 60,
    crunchbase: 60,
    company_website: 58,
    manual_import: 55,
    csv_import: 50,
    google_search: 50,
    google_maps: 48,       // cold directory
    goodfirms: 42,
    clutch: 42,
    indiamart: 40,
    tradeindia: 40,
    startup_india: 40,
    mca: 38,
    scrape: 35,            // fully cold
  };
  const v = map[lead.source] ?? 45;
  return { value: clamp(v), note: `source: ${lead.source}` };
}

// --- confidence: more real data → more trustworthy score ----------------------
function confidenceFrom(input: ScoreInput): number {
  const l = input.lead;
  const signals = [
    Boolean(l.email),
    Boolean(l.phone),
    Boolean(l.website),
    Boolean(l.industry),
    typeof l.employeeCount === "number",
    Boolean(l.decisionMaker?.name),
    Array.isArray(l.techStack) && l.techStack.length > 0,
    Boolean(input.opportunity),
    typeof input.opportunity?.analysis?.overallScore === "number",
    Boolean(input.idealCustomer),
  ];
  const hit = signals.filter(Boolean).length;
  // Floor of 40 (heuristic is always somewhat usable), up to ~95.
  return clamp(40 + (hit / signals.length) * 55);
}

// --- estimated value fallback when no opportunity report ----------------------
function estimatedValueFrom(input: ScoreInput): number {
  const total = input.opportunity?.totalPotentialValue;
  if (typeof total === "number" && total > 0) return Math.round(total);
  const emp = input.lead.employeeCount ?? 0;
  if (emp > 1000) return 120000;
  if (emp > 200) return 60000;
  if (emp >= 10) return 25000;
  if (emp >= 5) return 15000;
  return 10000;
}

// --- main ---------------------------------------------------------------------

export function computeFactors(input: ScoreInput): {
  factors: ScoreFactor[];
  score: number;
  confidence: number;
  closeProbability: number;
  estimatedValue: number;
} {
  const { lead } = input;

  const cc = contactCompleteness(lead);
  const wq = websiteQuality(input);
  const cf = companyFit(lead);
  const ov = opportunityValue(input);
  const es = engagementSignal(lead);

  const factors: ScoreFactor[] = [
    { key: "contact_completeness", label: "Contact Completeness", weight: 0.2, value: round(cc.value), note: cc.note },
    { key: "website_quality", label: "Website Quality", weight: 0.15, value: round(wq.value), note: wq.note },
    { key: "company_fit", label: "Company Fit", weight: 0.2, value: round(cf.value), note: cf.note },
    { key: "opportunity_value", label: "Opportunity Value", weight: 0.25, value: round(ov.value), note: ov.note },
    { key: "engagement_signal", label: "Engagement Signal", weight: 0.2, value: round(es.value), note: es.note },
  ];

  const score = round(
    factors.reduce((sum, f) => sum + f.value * f.weight, 0),
  );

  const confidence = round(confidenceFrom(input));

  // Close probability: overall fit blended with the strongest "ready to buy"
  // signals (concrete opportunity value + warm source).
  const closeProbability = round(
    clamp(score * 0.5 + ov.value * 0.3 + es.value * 0.2),
  );

  const estimatedValue = estimatedValueFrom(input);

  return { factors, score: clamp(score), confidence, closeProbability, estimatedValue };
}
