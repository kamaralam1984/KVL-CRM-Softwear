// Company website enrichment lead source.
//
// Given a domain or URL in `query`, fetches the homepage HTML and extracts
// contact details (emails, phone), social links and a best-effort tech stack.
// Returns a single RawLead. If the fetch fails or is unreachable → MOCK.

import type { RawLead } from "../types";

function normalizeUrl(query: string): string {
  const q = query.trim();
  if (/^https?:\/\//i.test(q)) return q;
  return `https://${q.replace(/^\/+/, "")}`;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function firstMatch(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m ? (m[1] ?? m[0]).trim() : undefined;
}

function extractSocials(html: string) {
  const grab = (host: string): string | undefined => {
    const re = new RegExp(`https?://(?:www\\.)?${host}/[^"'\\s<>)]+`, "i");
    return html.match(re)?.[0];
  };
  const socialLinks: NonNullable<RawLead["socialLinks"]> = {};
  const linkedin = grab("linkedin\\.com");
  const facebook = grab("facebook\\.com");
  const instagram = grab("instagram\\.com");
  const twitter = grab("twitter\\.com") ?? grab("x\\.com");
  const youtube = grab("youtube\\.com");
  if (linkedin) socialLinks.linkedin = linkedin;
  if (facebook) socialLinks.facebook = facebook;
  if (instagram) socialLinks.instagram = instagram;
  if (twitter) socialLinks.twitter = twitter;
  if (youtube) socialLinks.youtube = youtube;
  return Object.keys(socialLinks).length ? socialLinks : undefined;
}

function detectTechStack(html: string): string[] {
  const checks: Array<[string, RegExp]> = [
    ["WordPress", /wp-content|wp-includes|wordpress/i],
    ["Shopify", /cdn\.shopify\.com|shopify/i],
    ["Wix", /wix\.com|_wix|wixstatic/i],
    ["Squarespace", /squarespace/i],
    ["Webflow", /webflow/i],
    ["Next.js", /__next|_next\/static|next\.js/i],
    ["React", /react(?:-dom)?(?:\.production)?\.min\.js|data-reactroot|__reactContainer/i],
    ["Vue", /vue(?:\.min)?\.js|data-v-|__vue__/i],
    ["Angular", /ng-version|angular(?:\.min)?\.js/i],
    ["Google Analytics", /google-analytics\.com|gtag\(|googletagmanager\.com/i],
    ["HubSpot", /hs-scripts\.com|hubspot/i],
    ["Bootstrap", /bootstrap(?:\.min)?\.css/i],
    ["Tailwind", /tailwind/i],
    ["jQuery", /jquery(?:-\d|(?:\.min)?\.js)/i],
    ["Cloudflare", /cloudflare/i],
    ["Intercom", /intercom/i],
    ["Stripe", /js\.stripe\.com/i],
  ];
  return checks.filter(([, re]) => re.test(html)).map(([name]) => name);
}

export async function fetchCompanyWebsiteLeads(
  query: string,
  limit = 20,
): Promise<RawLead[]> {
  const url = normalizeUrl(query);
  const domain = domainOf(url);
  void limit;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadGenBot/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error("[leadgen] Company website fetch error:", res.status, url);
      return mock(domain);
    }
    const html = await res.text();

    const title =
      firstMatch(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ??
      firstMatch(html, /<title[^>]*>([^<]+)<\/title>/i) ??
      domain;
    const company = title.split(/[-|–—:]/)[0].trim() || domain;

    const emailMatch =
      firstMatch(html, /mailto:([^"'?\s<>]+@[^"'?\s<>]+)/i) ??
      firstMatch(html, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    const email = emailMatch && !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(emailMatch) ? emailMatch : undefined;

    const phone = firstMatch(html, /(?:tel:)?(\+?\d[\d\s().-]{7,}\d)/i);

    const socialLinks = extractSocials(html);
    const techStack = detectTechStack(html);

    return [
      {
        name: company,
        company,
        email,
        phone: phone?.trim(),
        website: url,
        category: "company_website",
        source: "company_website" as const,
        sourceId: domain,
        socialLinks,
        techStack: techStack.length ? techStack : undefined,
        raw: { url, title } as Record<string, unknown>,
      },
    ];
  } catch (err) {
    clearTimeout(timer);
    console.error("[leadgen] Company website fetch failed:", err);
    return mock(domain);
  }
}

// --- mock fallback (no reachable site) -----------------------------------
function mock(domain: string): RawLead[] {
  const base = domain.split(".")[0] || "company";
  const company = base.charAt(0).toUpperCase() + base.slice(1);
  return [
    {
      name: company,
      company,
      email: `info@${domain}`,
      phone: "+91 9800000000",
      website: `https://${domain}`,
      category: "company_website",
      source: "company_website" as const,
      sourceId: `mock-company-website-${domain}`,
      socialLinks: {
        linkedin: `https://www.linkedin.com/company/${base}`,
      },
      techStack: ["WordPress", "Google Analytics"],
    },
  ];
}
