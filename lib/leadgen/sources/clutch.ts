// Clutch.co lead source — B2B agencies and service providers.
// Clutch has no public API; use a SERP provider (SERPER_API_KEY) to query
// Clutch listings, or CLUTCH_API_KEY if you have partner access.
// Otherwise fall back to a realistic mock.
// Query is a service/category, e.g. "digital marketing agency".

import type { RawLead } from "../types";

type SerperOrganic = { title?: string; link?: string; snippet?: string };

export async function fetchClutchLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.CLUTCH_API_KEY ?? process.env.SERPER_API_KEY;
  if (!key) return mock(query, limit);

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: `site:clutch.co ${query}`, num: Math.min(limit, 20) }),
    });
    if (!res.ok) {
      console.error("[leadgen] Clutch error:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as { organic?: SerperOrganic[] };
    return (data.organic ?? []).slice(0, limit).map((o, i) => {
      const co = (o.title ?? "Unknown").replace(/\s*[|\-–].*$/, "").trim() || "Unknown";
      return {
        name: co,
        company: co,
        website: o.link,
        category: query,
        source: "clutch" as const,
        sourceId: o.link ?? `clutch-${i}`,
        raw: o as Record<string, unknown>,
      };
    });
  } catch (err) {
    console.error("[leadgen] Clutch error:", err);
    return [];
  }
}

function mock(query: string, limit: number): RawLead[] {
  const service = query || "B2B services";
  const cos = ["Summit Digital", "Ironclad Agency", "Brightwave Media", "Nexus Consulting", "Peak Labs", "Vantage Studio"];
  const cities = ["New York, USA", "Bengaluru, India", "Manchester, UK", "Sydney, Australia", "Dubai, UAE"];
  const services = ["Digital Marketing", "Software Development", "Branding", "SEO Services", "Business Consulting"];
  const revenues = ["$1M-$5M", "$5M-$10M", "$500K-$1M", "$10M-$25M"];
  return Array.from({ length: limit }, (_, i) => {
    const co = cos[i % cos.length] + (i >= cos.length ? ` ${Math.floor(i / cos.length) + 1}` : "");
    const slug = co.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      name: co,
      company: co,
      website: `https://${slug}.com`,
      category: services[i % services.length] || service,
      location: cities[i % cities.length],
      employeeCount: 10 + ((i * 41) % 740),
      revenueEstimate: revenues[i % revenues.length],
      source: "clutch" as const,
      sourceId: `mock-clutch-${slug}-${i}`,
      socialLinks: { linkedin: `https://www.linkedin.com/company/${slug}` },
    };
  });
}
