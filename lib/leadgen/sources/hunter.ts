// Hunter.io lead source — finds email addresses for a company domain.
// Query should be a domain (e.g. "acme.com") or "company acme.com".
// Real API when HUNTER_API_KEY is set; otherwise mock.

import type { RawLead } from "../types";

type HunterEmail = { value?: string; first_name?: string; last_name?: string; position?: string; phone_number?: string };

export async function fetchHunterLeads(query: string, limit = 10): Promise<RawLead[]> {
  const domain = extractDomain(query);
  const key = process.env.HUNTER_API_KEY;
  if (!key) return mock(domain, limit);

  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=${Math.min(limit, 100)}&api_key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("[leadgen] Hunter error:", res.status, await res.text());
    return [];
  }
  const data = (await res.json()) as { data?: { organization?: string; emails?: HunterEmail[] } };
  const company = data.data?.organization ?? domain;
  return (data.data?.emails ?? []).slice(0, limit).map((e) => ({
    name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || company,
    company,
    email: e.value,
    phone: e.phone_number,
    website: `https://${domain}`,
    category: e.position,
    source: "hunter" as const,
    sourceId: e.value,
    raw: e as Record<string, unknown>,
  }));
}

function extractDomain(query: string): string {
  const m = query.match(/[a-z0-9-]+\.[a-z.]{2,}/i);
  return m ? m[0] : query.trim().toLowerCase().replace(/\s+/g, "") + ".com";
}

function mock(domain: string, limit: number): RawLead[] {
  const company = domain.split(".")[0];
  const cap = company.charAt(0).toUpperCase() + company.slice(1);
  const roles = ["Founder", "CEO", "Head of Sales", "Marketing Lead", "Operations"];
  const names = ["Kabir", "Ananya", "Rohan", "Isha", "Dev"];
  return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
    name: `${names[i]} ${["Mehta", "Iyer", "Bose", "Kapoor", "Reddy"][i]}`,
    company: cap,
    email: `${names[i].toLowerCase()}@${domain}`,
    website: `https://${domain}`,
    category: roles[i],
    source: "hunter" as const,
    sourceId: `mock-hunter-${company}-${i}`,
  }));
}
