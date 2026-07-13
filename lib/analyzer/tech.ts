// AI Website Analyzer — Tech slice (Phase 2).
// Detects CMS, hosting, technology stack, broken links and an accessibility
// heuristic from a page's HTML + response headers. Fully decoupled: it does
// its own richer detection rather than importing the leadgen detector.
// Never throws — always returns a valid TechResult, degrading gracefully.

import type { TechResult } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;
const LINK_CHECK_TIMEOUT_MS = 5000;
const MAX_LINKS = 15;
const MAX_LINK_CHECKS = 8;

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// --- CMS detection ---------------------------------------------------------
function detectCms(html: string, headers: Headers): string | undefined {
  const h = html;
  const gen = (headers.get("x-powered-by") || "").toLowerCase();
  if (/wp-content|wp-includes|wp-json|\/wp-/.test(h)) return "WordPress";
  if (/cdn\.shopify\.com|shopify\.com\/s\/|Shopify\.theme|x-shopify/i.test(h) ||
      headers.has("x-shopify-stage") || headers.has("x-shopid"))
    return "Shopify";
  if (/wix\.com|wixstatic\.com|X-Wix|_wixCssIsHere/.test(h) || headers.has("x-wix-request-id"))
    return "Wix";
  if (/squarespace\.com|static1\.squarespace|Squarespace\.afterBodyLoad|SQUARESPACE_ROLLUPS/.test(h))
    return "Squarespace";
  if (/\.webflow\.io|webflow\.js|data-wf-(?:page|site)|assets\.website-files\.com/.test(h))
    return "Webflow";
  if (/Drupal\.settings|\/sites\/(?:all|default)\/|drupal\.js/i.test(h) || /drupal/.test(gen))
    return "Drupal";
  if (/\/media\/jui\/|com_content|Joomla!|joomla-script-options/i.test(h) || /joomla/.test(gen))
    return "Joomla";
  return undefined;
}

// --- Hosting detection -----------------------------------------------------
function detectHosting(headers: Headers): string | undefined {
  const server = (headers.get("server") || "").toLowerCase();
  const via = (headers.get("via") || "").toLowerCase();

  if (headers.has("cf-ray") || server.includes("cloudflare")) return "Cloudflare";
  if (headers.has("x-vercel-id") || headers.has("x-vercel-cache") || server.includes("vercel"))
    return "Vercel";
  if (headers.has("x-nf-request-id") || server.includes("netlify")) return "Netlify";
  if (
    headers.has("x-amz-cf-id") ||
    headers.has("x-amz-request-id") ||
    server.includes("amazons3") ||
    server.includes("awselb") ||
    via.includes("cloudfront")
  )
    return "AWS";
  if (server.includes("github.com") || server.includes("github pages") || server === "github.com")
    return "GitHub Pages";
  if (headers.has("x-github-request-id")) return "GitHub Pages";
  if (server.includes("gse") || headers.has("x-goog-generation")) return "Google Cloud";
  if (server.includes("nginx")) return "Nginx server";
  if (server.includes("apache")) return "Apache server";
  if (server.includes("microsoft-iis")) return "Microsoft IIS";
  if (server) return server;
  return undefined;
}

// --- Technology stack ------------------------------------------------------
type Sig = { tech: string; test: (h: string) => boolean };

const TECH_SIGNATURES: Sig[] = [
  { tech: "Next.js", test: (h) => /__NEXT_DATA__|\/_next\/static/.test(h) },
  { tech: "React", test: (h) => /data-reactroot|data-reactid|react(?:-dom)?(?:\.production)?(?:\.min)?\.js/.test(h) },
  { tech: "Angular", test: (h) => /ng-version|ng-app|\bng-controller\b|angular(?:\.min)?\.js/.test(h) },
  { tech: "Vue.js", test: (h) => /data-v-[0-9a-f]{8}|vue(?:\.runtime)?(?:\.min)?\.js|__VUE__|data-vue/.test(h) },
  { tech: "Svelte", test: (h) => /svelte-[0-9a-z]{6,}|__SVELTE/.test(h) },
  { tech: "jQuery", test: (h) => /jquery(?:-\d[\d.]*)?(?:\.min)?\.js|jQuery/.test(h) },
  { tech: "Bootstrap", test: (h) => /bootstrap(?:\.bundle)?(?:\.min)?\.(?:css|js)|class="[^"]*\b(?:navbar-(?:brand|toggler)|col-(?:xs|sm|md|lg|xl)-\d)/.test(h) },
  { tech: "Tailwind CSS", test: (h) => /cdn\.tailwindcss\.com|tailwind(?:\.min)?\.css/.test(h) || (/class="[^"]*\bflex\b/.test(h) && /class="[^"]*\b(?:items-|justify-|gap-\d|px-\d|py-\d)/.test(h)) },
  { tech: "Font Awesome", test: (h) => /font-?awesome|fa-(?:solid|regular|brands|[a-z-]+)"|use\.fontawesome\.com|cdnjs[^"']*font-awesome/.test(h) },
  { tech: "Google Font", test: (h) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(h) },
  { tech: "Google Tag Manager", test: (h) => /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/.test(h) },
  { tech: "Google Analytics", test: (h) => /google-analytics\.com\/analytics\.js|gtag\(|googletagmanager\.com\/gtag|ga\('create'|G-[A-Z0-9]{6,}|UA-\d{4,}/.test(h) },
  { tech: "HubSpot", test: (h) => /js\.hs-scripts\.com|hs-analytics|hsforms\.(?:com|net)|_hsq/.test(h) },
  { tech: "Intercom", test: (h) => /widget\.intercom\.io|intercomSettings|intercomcdn\.com/.test(h) },
  { tech: "Facebook Pixel", test: (h) => /connect\.facebook\.net\/[^"']*fbevents\.js|fbq\(/.test(h) },
  { tech: "Stripe", test: (h) => /js\.stripe\.com/.test(h) },
  { tech: "Cloudflare", test: (h) => /cdnjs\.cloudflare\.com|__cf_bm|cf-ray|challenges\.cloudflare/.test(h) },
];

function detectTechnologies(html: string, headers: Headers): string[] {
  const found = new Set<string>();
  for (const s of TECH_SIGNATURES) {
    try {
      if (s.test(html)) found.add(s.tech);
    } catch {
      /* ignore bad regex on odd input */
    }
  }
  const powered = headers.get("x-powered-by");
  if (powered) {
    if (/php/i.test(powered)) found.add("PHP");
    if (/asp\.net/i.test(powered)) found.add("ASP.NET");
    if (/express/i.test(powered)) found.add("Express");
    if (/next\.js/i.test(powered)) found.add("Next.js");
  }
  return Array.from(found);
}

// --- Accessibility heuristic (0-100) --------------------------------------
function scoreAccessibility(html: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  if (!/<html[^>]*\slang=/i.test(html)) {
    score -= 15;
    issues.push("Missing <html lang> attribute");
  }

  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgsMissingAlt = imgs.filter((t) => !/\salt=/i.test(t)).length;
  if (imgs.length > 0 && imgsMissingAlt > 0) {
    const ratio = imgsMissingAlt / imgs.length;
    score -= Math.min(20, Math.round(ratio * 20));
    issues.push(`${imgsMissingAlt} image(s) missing alt text`);
  }

  const inputs = (html.match(/<input\b[^>]*>/gi) || []).filter(
    (t) => !/type=["']?(?:hidden|submit|button)/i.test(t)
  );
  const hasLabels = /<label\b/i.test(html);
  const hasAriaLabels = /aria-label(?:ledby)?=/i.test(html);
  if (inputs.length > 0 && !hasLabels && !hasAriaLabels) {
    score -= 15;
    issues.push("Form inputs without <label> or aria-label");
  }

  if (!hasAriaLabels && !/\brole=/i.test(html)) {
    score -= 10;
    issues.push("No ARIA labels/roles found");
  }

  const semanticTags = ["<header", "<nav", "<main", "<footer", "<article", "<section"];
  const semanticCount = semanticTags.filter((t) => html.toLowerCase().includes(t)).length;
  if (semanticCount < 2) {
    score -= 15;
    issues.push("Few semantic HTML5 landmarks");
  }

  if (!/<h1\b/i.test(html)) {
    score -= 10;
    issues.push("No <h1> heading");
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

// --- Broken-link sampling --------------------------------------------------
function extractSameOriginLinks(html: string, origin: string): string[] {
  const links = new Set<string>();
  const re = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && links.size < MAX_LINKS * 3) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("#") || /^(?:mailto:|tel:|javascript:|data:)/i.test(raw)) continue;
    try {
      const abs = new URL(raw, origin);
      if (abs.origin !== origin) continue; // same-origin only
      abs.hash = "";
      links.add(abs.toString());
    } catch {
      /* skip unparseable href */
    }
    if (links.size >= MAX_LINKS) break;
  }
  return Array.from(links);
}

async function checkLink(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA },
    });
    // Some servers reject HEAD — retry with GET before judging.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": UA },
      });
    }
    return res.status >= 400 ? `${url} (${res.status})` : null;
  } catch {
    return `${url} (unreachable)`;
  } finally {
    clearTimeout(timer);
  }
}

async function findBrokenLinks(html: string, origin: string): Promise<string[]> {
  const links = extractSameOriginLinks(html, origin);
  const sample = links.slice(0, MAX_LINK_CHECKS);
  const results = await Promise.all(sample.map((l) => checkLink(l)));
  return results.filter((r): r is string => r !== null);
}

// --- Public entrypoint -----------------------------------------------------
export async function analyzeTech(url: string, html?: string): Promise<TechResult> {
  const result: TechResult = {
    technologies: [],
    brokenLinks: [],
    accessibilityScore: 0,
    issues: [],
  };

  let normalized: string;
  try {
    normalized = normalizeUrl(url);
  } catch {
    result.issues.push("Invalid URL");
    return result;
  }

  let headers: Headers = new Headers();
  let pageHtml = html;
  let origin = "";
  try {
    origin = new URL(normalized).origin;
  } catch {
    /* keep origin empty */
  }

  // Fetch page if HTML not supplied (also needed for headers regardless).
  if (pageHtml === undefined) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(normalized, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": UA },
      });
      headers = res.headers;
      pageHtml = await res.text();
    } catch (err) {
      console.error("[analyzer:tech] page fetch failed:", err);
      result.issues.push("Website unreachable");
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    const h = pageHtml ?? "";

    result.cms = detectCms(h, headers);
    result.hosting = detectHosting(headers);
    result.technologies = detectTechnologies(h, headers);

    const a11y = scoreAccessibility(h);
    result.accessibilityScore = a11y.score;
    result.issues.push(...a11y.issues);

    if (!result.cms) result.issues.push("No CMS detected (custom or unknown build)");

    if (result.technologies.includes("jQuery")) {
      const old = /jquery-(1|2)\.[\d.]+(?:\.min)?\.js/i.test(h);
      if (old) result.issues.push("Outdated jQuery version");
    }

    if (origin) {
      try {
        result.brokenLinks = await findBrokenLinks(h, origin);
        if (result.brokenLinks.length > 0) {
          result.issues.push(`${result.brokenLinks.length} broken link(s) found`);
        }
      } catch (err) {
        console.error("[analyzer:tech] broken-link check failed:", err);
      }
    }
  } catch (err) {
    console.error("[analyzer:tech] analysis failed:", err);
  }

  return result;
}
