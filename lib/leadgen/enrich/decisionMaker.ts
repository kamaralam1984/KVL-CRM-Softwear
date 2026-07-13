// Decision-maker heuristics. If a lead already carries a decisionMaker we
// respect it; otherwise we guess a plausible title from the industry and
// build a role-based email from the website domain. No external calls.

import type { RawLead } from "../types";

// Likely primary-contact title per industry keyword. Matched loosely.
const TITLE_BY_INDUSTRY: { match: RegExp; title: string }[] = [
  { match: /saas|software|tech|it|startup|dev/i, title: "Chief Technology Officer" },
  { match: /health|dental|dentist|clinic|medical|hospital|pharma/i, title: "Practice Owner" },
  { match: /gym|fitness|wellness|yoga|spa/i, title: "Owner / Founder" },
  { match: /restaurant|cafe|food|hospitality|hotel/i, title: "General Manager" },
  { match: /retail|store|shop|ecommerce|commerce/i, title: "Store Owner" },
  { match: /real ?estate|property|realty/i, title: "Principal Broker" },
  { match: /law|legal|attorney|advocate/i, title: "Managing Partner" },
  { match: /finance|account|bank|insurance|invest/i, title: "Managing Director" },
  { match: /market|agency|media|advertis|design/i, title: "Founder / Creative Director" },
  { match: /construct|build|contractor|architect/i, title: "Principal" },
  { match: /manufactur|industrial|factory|logistics/i, title: "Operations Director" },
  { match: /education|school|training|academy|coach/i, title: "Director" },
];

const DEFAULT_TITLE = "Owner / Founder";

// Pull a bare registrable domain out of a website URL, dropping protocol,
// path, port and a leading "www.". Returns undefined if unparseable.
function domainFromWebsite(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    const withProto = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    const host = new URL(withProto).hostname.toLowerCase();
    return host.replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
}

function titleForIndustry(industry?: string, category?: string): string {
  const hay = `${industry ?? ""} ${category ?? ""}`.trim();
  if (!hay) return DEFAULT_TITLE;
  const hit = TITLE_BY_INDUSTRY.find((t) => t.match.test(hay));
  return hit?.title ?? DEFAULT_TITLE;
}

export function guessDecisionMaker(
  lead: RawLead,
): { name?: string; title?: string; email?: string } {
  // Respect any decision-maker the source already provided.
  if (lead.decisionMaker && (lead.decisionMaker.name || lead.decisionMaker.email || lead.decisionMaker.title)) {
    const { name, title, email } = lead.decisionMaker;
    return { name, title, email };
  }

  const title = titleForIndustry(lead.industry, lead.category);
  const domain = domainFromWebsite(lead.website);

  // Prefer any known lead email; else construct a role-based address.
  const email = lead.email ?? (domain ? `info@${domain}` : undefined);

  return {
    name: undefined, // no reliable way to guess a person's name
    title,
    email,
  };
}
