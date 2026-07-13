// lib/analyzer/index.ts — orchestrator for the AI Website Analyzer (Phase 2).
//
// analyzeWebsite(url) fetches the homepage HTML once, fans out to the four
// sub-analyzers (SEO, performance, security, tech), then combines their scores
// into a single WebsiteAnalysis with an overall grade and a Business
// Opportunity Score (higher = weaker site = bigger sales opportunity).
//
// This function NEVER throws — every failure degrades to a low/partial score
// so the API route can always return a JSON body.

import type {
  WebsiteAnalysis,
  SeoResult,
  PerformanceResult,
  SecurityResult,
  TechResult,
  Grade,
} from "./types";

import { analyzeSeo } from "./seo";
import { analyzePerformance } from "./performance";
import { analyzeSecurity } from "./security";
import { analyzeTech } from "./tech";

const HOMEPAGE_TIMEOUT_MS = 8000;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Ensure the url has a scheme; default to https.
function normalizeUrl(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Best-effort hostname extraction (works even on malformed input).
function deriveDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      ?.split("?")[0] ?? url;
  }
}

// Fetch the homepage once. Returns null on any failure (timeout, DNS, non-2xx).
async function fetchHomepage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HOMEPAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": BROWSER_UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error("[analyzer] homepage fetch failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function gradeFor(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

const clamp = (n: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, n));

// Detect an aging CMS/stack that signals a lucrative rebuild opportunity.
function looksLikeLegacyStack(tech: TechResult): boolean {
  const hay = [tech.cms ?? "", ...(tech.technologies ?? [])]
    .join(" ")
    .toLowerCase();
  return /wordpress|joomla|drupal|wix|godaddy|squarespace|php 5|jquery 1/.test(
    hay,
  );
}

// Build a plain-English summary from the highest-impact issues (no AI call).
function buildSummary(
  reachable: boolean,
  domain: string,
  overallScore: number,
  seo: SeoResult,
  perf: PerformanceResult,
  sec: SecurityResult,
  tech: TechResult,
): string {
  if (!reachable) {
    return `${domain} could not be reached, which itself is a major red flag for potential customers and search engines.`;
  }

  const gaps: string[] = [];
  if (!sec.ssl) gaps.push("no valid HTTPS/SSL");
  if (sec.score < 60) gaps.push("weak security headers");
  if (seo.score < 60) gaps.push("poor SEO");
  if (perf.speedScore < 60) gaps.push("slow page speed");
  if (!perf.mobileFriendly) gaps.push("not mobile-friendly");
  if (tech.accessibilityScore < 60) gaps.push("accessibility problems");
  if (looksLikeLegacyStack(tech)) {
    gaps.push(`an aging ${tech.cms ?? "CMS"} stack`);
  }

  // Pull a couple of the most concrete issues to make it specific.
  const concrete = [
    ...sec.issues,
    ...seo.issues,
    ...perf.issues,
    ...tech.issues,
  ]
    .filter(Boolean)
    .slice(0, 2);

  if (gaps.length === 0) {
    return `${domain} scores ${overallScore}/100 overall and is in reasonably good shape, so the pitch is optimization and growth rather than a rescue.`;
  }

  const gapList =
    gaps.length === 1
      ? gaps[0]
      : `${gaps.slice(0, -1).join(", ")} and ${gaps[gaps.length - 1]}`;

  const detail = concrete.length ? ` Notably: ${concrete.join("; ")}.` : "";
  return `${domain} scores ${overallScore}/100 with ${gapList} — clear openings to pitch a fix.${detail}`;
}

// Safe fallbacks so a rejected sub-analyzer never breaks the whole analysis.
const fallbackSeo = (): SeoResult => ({
  score: 0,
  issues: ["SEO analysis failed to run."],
});
const fallbackPerf = (): PerformanceResult => ({
  speedScore: 0,
  mobileScore: 0,
  mobileFriendly: false,
  coreWebVitals: {},
  usedRealData: false,
  issues: ["Performance analysis failed to run."],
});
const fallbackSec = (): SecurityResult => ({
  score: 0,
  ssl: false,
  headers: {},
  missingHeaders: [],
  issues: ["Security analysis failed to run."],
});
const fallbackTech = (): TechResult => ({
  technologies: [],
  brokenLinks: [],
  accessibilityScore: 0,
  issues: ["Tech analysis failed to run."],
});

async function settle<T>(p: Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    console.error("[analyzer] sub-analyzer error:", err);
    return fallback();
  }
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const normalized = normalizeUrl(url);
  const domain = deriveDomain(normalized);

  // One homepage fetch, shared with the HTML-consuming analyzers.
  const html = await fetchHomepage(normalized);
  const reachable = html !== null;

  // SEO + tech can reuse the HTML; performance + security fetch their own.
  const [seo, performance, security, tech] = await Promise.all([
    settle(analyzeSeo(normalized, html ?? undefined), fallbackSeo),
    settle(analyzePerformance(normalized), fallbackPerf),
    settle(analyzeSecurity(normalized), fallbackSec),
    settle(analyzeTech(normalized, html ?? undefined), fallbackTech),
  ]);

  // Weighted overall score.
  const overallScore = clamp(
    Math.round(
      seo.score * 0.3 +
        performance.speedScore * 0.3 +
        security.score * 0.25 +
        tech.accessibilityScore * 0.15,
    ),
  );

  const grade = gradeFor(overallScore);

  // Opportunity: base is the inverse of quality, nudged UP for the specific
  // weaknesses that make a site an easy, lucrative sales target.
  let opportunity = 100 - overallScore;
  if (!reachable) opportunity += 20;
  if (!security.ssl) opportunity += 10;
  if (!performance.mobileFriendly) opportunity += 8;
  if (performance.speedScore < 50) opportunity += 6;
  if (seo.score < 50) opportunity += 6;
  if (looksLikeLegacyStack(tech)) opportunity += 10;
  const opportunityScore = clamp(Math.round(opportunity));

  const summary = buildSummary(
    reachable,
    domain,
    overallScore,
    seo,
    performance,
    security,
    tech,
  );

  return {
    url: normalized,
    domain,
    reachable,
    seo,
    performance,
    security,
    tech,
    overallScore,
    grade,
    opportunityScore,
    summary,
    analyzedAt: Date.now(),
  };
}

// Re-export sub-analyzers + types for convenience.
export { analyzeSeo } from "./seo";
export { analyzePerformance } from "./performance";
export { analyzeSecurity } from "./security";
export { analyzeTech } from "./tech";
export type {
  WebsiteAnalysis,
  SeoResult,
  PerformanceResult,
  SecurityResult,
  TechResult,
  Grade,
} from "./types";
