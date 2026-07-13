// MCA (Ministry of Corporate Affairs) lead source — registered Indian companies.
//
// Finds registered companies by a text query like "software in Maharashtra".
// Uses an MCA data provider API when MCA_API_KEY is set, falls back to a Serper.dev
// web scrape when SERPER_API_KEY is set; otherwise returns realistic MOCK data so the
// whole pipeline still runs today. Never throws.

import type { DecisionMaker, RawLead } from "../types";

type McaCompany = {
  cin?: string;
  company_name?: string;
  name?: string;
  industry?: string;
  activity?: string;
  state?: string;
  registered_office?: string;
  paid_up_capital?: string;
  authorized_capital?: string;
  director_name?: string;
  director_designation?: string;
};

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

function splitQuery(query: string): { sector: string; region: string } {
  const sector = query.split(" in ")[0]?.trim() || "company";
  const region = query.split(" in ")[1]?.trim() || "India";
  return { sector, region };
}

export async function fetchMcaLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.MCA_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;
  const { sector, region } = splitQuery(query);

  if (key) {
    try {
      const res = await fetch(
        `https://api.mca.gov.in/v1/companies/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`,
        { method: "GET", headers: { "Content-Type": "application/json", "x-api-key": key } },
      );
      if (!res.ok) {
        console.error("[leadgen] MCA error:", res.status, await res.text());
        return mock(sector, region, limit);
      }
      const data = (await res.json()) as { companies?: McaCompany[] };
      return (data.companies ?? []).slice(0, limit).map((c) => {
        const decisionMaker: DecisionMaker | undefined = c.director_name
          ? { name: c.director_name, title: c.director_designation ?? "Director" }
          : undefined;
        return {
          name: c.company_name ?? c.name ?? "Unknown",
          company: c.company_name ?? c.name ?? "Unknown",
          address: c.registered_office,
          industry: c.industry ?? c.activity ?? sector,
          location: c.state ?? region,
          revenueEstimate: c.paid_up_capital ?? c.authorized_capital,
          decisionMaker,
          source: "mca" as const,
          sourceId: c.cin,
          raw: c as Record<string, unknown>,
        };
      });
    } catch (err) {
      console.error("[leadgen] MCA fetch failed:", err);
      return mock(sector, region, limit);
    }
  }

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": serperKey },
        body: JSON.stringify({ q: `site:zaubacorp.com ${query} private limited`, num: Math.min(limit, 20) }),
      });
      if (!res.ok) {
        console.error("[leadgen] MCA/Serper error:", res.status, await res.text());
        return mock(sector, region, limit);
      }
      const data = (await res.json()) as { organic?: SerperOrganic[] };
      return (data.organic ?? []).slice(0, limit).map((o, i) => ({
        name: o.title ?? "Unknown",
        company: (o.title ?? "Unknown").replace(/ *[-|].*$/, "").trim(),
        website: o.link,
        industry: sector,
        location: region,
        source: "mca" as const,
        sourceId: `serper-mca-${i}`,
        raw: o as Record<string, unknown>,
      }));
    } catch (err) {
      console.error("[leadgen] MCA/Serper fetch failed:", err);
      return mock(sector, region, limit);
    }
  }

  return mock(sector, region, limit);
}

// --- mock fallback (no API key needed) -----------------------------------
function mock(sector: string, region: string, limit: number): RawLead[] {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const roots = ["Aarav", "Meridian", "Sunrise", "Vertex", "Crescent", "Trinity", "Pioneer", "Everest", "Falcon", "Summit"];
  const suffixes = ["Technologies", "Ventures", "Infra", "Solutions", "Retail", "Logistics", "Pharma", "Textiles", "Consultancy", "Systems"];
  const directors = ["Rajesh Kumar", "Anita Desai", "Suresh Iyer", "Meena Gupta", "Vivek Menon", "Kavita Reddy", "Anil Kapoor", "Deepa Nair"];
  const titles = ["Managing Director", "Director", "Whole-time Director", "Additional Director"];
  const revenues = ["₹1 Cr - ₹5 Cr", "₹5 Cr - ₹25 Cr", "₹25 Cr - ₹100 Cr", "₹50 Lakh - ₹1 Cr", "₹100 Cr+"];
  const states = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Gujarat", "Telangana", "West Bengal", "Haryana"];
  return Array.from({ length: limit }, (_, i) => {
    const co = `${roots[i % roots.length]} ${cap(sector)} ${suffixes[i % suffixes.length]} Private Limited`;
    const loc = region !== "India" ? region : states[i % states.length];
    return {
      name: co,
      company: co,
      address: `${i + 1}, Corporate Tower, ${loc}`,
      industry: cap(sector),
      location: loc,
      revenueEstimate: revenues[i % revenues.length],
      decisionMaker: {
        name: directors[i % directors.length],
        title: titles[i % titles.length],
      },
      source: "mca" as const,
      sourceId: `mock-mca-${i}`,
    };
  });
}
