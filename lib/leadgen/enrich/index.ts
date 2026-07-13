// Enrichment orchestrator. Fills missing RawLead fields best-effort and
// returns a NEW, immutably-merged lead. Every step degrades gracefully —
// enrichLead never throws, so a bad lead can't break the pipeline.

import type { RawLead, DecisionMaker } from "../types";
import { detectTechStack } from "./techStack";
import { estimateRevenue } from "./revenue";
import { guessDecisionMaker } from "./decisionMaker";

// Best-effort "location" from a free-form address: take the last 1-2
// comma-separated segments (usually city, region/country).
function locationFromAddress(address?: string): string | undefined {
  if (!address) return undefined;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  if (parts.length <= 2) return parts.join(", ");
  return parts.slice(-2).join(", ");
}

export async function enrichLead(lead: RawLead): Promise<RawLead> {
  try {
    const next: RawLead = { ...lead };

    // techStack — detect from the website when we don't already have it.
    if ((!next.techStack || next.techStack.length === 0) && next.website) {
      next.techStack = await detectTechStack(next.website);
    }

    // employeeCount is left untouched if unknown (we don't fabricate it).

    // revenueEstimate — derive from headcount + industry when missing.
    if (!next.revenueEstimate) {
      next.revenueEstimate = estimateRevenue(next.employeeCount, next.industry);
    }

    // decisionMaker — guess when absent, merging over any partial value.
    if (!next.decisionMaker || (!next.decisionMaker.name && !next.decisionMaker.email && !next.decisionMaker.title)) {
      const guess = guessDecisionMaker(next);
      const merged: DecisionMaker = { ...next.decisionMaker, ...guess };
      // Drop undefined keys so we don't overwrite with blanks.
      (Object.keys(merged) as (keyof DecisionMaker)[]).forEach((k) => {
        if (merged[k] === undefined) delete merged[k];
      });
      if (Object.keys(merged).length > 0) next.decisionMaker = merged;
    }

    // location — parse from address when missing.
    if (!next.location) {
      const loc = locationFromAddress(next.address);
      if (loc) next.location = loc;
    }

    return next;
  } catch (err) {
    console.error("[leadgen:enrich] enrichLead failed, returning original lead:", err);
    return lead;
  }
}

// Enrich many leads with a bounded concurrency so we don't fire hundreds of
// site fetches at once. Order of the returned array matches the input.
export async function enrichLeads(
  leads: RawLead[],
  concurrency = 5,
): Promise<RawLead[]> {
  const results = new Array<RawLead>(leads.length);
  const limit = Math.max(1, Math.floor(concurrency));
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < leads.length) {
      const i = cursor++;
      try {
        results[i] = await enrichLead(leads[i]);
      } catch (err) {
        console.error("[leadgen:enrich] enrichLeads worker failed at index", i, err);
        results[i] = leads[i];
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, leads.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
