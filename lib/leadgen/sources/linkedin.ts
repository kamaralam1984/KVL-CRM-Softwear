// LinkedIn lead source — companies/people by role + industry.
// NOTE: direct LinkedIn scraping violates LinkedIn's ToS. Use a compliant
// provider key (PROXYCURL_API_KEY / APOLLO_API_KEY) when present; otherwise
// fall back to a realistic mock. Never scrape LinkedIn directly.
// Query is a free-text role/industry, e.g. "cto fintech".

import type { RawLead } from "../types";

type ProxycurlResult = {
  profile?: {
    public_identifier?: string;
    full_name?: string;
    occupation?: string;
    headline?: string;
    industry?: string;
    experiences?: { company?: string; title?: string; company_linkedin_profile_url?: string }[];
  };
  linkedin_profile_url?: string;
};

export async function fetchLinkedinLeads(query: string, limit = 20): Promise<RawLead[]> {
  const key = process.env.PROXYCURL_API_KEY ?? process.env.APOLLO_API_KEY;
  if (!key) return mock(query, limit);

  try {
    // Proxycurl "Person Search" — a ToS-compliant provider for LinkedIn data.
    const url =
      `https://nubela.co/proxycurl/api/v2/search/person?` +
      `headline=${encodeURIComponent(query)}&page_size=${Math.min(limit, 25)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) {
      console.error("[leadgen] LinkedIn error:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as { results?: ProxycurlResult[] };
    return (data.results ?? []).slice(0, limit).map((r) => {
      const p = r.profile ?? {};
      const exp = p.experiences?.[0] ?? {};
      const li = r.linkedin_profile_url;
      return {
        name: p.full_name ?? "Unknown",
        company: exp.company ?? "Unknown",
        website: exp.company_linkedin_profile_url,
        category: p.occupation ?? p.headline,
        industry: p.industry,
        source: "linkedin" as const,
        sourceId: p.public_identifier ?? li,
        decisionMaker: {
          name: p.full_name,
          title: exp.title ?? p.occupation ?? p.headline,
          linkedin: li,
        },
        socialLinks: { linkedin: li },
        raw: r as Record<string, unknown>,
      };
    });
  } catch (err) {
    console.error("[leadgen] LinkedIn error:", err);
    return [];
  }
}

function mock(query: string, limit: number): RawLead[] {
  const role = query || "decision maker";
  const firsts = ["Aditya", "Meera", "Karan", "Riya", "Sanjay", "Pooja", "Nikhil", "Tara"];
  const lasts = ["Verma", "Gupta", "Menon", "Joshi", "Desai", "Chopra"];
  const cos = ["Fintrust", "Cloudmint", "DataForge", "Nimbus Labs", "Vertexa", "Loomwork"];
  const industries = ["Financial Services", "Information Technology", "SaaS", "Consulting"];
  const titles = ["CTO", "VP Engineering", "Head of Product", "Founder", "Director of Sales"];
  return Array.from({ length: limit }, (_, i) => {
    const first = firsts[i % firsts.length];
    const last = lasts[i % lasts.length];
    const co = cos[i % cos.length] + (i >= cos.length ? ` ${Math.floor(i / cos.length) + 1}` : "");
    const slug = co.toLowerCase().replace(/[^a-z]+/g, "");
    const person = `${first.toLowerCase()}-${last.toLowerCase()}-${i}`;
    const li = `https://www.linkedin.com/in/${person}`;
    const title = titles[i % titles.length];
    return {
      name: `${first} ${last}`,
      company: co,
      website: `https://${slug}.com`,
      category: `${title} — ${role}`,
      industry: industries[i % industries.length],
      employeeCount: 50 + ((i * 37) % 950),
      source: "linkedin" as const,
      sourceId: `mock-linkedin-${slug}-${i}`,
      decisionMaker: { name: `${first} ${last}`, title, linkedin: li },
      socialLinks: { linkedin: `https://www.linkedin.com/company/${slug}` },
    };
  });
}
