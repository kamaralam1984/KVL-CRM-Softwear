// Google News lead source (via Serper.dev).
//
// Surfaces companies mentioned in recent news — funding rounds, expansions,
// new offices and product launches are strong buying signals. Uses Serper.dev
// (google.serper.dev/news) when SERPER_API_KEY is set; otherwise MOCK data.

import type { RawLead } from "../types";

type SerperNews = {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
  date?: string;
};

export async function fetchGoogleNewsLeads(
  query: string,
  limit = 20,
): Promise<RawLead[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return mock(query, limit);

  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: Math.min(limit, 20) }),
    });
    if (!res.ok) {
      console.error("[leadgen] Serper news error:", res.status, await res.text());
      return mock(query, limit);
    }
    const data = (await res.json()) as { news?: SerperNews[] };
    return (data.news ?? []).slice(0, limit).map((n, i) => {
      const company = (n.title ?? "Company").split(/[-|–—:,]/)[0].trim();
      return {
        name: company,
        company,
        website: n.link,
        category: "news",
        source: "google_news" as const,
        sourceId: n.link ?? `google-news-${i}`,
        raw: n.snippet as unknown as Record<string, unknown>,
      };
    });
  } catch (err) {
    console.error("[leadgen] Google news fetch failed:", err);
    return mock(query, limit);
  }
}

// --- mock fallback (no API key needed) -----------------------------------
function mock(query: string, limit: number): RawLead[] {
  const term = query.split(/\s+/).slice(0, 2).join(" ") || "startup";
  const cap = term.charAt(0).toUpperCase() + term.slice(1);
  const signals = [
    "raises Series A funding",
    "expands to new market",
    "opens second office",
    "launches new product",
    "acquires competitor",
    "reports record growth",
  ];
  const suffixes = ["Tech", "Labs", "AI", "Corp", "Health", "Fintech"];
  return Array.from({ length: Math.min(limit, 8) }, (_, i) => {
    const brand = `${cap} ${suffixes[i % suffixes.length]}`;
    const slug = brand.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      name: brand,
      company: brand,
      website: `https://${slug}.com`,
      category: "news",
      source: "google_news" as const,
      sourceId: `mock-google-news-${slug}-${i}`,
      raw: `${brand} ${signals[i % signals.length]}.` as unknown as Record<string, unknown>,
    };
  });
}
