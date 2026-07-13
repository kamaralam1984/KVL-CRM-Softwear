// API lead import — maps an arbitrary external JSON payload into RawLead[]
// defensively. Accepts an array of objects, or a wrapper { leads: [...] }
// (also tolerates { data: [...] } / { results: [...] }). Items without a
// resolvable company are skipped. source is always "api_import".

import type { RawLead } from "@/lib/leadgen/types";

function str(v: unknown): string | undefined {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : undefined;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

// Pick the first present value across a list of candidate keys (case-insensitive).
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/\d+/);
    if (m) {
      const n = Number(m[0]);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    for (const key of ["leads", "data", "results", "items", "records"]) {
      if (Array.isArray(p[key])) return p[key] as unknown[];
    }
  }
  return [];
}

function mapItem(item: unknown, index: number): RawLead | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;

  const company = str(pick(obj, ["company", "companyName", "organization", "organisation", "business", "businessName", "accountName"]));
  const name = str(pick(obj, ["name", "contact", "contactName", "fullName", "person"]));
  const resolvedCompany = company ?? name;
  if (!resolvedCompany) return null; // must have a company

  const lead: RawLead = {
    name: name ?? resolvedCompany,
    company: resolvedCompany,
    source: "api_import",
    sourceId: str(pick(obj, ["id", "sourceId", "leadId", "uuid"])) ?? `api-${index}`,
    raw: obj,
  };

  const email = str(pick(obj, ["email", "emailAddress", "mail"]));
  const phone = str(pick(obj, ["phone", "mobile", "telephone", "phoneNumber"]));
  const website = str(pick(obj, ["website", "url", "site", "domain", "homepage"]));
  const address = str(pick(obj, ["address", "street"]));
  const category = str(pick(obj, ["category"]));
  const industry = str(pick(obj, ["industry", "sector", "vertical"]));
  const location = str(pick(obj, ["location", "city", "region", "country"]));
  const revenueEstimate = str(pick(obj, ["revenue", "revenueEstimate", "annualRevenue", "turnover"]));
  const employeeCount = toNumber(pick(obj, ["employees", "employeeCount", "headcount", "companySize", "size"]));

  if (email) lead.email = email;
  if (phone) lead.phone = phone;
  if (website) lead.website = website;
  if (address) lead.address = address;
  if (category) lead.category = category;
  if (industry) lead.industry = industry;
  if (location) lead.location = location;
  if (revenueEstimate) lead.revenueEstimate = revenueEstimate;
  if (employeeCount !== undefined) lead.employeeCount = employeeCount;

  const techStack = pick(obj, ["techStack", "technologies", "tech"]);
  if (Array.isArray(techStack)) {
    const stack = techStack.map((t) => str(t)).filter((t): t is string => !!t);
    if (stack.length) lead.techStack = stack;
  }

  return lead;
}

/**
 * Map an arbitrary API payload into RawLead[]. Never throws — invalid or
 * company-less items are skipped and an empty array is returned on bad input.
 */
export function parseApiLeads(payload: unknown): RawLead[] {
  const arr = extractArray(payload);
  const leads: RawLead[] = [];
  arr.forEach((item, i) => {
    const lead = mapItem(item, i);
    if (lead) leads.push(lead);
  });
  return leads;
}
