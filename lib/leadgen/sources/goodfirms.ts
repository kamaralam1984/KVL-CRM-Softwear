// GoodFirms lead source — IT / agency service providers.
// GoodFirms has no public API; use a SERP provider (SERPER_API_KEY) to query
// GoodFirms listings, or GOODFIRMS_API_KEY if you have partner access.
// Otherwise fall back to a realistic mock.
// Query is a service/category, e.g. "web development agency india".

import type { RawLead } from "../types";

type SerperOrganic = { title?: string; link?: string; snippet?: string };

export async function fetchGoodfirmsLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.GOODFIRMS_API_KEY ?? process.env.SERPER_API_KEY;
  if (!key) return mock(query, limit);

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: `site:goodfirms.co ${query}`, num: Math.min(limit, 20) }),
    });
    if (!res.ok) {
      console.error("[leadgen] GoodFirms error:", res.status, await res.text());
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
        source: "goodfirms" as const,
        sourceId: o.link ?? `goodfirms-${i}`,
        raw: o as Record<string, unknown>,
      };
    });
  } catch (err) {
    console.error("[leadgen] GoodFirms error:", err);
    return [];
  }
}

function mock(query: string, limit: number): RawLead[] {
  const service = query || "software development";
  const cos = ["Codeforge Studios", "PixelBridge", "Devhive Solutions", "Appmatrix", "Bytecraft Labs", "Webworks IT"];
  const cities = ["Ahmedabad, India", "Pune, India", "Austin, USA", "Toronto, Canada", "Warsaw, Poland"];
  const services = ["Web Development", "Mobile App Development", "UI/UX Design", "Digital Marketing", "Cloud Services"];
  return Array.from({ length: limit }, (_, i) => {
    const co = cos[i % cos.length] + (i >= cos.length ? ` ${Math.floor(i / cos.length) + 1}` : "");
    const slug = co.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      name: co,
      company: co,
      website: `https://${slug}.com`,
      category: services[i % services.length] || service,
      location: cities[i % cities.length],
      employeeCount: 10 + ((i * 29) % 490),
      source: "goodfirms" as const,
      sourceId: `mock-goodfirms-${slug}-${i}`,
    };
  });
}
