// Apollo.io lead source — B2B people/company search with verified emails.
// Real API when APOLLO_API_KEY is set; otherwise realistic mock.
// Query is a free-text role/industry, e.g. "marketing manager saas".

import type { RawLead } from "../types";

type ApolloPerson = {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  organization?: { name?: string; website_url?: string; phone?: string };
};

export async function fetchApolloLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return mock(query, limit);

  const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": key },
    body: JSON.stringify({ q_keywords: query, page: 1, per_page: Math.min(limit, 25) }),
  });
  if (!res.ok) {
    console.error("[leadgen] Apollo error:", res.status, await res.text());
    return [];
  }
  const data = (await res.json()) as { people?: ApolloPerson[] };
  return (data.people ?? []).map((p) => ({
    name: p.name ?? (`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown"),
    company: p.organization?.name ?? "Unknown",
    email: p.email,
    phone: p.organization?.phone,
    website: p.organization?.website_url,
    category: p.title,
    source: "apollo" as const,
    sourceId: p.id,
    raw: p as Record<string, unknown>,
  }));
}

function mock(query: string, limit: number): RawLead[] {
  const role = query || "decision maker";
  const firsts = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Neha", "Arjun", "Divya"];
  const cos = ["Nexlify", "Growthly", "DataPeak", "Cloudwing", "Brightloop", "Scalehaus"];
  return Array.from({ length: limit }, (_, i) => {
    const first = firsts[i % firsts.length];
    const co = cos[i % cos.length] + (i >= cos.length ? ` ${Math.floor(i / cos.length) + 1}` : "");
    const slug = co.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      name: `${first} ${["Sharma", "Patel", "Rao", "Nair"][i % 4]}`,
      company: co,
      email: `${first.toLowerCase()}@${slug}.com`,
      phone: `+91 98${String(100000 + i).slice(-6)}`,
      website: `https://${slug}.com`,
      category: role,
      source: "apollo" as const,
      sourceId: `mock-apollo-${slug}-${i}`,
    };
  });
}
