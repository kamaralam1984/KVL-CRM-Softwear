// Google organic search lead source (via Serper.dev).
//
// Finds companies ranking for a query like "commercial solar installers Pune".
// Uses Serper.dev (google.serper.dev/search) when SERPER_API_KEY is set;
// otherwise returns realistic MOCK data so the pipeline still runs today.

import type { RawLead } from "../types";

type SerperOrganic = { title?: string; link?: string; snippet?: string };

export async function fetchGoogleSearchLeads(
  query: string,
  limit = 20,
): Promise<RawLead[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return mock(query, limit);

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: Math.min(limit, 20) }),
    });
    if (!res.ok) {
      console.error("[leadgen] Serper search error:", res.status, await res.text());
      return mock(query, limit);
    }
    const data = (await res.json()) as { organic?: SerperOrganic[] };
    return (data.organic ?? []).slice(0, limit).map((r, i) => {
      const company = (r.title ?? "Result").split(/[-|–—]/)[0].trim();
      return {
        name: company,
        company,
        website: r.link,
        category: "search",
        source: "google_search" as const,
        sourceId: r.link ?? `google-search-${i}`,
        raw: r as Record<string, unknown>,
      };
    });
  } catch (err) {
    console.error("[leadgen] Google search fetch failed:", err);
    return mock(query, limit);
  }
}

// --- mock fallback (no API key needed) -----------------------------------
function mock(query: string, limit: number): RawLead[] {
  const term = query.split(/\s+/).slice(0, 2).join(" ") || "service";
  const cap = term.charAt(0).toUpperCase() + term.slice(1);
  const suffixes = ["Group", "Global", "Labs", "Digital", "Partners", "Ventures", "Systems", "Co"];
  return Array.from({ length: Math.min(limit, 10) }, (_, i) => {
    const brand = `${cap} ${suffixes[i % suffixes.length]}`;
    const slug = brand.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      name: brand,
      company: brand,
      website: `https://${slug}.com`,
      category: "search",
      source: "google_search" as const,
      sourceId: `mock-google-search-${slug}-${i}`,
    };
  });
}
