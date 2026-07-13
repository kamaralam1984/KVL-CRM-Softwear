// Manual lead import — normalizes a single hand-entered lead into a RawLead.
// Trims strings, drops empties, and stamps source "manual_import".

import type { RawLead } from "@/lib/leadgen/types";

function clean(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/**
 * Normalize a manually-entered lead. `company` is required; everything else is
 * optional and trimmed. source defaults to "manual_import" but a caller-set
 * source (if valid) is preserved.
 */
export function parseManualLead(input: Partial<RawLead> & { company: string }): RawLead {
  const company = clean(input.company) ?? String(input.company ?? "").trim();
  const name = clean(input.name) ?? company;

  const lead: RawLead = {
    name,
    company: company || name,
    source: input.source ?? "manual_import",
  };

  const email = clean(input.email);
  const phone = clean(input.phone);
  const website = clean(input.website);
  const address = clean(input.address);
  const category = clean(input.category);
  const industry = clean(input.industry);
  const location = clean(input.location);
  const revenueEstimate = clean(input.revenueEstimate);
  const sourceId = clean(input.sourceId);

  if (email) lead.email = email;
  if (phone) lead.phone = phone;
  if (website) lead.website = website;
  if (address) lead.address = address;
  if (category) lead.category = category;
  if (industry) lead.industry = industry;
  if (location) lead.location = location;
  if (revenueEstimate) lead.revenueEstimate = revenueEstimate;
  if (sourceId) lead.sourceId = sourceId;

  if (typeof input.employeeCount === "number" && Number.isFinite(input.employeeCount)) {
    lead.employeeCount = input.employeeCount;
  }
  if (Array.isArray(input.techStack)) {
    const stack = input.techStack.map((t) => clean(t)).filter((t): t is string => !!t);
    if (stack.length) lead.techStack = stack;
  }
  if (input.decisionMaker && typeof input.decisionMaker === "object") {
    lead.decisionMaker = input.decisionMaker;
  }
  if (input.socialLinks && typeof input.socialLinks === "object") {
    lead.socialLinks = input.socialLinks;
  }
  if (input.raw && typeof input.raw === "object") {
    lead.raw = input.raw;
  }

  return lead;
}
