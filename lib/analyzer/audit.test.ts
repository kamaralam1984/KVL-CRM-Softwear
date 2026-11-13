import { describe, it, expect } from "vitest";
import { buildAudit } from "./audit";
import type { WebsiteAnalysis } from "./types";

const good = (): WebsiteAnalysis => ({
  url: "https://example.com", domain: "example.com", reachable: true, analyzedAt: 1,
  seo: { score: 100, title: "A good page title for example dot com", titleLength: 37, metaDescription: "x".repeat(120), metaDescriptionLength: 120,
    h1Count: 1, headingsOutlineOk: true, hasSchema: true, hasCanonical: true, hasRobotsTxt: true, hasSitemap: true, hasOpenGraph: true, hasFavicon: true, imagesMissingAlt: 0, issues: [] },
  performance: { speedScore: 95, mobileScore: 90, mobileFriendly: true, coreWebVitals: { lcp: 1.4, cls: 0.02 }, usedRealData: true, issues: [] },
  security: { score: 100, ssl: true, headers: { hsts: true, csp: true, xFrameOptions: true, xContentTypeOptions: true, referrerPolicy: true, permissionsPolicy: true }, missingHeaders: [], issues: [] },
  tech: { technologies: [], brokenLinks: [], accessibilityScore: 95, issues: [] },
  overallScore: 97, grade: "A", opportunityScore: 5, summary: "",
});

describe("buildAudit", () => {
  it("a healthy site scores 100 with every check passing", () => {
    const r = buildAudit(good());
    expect(r.score).toBe(100);
    expect(r.items.every((i) => i.status === "pass")).toBe(true);
    expect(r.estimatedSpeed).toBe(false);
  });

  it("reports only what is really wrong, with real numbers and fix steps", () => {
    const a = good();
    a.seo.metaDescription = undefined; a.seo.imagesMissingAlt = 3; a.seo.hasSitemap = false;
    a.tech.brokenLinks = ["https://example.com/a", "https://example.com/b"];
    a.security.headers.csp = false;
    const r = buildAudit(a);
    const by = Object.fromEntries(r.items.map((i) => [i.id, i]));
    expect(by.meta.status).toBe("fail");
    expect(by.alt.desc).toMatch(/^3 images/);
    expect(by.sitemap.status).toBe("warn");
    expect(by.links.status).toBe("fail");
    expect(by.links.desc).toMatch(/2 broken links/);
    expect(by.headers.desc).toMatch(/Content-Security-Policy/);
    expect(by.headers.fix?.snippet).toMatch(/^Content-Security-Policy:/);
    expect(by.title.status).toBe("pass");
    expect(r.score).toBeLessThan(100);
  });

  it("flags too-short / too-long titles as warnings and marks speed as estimated without a PageSpeed key", () => {
    const a = good();
    a.seo.title = "Hi"; a.seo.titleLength = 2;
    a.performance.usedRealData = false;
    const r = buildAudit(a);
    expect(r.items.find((i) => i.id === "title")?.status).toBe("warn");
    expect(r.estimatedSpeed).toBe(true);
    expect(r.items.find((i) => i.id === "speed")?.desc).toMatch(/estimated/);
  });

  it("an unreachable site is a single critical item with score 0", () => {
    const a = good(); a.reachable = false;
    const r = buildAudit(a);
    expect(r.score).toBe(0);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].status).toBe("fail");
  });
});
