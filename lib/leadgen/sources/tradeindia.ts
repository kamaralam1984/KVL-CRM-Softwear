// TradeIndia lead source — Indian B2B directory of suppliers/manufacturers.
//
// Finds suppliers by a text query like "industrial pumps in Chennai".
// Uses the TradeIndia seller API when TRADEINDIA_API_KEY is set, falls back to a
// Serper.dev web scrape when SERPER_API_KEY is set; otherwise returns realistic MOCK
// data so the whole pipeline still runs today. Never throws.

import type { RawLead } from "../types";

type TradeindiaSeller = {
  id?: string;
  co_name?: string;
  company?: string;
  mobile?: string;
  phone?: string;
  product_name?: string;
  category?: string;
  city?: string;
  state?: string;
  full_address?: string;
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

export async function fetchTradeindiaLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.TRADEINDIA_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;
  const { category, city } = splitQuery(query);

  if (key) {
    try {
      const res = await fetch(
        `https://www.tradeindia.com/utils/my_profile.html?userid=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) {
        console.error("[leadgen] TradeIndia error:", res.status, await res.text());
        return mock(category, city, limit);
      }
      const data = (await res.json()) as { sellers?: TradeindiaSeller[] };
      return (data.sellers ?? []).slice(0, limit).map((s) => ({
        name: s.co_name ?? s.company ?? "Unknown",
        company: s.co_name ?? s.company ?? "Unknown",
        phone: s.mobile ?? s.phone,
        category: s.product_name ?? s.category ?? category,
        industry: s.category ?? category,
        location: [s.city, s.state].filter(Boolean).join(", ") || city,
        address: s.full_address,
        source: "tradeindia" as const,
        sourceId: s.id,
        raw: s as Record<string, unknown>,
      }));
    } catch (err) {
      console.error("[leadgen] TradeIndia fetch failed:", err);
      return mock(category, city, limit);
    }
  }

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": serperKey },
        body: JSON.stringify({ q: `site:tradeindia.com ${query}`, num: Math.min(limit, 20) }),
      });
      if (!res.ok) {
        console.error("[leadgen] TradeIndia/Serper error:", res.status, await res.text());
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
        source: "tradeindia" as const,
        sourceId: `serper-tradeindia-${i}`,
        raw: o as Record<string, unknown>,
      }));
    } catch (err) {
      console.error("[leadgen] TradeIndia/Serper fetch failed:", err);
      return mock(category, city, limit);
    }
  }

  return mock(category, city, limit);
}

// --- mock fallback (no API key needed) -----------------------------------
function mock(category: string, city: string, limit: number): RawLead[] {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const prefixes = ["Sagar", "Jai", "Deepak", "Ambika", "Laxmi", "Metro", "Prime", "Unique", "Global", "Techno"];
  const suffixes = ["Industries", "Trading Company", "Exports Pvt. Ltd.", "Manufacturers", "Engineers", "Products", "Sales Corp.", "Overseas", "Solutions", "Enterprises"];
  const cities = ["Chennai", "Kolkata", "Bengaluru", "Hyderabad", "Jaipur", "Kanpur", "Faridabad", "Nagpur"];
  return Array.from({ length: limit }, (_, i) => {
    const co = `${prefixes[i % prefixes.length]} ${cap(category)} ${suffixes[i % suffixes.length]}`;
    const loc = city !== "India" ? city : cities[i % cities.length];
    return {
      name: co,
      company: co,
      phone: `+91 ${99000 + (i % 999)}${String(200000 + i).slice(-5)}`,
      category,
      industry: `${cap(category)} & Allied Products`,
      location: loc,
      address: `${i + 1}, Industrial Estate, ${loc}`,
      source: "tradeindia" as const,
      sourceId: `mock-tradeindia-${i}`,
    };
  });
}
