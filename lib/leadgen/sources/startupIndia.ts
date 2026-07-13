// Startup India lead source — DPIIT-recognised Indian startups by sector.
//
// Finds startups by a text query like "fintech" or "healthtech in Bengaluru".
// Uses a Startup India API when STARTUP_INDIA_API_KEY is set, falls back to a
// Serper.dev web scrape when SERPER_API_KEY is set; otherwise returns realistic MOCK
// data so the whole pipeline still runs today. Never throws.

import type { RawLead } from "../types";

type StartupIndiaRecord = {
  id?: string;
  name?: string;
  sector?: string;
  industry?: string;
  website?: string;
  employeeCount?: number;
  team_size?: number;
  city?: string;
  state?: string;
  linkedin?: string;
};

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

function splitQuery(query: string): { sector: string; city: string } {
  const sector = query.split(" in ")[0]?.trim() || "technology";
  const city = query.split(" in ")[1]?.trim() || "India";
  return { sector, city };
}

export async function fetchStartupIndiaLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.STARTUP_INDIA_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;
  const { sector, city } = splitQuery(query);

  if (key) {
    try {
      const res = await fetch(
        "https://api.startupindia.gov.in/sih/api/noauth/search/profiles",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ query, count: Math.min(limit, 50), roles: ["Startup"] }),
        },
      );
      if (!res.ok) {
        console.error("[leadgen] Startup India error:", res.status, await res.text());
        return mock(sector, city, limit);
      }
      const data = (await res.json()) as { content?: StartupIndiaRecord[] };
      return (data.content ?? []).slice(0, limit).map((s) => ({
        name: s.name ?? "Unknown",
        company: s.name ?? "Unknown",
        website: s.website,
        industry: s.sector ?? s.industry ?? sector,
        location: [s.city, s.state].filter(Boolean).join(", ") || city,
        employeeCount: s.employeeCount ?? s.team_size,
        socialLinks: s.linkedin ? { linkedin: s.linkedin } : undefined,
        source: "startup_india" as const,
        sourceId: s.id,
        raw: s as Record<string, unknown>,
      }));
    } catch (err) {
      console.error("[leadgen] Startup India fetch failed:", err);
      return mock(sector, city, limit);
    }
  }

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": serperKey },
        body: JSON.stringify({ q: `site:startupindia.gov.in ${query} startup`, num: Math.min(limit, 20) }),
      });
      if (!res.ok) {
        console.error("[leadgen] Startup India/Serper error:", res.status, await res.text());
        return mock(sector, city, limit);
      }
      const data = (await res.json()) as { organic?: SerperOrganic[] };
      return (data.organic ?? []).slice(0, limit).map((o, i) => ({
        name: o.title ?? "Unknown",
        company: (o.title ?? "Unknown").replace(/ *[-|].*$/, "").trim(),
        website: o.link,
        industry: sector,
        location: city,
        source: "startup_india" as const,
        sourceId: `serper-startupindia-${i}`,
        raw: o as Record<string, unknown>,
      }));
    } catch (err) {
      console.error("[leadgen] Startup India/Serper fetch failed:", err);
      return mock(sector, city, limit);
    }
  }

  return mock(sector, city, limit);
}

// --- mock fallback (no API key needed) -----------------------------------
function mock(sector: string, city: string, limit: number): RawLead[] {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const roots = ["Zoxa", "Fynd", "Nova", "Quikr", "Vaya", "Lyra", "Orbit", "Kite", "Pulse", "Zeno", "Bolt", "Hexa"];
  const suffixes = ["Labs", "Tech", "AI", "ify", "Works", "X", "Hub", "Sphere"];
  const cities = ["Bengaluru", "Gurugram", "Mumbai", "Pune", "Hyderabad", "Noida", "Chennai", "Delhi"];
  return Array.from({ length: limit }, (_, i) => {
    const co = `${roots[i % roots.length]}${suffixes[i % suffixes.length]}`;
    const slug = co.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const loc = city !== "India" ? city : cities[i % cities.length];
    return {
      name: co,
      company: co,
      website: `https://${slug}.in`,
      industry: cap(sector),
      location: loc,
      employeeCount: [8, 15, 24, 42, 60, 110, 5, 33][i % 8],
      socialLinks: { linkedin: `https://www.linkedin.com/company/${slug}` },
      source: "startup_india" as const,
      sourceId: `mock-startup_india-${i}`,
    };
  });
}
