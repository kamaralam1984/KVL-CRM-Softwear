// Directory scrape source (Justdial / IndiaMART style listings).
//
// ⚠️ Directly scraping Justdial/IndiaMART violates their ToS and breaks often.
// The compliant path is a scraping-API provider (Serper, ScraperAPI, Bright Data)
// that returns structured results. This source uses Serper.dev (Google results)
// as a stand-in when SERPER_API_KEY is set; otherwise it returns mock data.
//
// Query e.g. "interior designers Jaipur site:justdial.com".

import type { RawLead } from "../types";

type SerperResult = { title?: string; link?: string; snippet?: string };

export async function fetchScrapeLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return mock(query, limit);

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: Math.min(limit, 20) }),
  });
  if (!res.ok) {
    console.error("[leadgen] Serper error:", res.status, await res.text());
    return [];
  }
  const data = (await res.json()) as { organic?: SerperResult[] };
  return (data.organic ?? []).slice(0, limit).map((r, i) => {
    const company = (r.title ?? "Listing").split(/[-|–]/)[0].trim();
    const phone = r.snippet?.match(/(\+?\d[\d ]{7,}\d)/)?.[0];
    return {
      name: company,
      company,
      phone,
      website: r.link,
      category: "directory",
      source: "scrape" as const,
      sourceId: r.link ?? `scrape-${i}`,
      raw: r as Record<string, unknown>,
    };
  });
}

function mock(query: string, limit: number): RawLead[] {
  const cat = query.split(/\s+/)[0] || "service";
  const cap = cat.charAt(0).toUpperCase() + cat.slice(1);
  return Array.from({ length: Math.min(limit, 8) }, (_, i) => {
    const brand = `${cap} ${["Associates", "Enterprises", "& Co", "India", "Traders", "Services"][i % 6]}`;
    const slug = brand.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      name: brand,
      company: brand,
      phone: `+91 70${String(200000 + i).slice(-6)}`,
      website: `https://${slug}.in`,
      category: "directory",
      source: "scrape" as const,
      sourceId: `mock-scrape-${slug}-${i}`,
    };
  });
}
