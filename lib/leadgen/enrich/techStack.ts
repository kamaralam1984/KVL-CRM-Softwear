// Tech-stack detection. Fetches a site's HTML and matches known technology
// signatures. No API key needed — pure global fetch. Always degrades to []
// on any network/parse failure so enrichment never breaks the pipeline.

type Signature = { tech: string; test: (html: string) => boolean };

// Ordered signatures. Each looks for a telltale marker in the raw HTML.
const SIGNATURES: Signature[] = [
  { tech: "WordPress", test: (h) => /wp-content|wp-includes|wp-json/.test(h) },
  { tech: "Shopify", test: (h) => /cdn\.shopify\.com|shopify\.com\/s\/|Shopify\.theme/.test(h) },
  { tech: "Wix", test: (h) => /wix\.com|wixstatic\.com|X-Wix/.test(h) },
  { tech: "Squarespace", test: (h) => /squarespace\.com|static1\.squarespace|Squarespace\.afterBodyLoad/.test(h) },
  { tech: "Next.js", test: (h) => /__NEXT_DATA__|\/_next\//.test(h) },
  { tech: "React", test: (h) => /data-reactroot|data-reactid|react(?:-dom)?(?:\.production)?(?:\.min)?\.js/.test(h) },
  { tech: "Angular", test: (h) => /ng-version|ng-app|angular(?:\.min)?\.js/.test(h) },
  { tech: "Vue", test: (h) => /data-v-[0-9a-f]{8}|vue(?:\.runtime)?(?:\.min)?\.js|__VUE__/.test(h) },
  { tech: "Google Tag Manager", test: (h) => /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/.test(h) },
  { tech: "Google Analytics", test: (h) => /google-analytics\.com\/analytics\.js|gtag\(|googletagmanager\.com\/gtag|ga\('create'/.test(h) },
  { tech: "HubSpot", test: (h) => /js\.hs-scripts\.com|hs-analytics|hsforms\.(?:com|net)|_hsq/.test(h) },
  { tech: "Cloudflare", test: (h) => /cloudflare|cdnjs\.cloudflare\.com|__cf_bm|cf-ray/.test(h) },
  { tech: "jQuery", test: (h) => /jquery(?:-\d[\d.]*)?(?:\.min)?\.js|jQuery/.test(h) },
  { tech: "Bootstrap", test: (h) => /bootstrap(?:\.bundle)?(?:\.min)?\.(?:css|js)|class="[^"]*\b(?:col-(?:xs|sm|md|lg|xl)-\d|navbar-(?:brand|toggler))/.test(h) },
  { tech: "Tailwind CSS", test: (h) => /tailwind(?:\.min)?\.css|cdn\.tailwindcss\.com|class="[^"]*\b(?:flex|grid|px-\d|py-\d|text-(?:sm|lg|xl))\b[^"]*\b(?:items-|justify-|gap-)/.test(h) },
];

function normalizeUrl(website: string): string {
  const trimmed = website.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function detectTechStack(website?: string): Promise<string[]> {
  if (!website) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(normalizeUrl(website), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadGenBot/1.0)" },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const found = SIGNATURES.filter((s) => {
      try {
        return s.test(html);
      } catch {
        return false;
      }
    }).map((s) => s.tech);

    // De-dupe while preserving signature order.
    return Array.from(new Set(found));
  } catch (err) {
    console.error("[leadgen:enrich] techStack detection failed:", err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
