// SEO Suite → "SEO Audit" tab: turns a real WebsiteAnalysis into a pass / warning / critical
// checklist with concrete fix instructions. Pure (no I/O) so it is unit-testable; the network
// work happens in lib/analyzer/index.ts and lib/actions/seoAudit.ts.

import type { WebsiteAnalysis } from "./types";

export type AuditStatus = "pass" | "warn" | "fail";
export type AuditGroup = "SEO" | "Speed" | "Security" | "Links & access";

export interface AuditItem {
  id: string;
  group: AuditGroup;
  label: string;
  desc: string;
  status: AuditStatus;
  fix?: { steps: string[]; snippet?: string };
}

export interface AuditReport {
  url: string;
  domain: string;
  reachable: boolean;
  /** 0–100: pass = 1 point, warning = ½ point, critical = 0. */
  score: number;
  items: AuditItem[];
  /** True when speed figures are estimates (no PageSpeed API key configured). */
  estimatedSpeed: boolean;
  checkedAt: number;
}

const HEADER_FIX: Record<string, string> = {
  hsts: "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
  csp: "Content-Security-Policy: default-src 'self'; img-src 'self' https: data:",
  xFrameOptions: "X-Frame-Options: SAMEORIGIN",
  xContentTypeOptions: "X-Content-Type-Options: nosniff",
  referrerPolicy: "Referrer-Policy: strict-origin-when-cross-origin",
  permissionsPolicy: "Permissions-Policy: camera=(), microphone=(), geolocation=()",
};
const HEADER_LABEL: Record<string, string> = {
  hsts: "HSTS", csp: "Content-Security-Policy", xFrameOptions: "X-Frame-Options",
  xContentTypeOptions: "X-Content-Type-Options", referrerPolicy: "Referrer-Policy", permissionsPolicy: "Permissions-Policy",
};

function lengthCheck(
  id: string, label: string, what: string, text: string | undefined, len: number, min: number, max: number, group: AuditGroup,
  fix: AuditItem["fix"],
): AuditItem {
  if (!text) return { id, group, label, status: "fail", desc: `No ${what} found on the page.`, fix };
  if (len < min) return { id, group, label, status: "warn", desc: `${what[0].toUpperCase() + what.slice(1)} is only ${len} characters (aim for ${min}–${max}).`, fix };
  if (len > max) return { id, group, label, status: "warn", desc: `${what[0].toUpperCase() + what.slice(1)} is ${len} characters — Google will cut it off after about ${max}.`, fix };
  return { id, group, label, status: "pass", desc: `${len} characters — good length.` };
}

export function buildAudit(a: WebsiteAnalysis): AuditReport {
  const base = { url: a.url, domain: a.domain, reachable: a.reachable, checkedAt: a.analyzedAt, estimatedSpeed: !a.performance.usedRealData };

  if (!a.reachable) {
    return {
      ...base, score: 0,
      items: [{
        id: "reachable", group: "SEO", label: "Site reachable", status: "fail",
        desc: `${a.domain} could not be loaded. Check that the address is right and the site is online.`,
        fix: { steps: ["Open the address in your browser to confirm it loads.", "Check DNS, hosting and SSL, then run the audit again."] },
      }],
    };
  }

  const { seo, performance: perf, security: sec, tech } = a;
  const items: AuditItem[] = [];

  // ── SEO ──
  items.push(lengthCheck("title", "Page title", "<title> tag", seo.title, seo.titleLength ?? 0, 30, 60, "SEO", {
    steps: ["Write a unique title of 30–60 characters.", "Put the main keyword first and the brand last."],
    snippet: "<title>Primary keyword — what you offer | Brand</title>",
  }));
  items.push(lengthCheck("meta", "Meta description", "meta description", seo.metaDescription, seo.metaDescriptionLength ?? 0, 70, 160, "SEO", {
    steps: ["Add a 70–160 character summary that makes people want to click.", "Make it unique for every page."],
    snippet: '<meta name="description" content="One clear sentence about this page and its benefit." />',
  }));
  const h1 = seo.h1Count ?? 0;
  items.push(h1 === 1
    ? { id: "h1", group: "SEO", label: "Single H1 heading", status: "pass", desc: "The page has exactly one H1." }
    : { id: "h1", group: "SEO", label: "Single H1 heading", status: h1 === 0 ? "fail" : "warn",
        desc: h1 === 0 ? "No H1 heading found." : `${h1} H1 headings found — use exactly one.`,
        fix: { steps: ["Use one <h1> that states the page topic.", "Turn the others into <h2>/<h3>."], snippet: "<h1>Main topic of the page</h1>" } });
  items.push(seo.headingsOutlineOk === false
    ? { id: "outline", group: "SEO", label: "Heading structure", status: "warn", desc: "No <h2> subheadings — the content outline is weak.",
        fix: { steps: ["Break the page into sections, each with an <h2>."] } }
    : { id: "outline", group: "SEO", label: "Heading structure", status: "pass", desc: "Subheadings are present." });
  items.push(seo.hasSchema
    ? { id: "schema", group: "SEO", label: "Structured data", status: "pass", desc: "JSON-LD / microdata found." }
    : { id: "schema", group: "SEO", label: "Structured data", status: "warn", desc: "No structured data (JSON-LD) found, so no rich results in Google.",
        fix: { steps: ["Add a JSON-LD block describing your organisation or product."],
          snippet: '<script type="application/ld+json">\n{"@context":"https://schema.org","@type":"Organization","name":"Your Brand","url":"https://your-site.com"}\n</script>' } });
  items.push(seo.hasCanonical
    ? { id: "canonical", group: "SEO", label: "Canonical URL", status: "pass", desc: "A canonical link is set." }
    : { id: "canonical", group: "SEO", label: "Canonical URL", status: "warn", desc: "No canonical link — duplicate URLs can split your ranking.",
        fix: { steps: ["Add a canonical link pointing at the preferred URL of each page."], snippet: '<link rel="canonical" href="https://your-site.com/page" />' } });
  items.push(seo.hasOpenGraph
    ? { id: "og", group: "SEO", label: "Open Graph (social sharing)", status: "pass", desc: "Open Graph tags found." }
    : { id: "og", group: "SEO", label: "Open Graph (social sharing)", status: "warn", desc: "No Open Graph tags — links look plain on WhatsApp, Facebook and LinkedIn.",
        fix: { steps: ["Add og:title, og:description and og:image."],
          snippet: '<meta property="og:title" content="Title" />\n<meta property="og:description" content="Description" />\n<meta property="og:image" content="https://your-site.com/share.png" />' } });
  items.push(seo.hasFavicon
    ? { id: "favicon", group: "SEO", label: "Favicon", status: "pass", desc: "A favicon is declared." }
    : { id: "favicon", group: "SEO", label: "Favicon", status: "warn", desc: "No favicon declared.", fix: { steps: ["Add a favicon so your site shows an icon in tabs and search."], snippet: '<link rel="icon" href="/favicon.ico" />' } });
  items.push(seo.hasRobotsTxt
    ? { id: "robots", group: "SEO", label: "robots.txt", status: "pass", desc: "robots.txt is reachable." }
    : { id: "robots", group: "SEO", label: "robots.txt", status: "warn", desc: "No robots.txt found.",
        fix: { steps: ["Serve a robots.txt at the site root."], snippet: "User-agent: *\nAllow: /\nSitemap: https://your-site.com/sitemap.xml" } });
  items.push(seo.hasSitemap
    ? { id: "sitemap", group: "SEO", label: "XML sitemap", status: "pass", desc: "sitemap.xml is reachable." }
    : { id: "sitemap", group: "SEO", label: "XML sitemap", status: "warn", desc: "No sitemap.xml found, so search engines may miss pages.",
        fix: { steps: ["Generate a sitemap.xml listing every public page.", "Submit it in Google Search Console."] } });
  if (typeof seo.imagesMissingAlt === "number") {
    items.push(seo.imagesMissingAlt > 0
      ? { id: "alt", group: "SEO", label: "Image alt text", status: "warn", desc: `${seo.imagesMissingAlt} image${seo.imagesMissingAlt > 1 ? "s" : ""} on the homepage have no alt text.`,
          fix: { steps: ["Give every meaningful image a short, descriptive alt attribute."], snippet: '<img src="team.jpg" alt="Sales team reviewing the pipeline" />' } }
      : { id: "alt", group: "SEO", label: "Image alt text", status: "pass", desc: "All homepage images have alt text." });
  }

  // ── Speed ──
  const est = perf.usedRealData ? "" : " (estimated)";
  items.push(perf.speedScore >= 80
    ? { id: "speed", group: "Speed", label: "Page speed", status: "pass", desc: `Speed score ${perf.speedScore}/100${est}.` }
    : { id: "speed", group: "Speed", label: "Page speed", status: perf.speedScore < 50 ? "fail" : "warn", desc: `Speed score ${perf.speedScore}/100${est} — target 80+.`,
        fix: { steps: ["Compress and lazy-load images (WebP/AVIF).", "Remove unused JavaScript and third-party scripts.", "Enable caching and a CDN."] } });
  items.push(perf.mobileFriendly
    ? { id: "mobile", group: "Speed", label: "Mobile friendly", status: "pass", desc: `Mobile score ${perf.mobileScore}/100${est}.` }
    : { id: "mobile", group: "Speed", label: "Mobile friendly", status: "fail", desc: "The page is not mobile friendly.",
        fix: { steps: ["Add the viewport meta tag and use a responsive layout."], snippet: '<meta name="viewport" content="width=device-width, initial-scale=1" />' } });
  const lcp = perf.coreWebVitals.lcp;
  if (typeof lcp === "number") {
    items.push(lcp <= 2.5
      ? { id: "lcp", group: "Speed", label: "Largest Contentful Paint", status: "pass", desc: `LCP ${lcp}s${est} — under the 2.5s target.` }
      : { id: "lcp", group: "Speed", label: "Largest Contentful Paint", status: lcp > 4 ? "fail" : "warn", desc: `LCP ${lcp}s${est} — target is under 2.5s.`,
          fix: { steps: ["Optimise the hero image/video and preload it.", "Reduce server response time (TTFB)."] } });
  }
  const cls = perf.coreWebVitals.cls;
  if (typeof cls === "number") {
    items.push(cls <= 0.1
      ? { id: "cls", group: "Speed", label: "Layout stability (CLS)", status: "pass", desc: `CLS ${cls}${est} — stable.` }
      : { id: "cls", group: "Speed", label: "Layout stability (CLS)", status: cls > 0.25 ? "fail" : "warn", desc: `CLS ${cls}${est} — target is under 0.1.`,
          fix: { steps: ["Set width and height on images, embeds and ads.", "Don't insert content above existing content after load."] } });
  }

  // ── Security ──
  items.push(sec.ssl
    ? { id: "https", group: "Security", label: "HTTPS", status: "pass", desc: "The site is served over HTTPS." }
    : { id: "https", group: "Security", label: "HTTPS", status: "fail", desc: "The site is not reachable over a valid HTTPS connection.",
        fix: { steps: ["Install an SSL certificate (free via Let's Encrypt / certbot).", "Redirect all HTTP traffic to HTTPS."] } });
  const missing = Object.entries(sec.headers).filter(([, v]) => v === false).map(([k]) => k);
  items.push(missing.length === 0
    ? { id: "headers", group: "Security", label: "Security headers", status: "pass", desc: "All key security headers are set." }
    : { id: "headers", group: "Security", label: "Security headers", status: "warn", desc: `Missing: ${missing.map((k) => HEADER_LABEL[k] ?? k).join(", ")}.`,
        fix: { steps: ["Add these response headers in your web server or framework config."], snippet: missing.map((k) => HEADER_FIX[k]).filter(Boolean).join("\n") } });

  // ── Links & access ──
  items.push(tech.brokenLinks.length === 0
    ? { id: "links", group: "Links & access", label: "Broken links", status: "pass", desc: "No broken links found in the sampled homepage links." }
    : { id: "links", group: "Links & access", label: "Broken links", status: "fail",
        desc: `${tech.brokenLinks.length} broken link${tech.brokenLinks.length > 1 ? "s" : ""}: ${tech.brokenLinks.slice(0, 5).join(", ")}${tech.brokenLinks.length > 5 ? "…" : ""}`,
        fix: { steps: ["Update or remove each broken link.", "Add a 301 redirect if the page moved."] } });
  items.push(tech.accessibilityScore >= 80
    ? { id: "a11y", group: "Links & access", label: "Accessibility", status: "pass", desc: `Accessibility score ${tech.accessibilityScore}/100.` }
    : { id: "a11y", group: "Links & access", label: "Accessibility", status: "warn", desc: `Accessibility score ${tech.accessibilityScore}/100 — target 80+.`,
        fix: { steps: ["Add alt text, form labels and a lang attribute.", "Make sure text has enough colour contrast."] } });

  const points = items.reduce((s, i) => s + (i.status === "pass" ? 1 : i.status === "warn" ? 0.5 : 0), 0);
  return { ...base, score: Math.round((points / items.length) * 100), items };
}
