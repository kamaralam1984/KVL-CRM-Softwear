// AI Website Analyzer (Phase 2) — SEO analyzer.
// Fetches (if needed) and parses raw HTML with regex/string parsing (no external
// libs) to produce a typed SeoResult with a 0-100 score and human-readable issues.

import type { SeoResult } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Fetch a URL with a browser-like UA and an AbortController timeout.
async function fetchWithTimeout(
  url: string,
  ms: number,
  method: "GET" | "HEAD" = "GET",
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
  } finally {
    clearTimeout(timer);
  }
}

// Best-effort check that a resource exists (2xx/3xx). Tries HEAD, then GET.
async function resourceExists(url: string, ms: number): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, ms, "HEAD");
    if (res.ok) return true;
    // Some servers reject HEAD; fall back to a GET.
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      const res2 = await fetchWithTimeout(url, ms, "GET");
      return res2.ok;
    }
    return res.ok;
  } catch {
    try {
      const res2 = await fetchWithTimeout(url, ms, "GET");
      return res2.ok;
    } catch {
      return false;
    }
  }
}

function safeOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

// Strip HTML comments so they don't confuse tag matching.
function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// Pull an attribute value from a single tag string (attr="v" | attr='v' | attr=v).
function getAttr(tag: string, attr: string): string | undefined {
  const re = new RegExp(
    `${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    "i",
  );
  const m = tag.match(re);
  if (!m) return undefined;
  return (m[2] ?? m[3] ?? m[4] ?? "").trim();
}

export async function analyzeSeo(
  url: string,
  html?: string,
): Promise<SeoResult> {
  const issues: string[] = [];
  const origin = safeOrigin(url);

  // 1. Obtain HTML if not supplied.
  let body = html;
  if (body === undefined) {
    try {
      const res = await fetchWithTimeout(url, 8000, "GET");
      if (!res.ok) {
        issues.push(`site unreachable (HTTP ${res.status})`);
        return { score: 5, issues };
      }
      body = await res.text();
    } catch (err) {
      console.error("[analyzer:seo] fetch failed:", url, err);
      issues.push("site unreachable");
      return { score: 5, issues };
    }
  }

  const src = stripComments(body);
  const lower = src.toLowerCase();

  // 2. Title.
  let title: string | undefined;
  const titleMatch = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) title = decode(titleMatch[1].replace(/\s+/g, " "));
  const titleLength = title ? title.length : 0;

  // 3. Meta description.
  let metaDescription: string | undefined;
  const metaTags = src.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const name = getAttr(tag, "name");
    if (name && name.toLowerCase() === "description") {
      const c = getAttr(tag, "content");
      if (c !== undefined) metaDescription = decode(c);
      break;
    }
  }
  const metaDescriptionLength = metaDescription ? metaDescription.length : 0;

  // 4. Headings.
  const h1Count = (src.match(/<h1\b[^>]*>/gi) ?? []).length;
  const h2Count = (src.match(/<h2\b[^>]*>/gi) ?? []).length;
  const headingsOutlineOk = h1Count === 1 && h2Count > 0;

  // 5. Structured data (JSON-LD or microdata).
  const hasSchema =
    /<script\b[^>]*type\s*=\s*["']?application\/ld\+json/i.test(src) ||
    /\bitemscope\b/i.test(src);

  // 6. Canonical.
  const linkTags = src.match(/<link\b[^>]*>/gi) ?? [];
  let hasCanonical = false;
  let hasFavicon = false;
  for (const tag of linkTags) {
    const rel = (getAttr(tag, "rel") || "").toLowerCase();
    if (rel === "canonical") hasCanonical = true;
    if (rel.split(/\s+/).some((r) => r === "icon" || r === "shortcut")) {
      hasFavicon = true;
    }
    if (rel.includes("apple-touch-icon")) hasFavicon = true;
  }

  // 7. Open Graph.
  const hasOpenGraph = metaTags.some((tag) => {
    const prop = (getAttr(tag, "property") || "").toLowerCase();
    return prop.startsWith("og:");
  });

  // 8. Images missing alt.
  const imgTags = src.match(/<img\b[^>]*>/gi) ?? [];
  let imagesMissingAlt = 0;
  for (const tag of imgTags) {
    const alt = getAttr(tag, "alt");
    if (alt === undefined || alt.length === 0) imagesMissingAlt++;
  }

  // 9. robots.txt + sitemap.xml (best effort, short timeout).
  let hasRobotsTxt = false;
  let hasSitemap = false;
  if (origin) {
    [hasRobotsTxt, hasSitemap] = await Promise.all([
      resourceExists(`${origin}/robots.txt`, 4000),
      resourceExists(`${origin}/sitemap.xml`, 4000),
    ]);
  }

  // 10. Score + issues.
  let score = 0;

  // Title (20): present + healthy length (30-60 chars).
  if (title) {
    score += 12;
    if (titleLength >= 30 && titleLength <= 60) {
      score += 8;
    } else {
      score += 4;
      issues.push(
        `title length ${titleLength} chars is outside the ideal 30-60 range`,
      );
    }
  } else {
    issues.push("missing <title> tag");
  }

  // Meta description (15): present + healthy length (50-160 chars).
  if (metaDescription) {
    score += 8;
    if (metaDescriptionLength >= 50 && metaDescriptionLength <= 160) {
      score += 7;
    } else {
      score += 3;
      issues.push(
        `meta description length ${metaDescriptionLength} chars is outside the ideal 50-160 range`,
      );
    }
  } else {
    issues.push("missing meta description");
  }

  // Single H1 (12).
  if (h1Count === 1) {
    score += 12;
  } else if (h1Count === 0) {
    issues.push("no <h1> heading found");
  } else {
    score += 4;
    issues.push(`multiple <h1> headings found (${h1Count})`);
  }

  // Heading outline (5).
  if (headingsOutlineOk) {
    score += 5;
  } else if (h2Count === 0) {
    issues.push("no <h2> subheadings — weak content outline");
  }

  // Schema (10).
  if (hasSchema) score += 10;
  else issues.push("no structured data (JSON-LD / microdata) found");

  // Canonical (7).
  if (hasCanonical) score += 7;
  else issues.push("missing canonical link");

  // Open Graph (7).
  if (hasOpenGraph) score += 7;
  else issues.push("no Open Graph tags for social sharing");

  // Favicon (2).
  if (hasFavicon) score += 2;
  else issues.push("no favicon declared");

  // robots.txt (5).
  if (hasRobotsTxt) score += 5;
  else issues.push("no robots.txt found");

  // sitemap.xml (7).
  if (hasSitemap) score += 7;
  else issues.push("no sitemap.xml found");

  // Image alt coverage (10).
  const totalImages = imgTags.length;
  if (totalImages === 0) {
    score += 10;
  } else {
    const coverage = (totalImages - imagesMissingAlt) / totalImages;
    score += Math.round(coverage * 10);
    if (imagesMissingAlt > 0) {
      issues.push(
        `${imagesMissingAlt} of ${totalImages} images missing alt text`,
      );
    }
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    score,
    title,
    titleLength: title ? titleLength : undefined,
    metaDescription,
    metaDescriptionLength: metaDescription ? metaDescriptionLength : undefined,
    h1Count,
    headingsOutlineOk,
    hasSchema,
    hasCanonical,
    hasRobotsTxt,
    hasSitemap,
    hasOpenGraph,
    hasFavicon,
    imagesMissingAlt,
    issues,
  };
}
