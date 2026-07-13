// IndiaMART lead source — Indian B2B suppliers/manufacturers.
//
// Finds suppliers by a text query like "cnc machine in Pune" (product/category + city).
// Uses the IndiaMART Push/Lead API when INDIAMART_API_KEY is set, falls back to a
// Serper.dev web scrape when SERPER_API_KEY is set; otherwise returns realistic MOCK
// data so the whole pipeline still runs today. Never throws.

import type { RawLead } from "../types";

type IndiamartSupplier = {
  id?: string;
  company_name?: string;
  contact_no?: string;
  mobile?: string;
  product?: string;
  category?: string;
  city?: string;
  state?: string;
  address?: string;
};

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

function splitQuery(query: string): { category: string; city: string } {
  const category = query.split(" in ")[0]?.trim() || "product";
  const city = query.split(" in ")[1]?.trim() || "India";
  return { category, city };
}

export async function fetchIndiamartLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.INDIAMART_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;
  const { category, city } = splitQuery(query);

  if (key) {
    try {
      const res = await fetch(
        `https://mapi.indiamart.com/wservce/enquiry/listing/?glusr_crm_key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) {
        console.error("[leadgen] IndiaMART error:", res.status, await res.text());
        return mock(category, city, limit);
      }
      const data = (await res.json()) as { RESPONSE?: IndiamartSupplier[] };
      return (data.RESPONSE ?? []).slice(0, limit).map((s) => ({
        name: s.company_name ?? "Unknown",
        company: s.company_name ?? "Unknown",
        phone: s.mobile ?? s.contact_no,
        category: s.product ?? s.category ?? category,
        industry: s.category ?? category,
        location: [s.city, s.state].filter(Boolean).join(", ") || city,
        address: s.address,
        source: "indiamart" as const,
        sourceId: s.id,
        raw: s as Record<string, unknown>,
      }));
    } catch (err) {
      console.error("[leadgen] IndiaMART fetch failed:", err);
      return mock(category, city, limit);
    }
  }

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": serperKey },
        body: JSON.stringify({ q: `site:indiamart.com ${query}`, num: Math.min(limit, 20) }),
      });
      if (!res.ok) {
        console.error("[leadgen] IndiaMART/Serper error:", res.status, await res.text());
        return mock(category, city, limit);
      }
      const data = (await res.json()) as { organic?: SerperOrganic[] };
      return (data.organic ?? []).slice(0, limit).map((o, i) => ({
        name: o.title ?? "Unknown",
        company: (o.title ?? "Unknown").replace(/ *[-|].*$/, "").trim(),
        category,
        industry: category,
        location: city,
        website: o.link,
        source: "indiamart" as const,
        sourceId: `serper-indiamart-${i}`,
        raw: o as Record<string, unknown>,
      }));
    } catch (err) {
      console.error("[leadgen] IndiaMART/Serper fetch failed:", err);
      return mock(category, city, limit);
    }
  }

  return mock(category, city, limit);
}

// --- mock fallback (no API key needed) -----------------------------------
function mock(category: string, city: string, limit: number): RawLead[] {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const prefixes = ["Shree", "Bharat", "Sri", "Maa", "Royal", "Om", "National", "Star", "Krishna", "Ganpati"];
  const suffixes = ["Industries", "Enterprises", "Traders", "Manufacturing Co.", "Exports", "Engineering Works", "Udyog", "Corporation", "Impex", "Agencies"];
  const cities = ["Mumbai", "Delhi", "Pune", "Ahmedabad", "Surat", "Ludhiana", "Coimbatore", "Rajkot"];
  return Array.from({ length: limit }, (_, i) => {
    const co = `${prefixes[i % prefixes.length]} ${cap(category)} ${suffixes[i % suffixes.length]}`;
    const loc = city !== "India" ? city : cities[i % cities.length];
    return {
      name: co,
      company: co,
      phone: `+91 ${98000 + (i % 999)}${String(100000 + i).slice(-5)}`,
      category,
      industry: `${cap(category)} Manufacturing`,
      location: loc,
      address: `Plot ${i + 1}, MIDC Industrial Area, ${loc}`,
      source: "indiamart" as const,
      sourceId: `mock-indiamart-${i}`,
    };
  });
}
