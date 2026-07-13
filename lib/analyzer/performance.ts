// Performance analyzer (Phase 2).
// Uses Google PageSpeed Insights (Lighthouse) when PAGESPEED_API_KEY is set,
// otherwise falls back to a lightweight heuristic estimate. Never throws.

import type { PerformanceResult } from "./types";

const TIMEOUT_MS = 15_000;

// Grade a Core Web Vital LCP (seconds) -> pushes issues for poor values.
function evaluateVitals(
  cwv: PerformanceResult["coreWebVitals"],
  mobileScore: number,
  issues: string[],
): void {
  if (typeof cwv.lcp === "number" && cwv.lcp > 2.5) {
    issues.push(
      `Slow Largest Contentful Paint (${cwv.lcp.toFixed(1)}s) — aim for under 2.5s.`,
    );
  }
  if (typeof cwv.cls === "number" && cwv.cls > 0.1) {
    issues.push(
      `High layout shift (CLS ${cwv.cls.toFixed(2)}) — aim for under 0.1.`,
    );
  }
  if (typeof cwv.inp === "number" && cwv.inp > 200) {
    issues.push(
      `Sluggish interactivity (INP ${Math.round(cwv.inp)}ms) — aim for under 200ms.`,
    );
  }
  if (typeof cwv.ttfb === "number" && cwv.ttfb > 800) {
    issues.push(
      `Slow server response (TTFB ${Math.round(cwv.ttfb)}ms) — aim for under 800ms.`,
    );
  }
  if (mobileScore < 50) {
    issues.push(`Poor mobile performance score (${mobileScore}/100).`);
  }
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ---- PageSpeed (real data) -------------------------------------------------

type LighthouseAudit = { numericValue?: number; score?: number | null };

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeWithPageSpeed(
  url: string,
  key: string,
): Promise<PerformanceResult> {
  const endpoint =
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
    `?url=${encodeURIComponent(url)}` +
    "&strategy=mobile&category=performance" +
    `&key=${encodeURIComponent(key)}`;

  const res = await fetchWithTimeout(endpoint, TIMEOUT_MS);
  if (!res.ok) {
    throw new Error(`PageSpeed HTTP ${res.status}`);
  }

  const data: any = await res.json();
  const lh = data?.lighthouseResult;
  if (!lh) throw new Error("PageSpeed: missing lighthouseResult");

  const audits: Record<string, LighthouseAudit> = lh.audits ?? {};
  const perfCategory = lh?.categories?.performance;

  const speedScore = clampScore(
    typeof perfCategory?.score === "number" ? perfCategory.score * 100 : 0,
  );

  // Field data (CrUX) when available, else lab metrics from audits.
  const loadingExp = data?.loadingExperience?.metrics ?? {};
  const fieldLcpMs = loadingExp?.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  const fieldCls = loadingExp?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  const fieldFcpMs = loadingExp?.FIRST_CONTENTFUL_PAINT_MS?.percentile;
  const fieldInpMs =
    loadingExp?.INTERACTION_TO_NEXT_PAINT?.percentile ??
    loadingExp?.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT?.percentile;

  const lcp =
    typeof fieldLcpMs === "number"
      ? fieldLcpMs / 1000
      : audits["largest-contentful-paint"]?.numericValue !== undefined
        ? (audits["largest-contentful-paint"].numericValue as number) / 1000
        : undefined;

  const fcp =
    typeof fieldFcpMs === "number"
      ? fieldFcpMs / 1000
      : audits["first-contentful-paint"]?.numericValue !== undefined
        ? (audits["first-contentful-paint"].numericValue as number) / 1000
        : undefined;

  const cls =
    typeof fieldCls === "number"
      ? fieldCls / 100
      : audits["cumulative-layout-shift"]?.numericValue;

  const inp =
    typeof fieldInpMs === "number"
      ? fieldInpMs
      : audits["interactive"]?.numericValue ??
        audits["experimental-interaction-to-next-paint"]?.numericValue;

  const ttfb = audits["server-response-time"]?.numericValue;

  const coreWebVitals: PerformanceResult["coreWebVitals"] = {
    lcp,
    inp,
    cls,
    fcp,
    ttfb,
  };

  // Mobile strategy score doubles as the mobile score here.
  const mobileScore = speedScore;
  const mobileFriendly = mobileScore >= 50;

  const issues: string[] = [];
  evaluateVitals(coreWebVitals, mobileScore, issues);

  return {
    speedScore,
    mobileScore,
    mobileFriendly,
    coreWebVitals,
    usedRealData: true,
    issues,
  };
}

// ---- Heuristic (no key / fallback) ----------------------------------------

async function analyzeHeuristic(url: string): Promise<PerformanceResult> {
  const issues: string[] = [
    "Performance metrics are estimated (no PageSpeed key) — connect a Google PageSpeed API key for lab-accurate scores.",
  ];

  let ttfbMs: number | undefined;
  let pageBytes: number | undefined;

  try {
    const start = performance.now();
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    const firstByte = performance.now();
    ttfbMs = firstByte - start;

    const body = await res.text();
    pageBytes = Buffer.byteLength(body, "utf8");
  } catch (err) {
    console.error("[analyzer:perf] heuristic fetch failed:", err);
    // Reachability unknown — return conservative low-confidence estimate.
    const coreWebVitals = { lcp: 4.5, inp: 300, cls: 0.2, fcp: 2.8, ttfb: 1200 };
    evaluateVitals(coreWebVitals, 35, issues);
    return {
      speedScore: 35,
      mobileScore: 35,
      mobileFriendly: false,
      coreWebVitals,
      usedRealData: false,
      issues,
    };
  }

  const sizeKb = (pageBytes ?? 0) / 1024;
  const ttfb = ttfbMs ?? 500;

  // Derive plausible CWV from measured TTFB + HTML weight.
  // FCP roughly follows TTFB; LCP scales with page weight; heavier pages shift.
  const fcp = (ttfb + 300 + sizeKb * 1.2) / 1000; // seconds
  const lcp = fcp + Math.min(3, sizeKb / 200); // seconds
  const cls = sizeKb > 500 ? 0.18 : sizeKb > 200 ? 0.08 : 0.03;
  const inp = 120 + Math.min(300, sizeKb * 0.4); // ms

  // Score: penalise slow TTFB, heavy pages, and slow LCP.
  let score = 100;
  score -= Math.min(35, Math.max(0, (ttfb - 200) / 30)); // TTFB penalty
  score -= Math.min(30, Math.max(0, (sizeKb - 150) / 20)); // weight penalty
  score -= Math.min(25, Math.max(0, (lcp - 2.5) * 12)); // LCP penalty
  const speedScore = clampScore(score);

  // Mobile typically renders slower than the lab desktop-ish measurement.
  const mobileScore = clampScore(speedScore - 12);
  const mobileFriendly = mobileScore >= 50;

  const coreWebVitals: PerformanceResult["coreWebVitals"] = {
    lcp: Math.round(lcp * 10) / 10,
    inp: Math.round(inp),
    cls,
    fcp: Math.round(fcp * 10) / 10,
    ttfb: Math.round(ttfb),
  };

  evaluateVitals(coreWebVitals, mobileScore, issues);

  if (sizeKb > 500) {
    issues.push(
      `Large HTML payload (~${Math.round(sizeKb)} KB) — consider trimming and compressing.`,
    );
  }

  return {
    speedScore,
    mobileScore,
    mobileFriendly,
    coreWebVitals,
    usedRealData: false,
    issues,
  };
}

// ---- Public API ------------------------------------------------------------

export async function analyzePerformance(url: string): Promise<PerformanceResult> {
  const key = process.env.PAGESPEED_API_KEY;

  if (key) {
    try {
      return await analyzeWithPageSpeed(url, key);
    } catch (err) {
      console.error("[analyzer:perf] PageSpeed failed, falling back:", err);
      // fall through to heuristic
    }
  }

  try {
    return await analyzeHeuristic(url);
  } catch (err) {
    console.error("[analyzer:perf] heuristic failed:", err);
    return {
      speedScore: 0,
      mobileScore: 0,
      mobileFriendly: false,
      coreWebVitals: {},
      usedRealData: false,
      issues: ["Performance analysis unavailable (all methods failed)."],
    };
  }
}
