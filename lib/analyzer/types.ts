// Shared types for the AI Website Analyzer (Phase 2).
// Each analyzer module returns its own typed slice; the orchestrator combines
// them into a WebsiteAnalysis with a Business Opportunity Score.

export type Grade = "A" | "B" | "C" | "D" | "F";

export type SeoResult = {
  score: number;                 // 0-100
  title?: string;
  titleLength?: number;
  metaDescription?: string;
  metaDescriptionLength?: number;
  h1Count?: number;
  headingsOutlineOk?: boolean;
  hasSchema?: boolean;           // JSON-LD / microdata present
  hasCanonical?: boolean;
  hasRobotsTxt?: boolean;
  hasSitemap?: boolean;
  hasOpenGraph?: boolean;
  hasFavicon?: boolean;
  imagesMissingAlt?: number;
  issues: string[];              // human-readable problems found
};

export type PerformanceResult = {
  speedScore: number;            // 0-100
  mobileScore: number;           // 0-100
  mobileFriendly: boolean;
  coreWebVitals: {
    lcp?: number;                // Largest Contentful Paint (s)
    inp?: number;                // Interaction to Next Paint (ms)
    cls?: number;                // Cumulative Layout Shift
    fcp?: number;                // First Contentful Paint (s)
    ttfb?: number;               // Time To First Byte (ms)
  };
  usedRealData: boolean;         // false = heuristic/mock (no PageSpeed key)
  issues: string[];
};

export type SecurityResult = {
  score: number;                 // 0-100
  ssl: boolean;                  // https reachable / valid
  headers: {
    hsts?: boolean;
    csp?: boolean;
    xFrameOptions?: boolean;
    xContentTypeOptions?: boolean;
    referrerPolicy?: boolean;
    permissionsPolicy?: boolean;
  };
  missingHeaders: string[];
  issues: string[];
};

export type TechResult = {
  cms?: string;                  // WordPress / Shopify / Wix / custom …
  hosting?: string;              // Cloudflare / AWS / Vercel / GoDaddy …
  technologies: string[];        // full detected stack
  brokenLinks: string[];         // sampled broken/404 links
  accessibilityScore: number;    // 0-100 (heuristic)
  issues: string[];
};

// Full analysis of one company website.
export type WebsiteAnalysis = {
  url: string;
  domain: string;
  reachable: boolean;
  seo: SeoResult;
  performance: PerformanceResult;
  security: SecurityResult;
  tech: TechResult;
  overallScore: number;          // weighted average of the four
  grade: Grade;
  // Higher = bigger sales opportunity (worse site = more to sell/fix).
  opportunityScore: number;      // 0-100
  summary: string;
  analyzedAt: number;            // epoch ms (stamped by caller)
};

export const emptyIssues = (): string[] => [];
