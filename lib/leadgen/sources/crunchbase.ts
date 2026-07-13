// Crunchbase lead source — startups / companies by keyword or industry.
// Real API when CRUNCHBASE_API_KEY is set; otherwise realistic mock.
// Query is a free-text keyword/industry, e.g. "ai healthcare".

import type { RawLead } from "../types";

type CrunchbaseEntity = {
  uuid?: string;
  properties?: {
    identifier?: { value?: string };
    short_description?: string;
    website?: { value?: string };
    num_employees_enum?: string;
    revenue_range?: string;
    categories?: { value?: string }[];
    linkedin?: { value?: string };
    facebook?: { value?: string };
    twitter?: { value?: string };
    location_identifiers?: { value?: string }[];
  };
};

export async function fetchCrunchbaseLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.CRUNCHBASE_API_KEY;
  if (!key) return mock(query, limit);

  try {
    const res = await fetch("https://api.crunchbase.com/api/v4/searches/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-cb-user-key": key },
      body: JSON.stringify({
        field_ids: [
          "identifier",
          "short_description",
          "website",
          "num_employees_enum",
          "revenue_range",
          "categories",
          "linkedin",
          "facebook",
          "twitter",
          "location_identifiers",
        ],
        query: [{ type: "predicate", field_id: "identifier", operator_id: "contains", values: [query] }],
        limit: Math.min(limit, 50),
      }),
    });
    if (!res.ok) {
      console.error("[leadgen] Crunchbase error:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as { entities?: CrunchbaseEntity[] };
    return (data.entities ?? []).slice(0, limit).map((e) => {
      const p = e.properties ?? {};
      const co = p.identifier?.value ?? "Unknown";
      return {
        name: co,
        company: co,
        website: p.website?.value,
        category: p.categories?.[0]?.value,
        industry: p.categories?.[0]?.value,
        location: p.location_identifiers?.map((l) => l.value).filter(Boolean).join(", "),
        employeeCount: parseEmployeeEnum(p.num_employees_enum),
        revenueEstimate: p.revenue_range,
        source: "crunchbase" as const,
        sourceId: e.uuid ?? co,
        socialLinks: {
          linkedin: p.linkedin?.value,
          facebook: p.facebook?.value,
          twitter: p.twitter?.value,
        },
        raw: e as Record<string, unknown>,
      };
    });
  } catch (err) {
    console.error("[leadgen] Crunchbase error:", err);
    return [];
  }
}

function parseEmployeeEnum(v?: string): number | undefined {
  if (!v) return undefined;
  const m = v.match(/\d+/);
  return m ? Number(m[0]) : undefined;
}

function mock(query: string, limit: number): RawLead[] {
  const kw = query || "startup";
  const cos = ["Zenpath", "Quantfurl", "Medlytic", "GreenspanAI", "Payloop", "Orbitwise"];
  const industries = ["Artificial Intelligence", "HealthTech", "FinTech", "CleanTech", "E-commerce"];
  const revenues = ["$1M-$10M", "$10M-$50M", "$500K-$1M", "$50M-$100M"];
  const cities = ["Bengaluru, India", "San Francisco, USA", "London, UK", "Berlin, Germany"];
  return Array.from({ length: limit }, (_, i) => {
    const co = cos[i % cos.length] + (i >= cos.length ? ` ${Math.floor(i / cos.length) + 1}` : "");
    const slug = co.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      name: co,
      company: co,
      website: `https://${slug}.io`,
      category: kw,
      industry: industries[i % industries.length],
      location: cities[i % cities.length],
      employeeCount: 10 + ((i * 53) % 1200),
      revenueEstimate: revenues[i % revenues.length],
      source: "crunchbase" as const,
      sourceId: `mock-crunchbase-${slug}-${i}`,
      socialLinks: {
        linkedin: `https://www.linkedin.com/company/${slug}`,
        twitter: `https://twitter.com/${slug}`,
      },
    };
  });
}
