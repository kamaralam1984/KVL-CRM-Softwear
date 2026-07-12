// Source registry. Maps each LeadSource to its fetch function and runs the
// enabled sources against the given queries, returning one merged RawLead[].

import type { LeadSource, RawLead } from "../types";
import { fetchGoogleMapsLeads } from "./googleMaps";
import { fetchApolloLeads } from "./apollo";
import { fetchHunterLeads } from "./hunter";
import { fetchWebFormLeads } from "./webForm";
import { fetchScrapeLeads } from "./scrape";

type SourceFn = (query: string, limit: number) => Promise<RawLead[]>;

export const SOURCES: Record<LeadSource, SourceFn> = {
  google_maps: fetchGoogleMapsLeads,
  apollo: fetchApolloLeads,
  hunter: fetchHunterLeads,
  web_form: fetchWebFormLeads,
  scrape: fetchScrapeLeads,
};

// A per-source instruction: which source, and what queries to run through it.
export type SourcePlan = { source: LeadSource; queries: string[] };

export async function fetchFromSources(
  plans: SourcePlan[],
  perQueryLimit = 20,
): Promise<RawLead[]> {
  const tasks: Promise<RawLead[]>[] = [];
  for (const plan of plans) {
    const fn = SOURCES[plan.source];
    if (!fn) continue;
    // web_form ignores queries — pull once.
    const queries = plan.queries.length ? plan.queries : [""];
    for (const q of queries) tasks.push(safe(fn, q, perQueryLimit));
  }
  return (await Promise.all(tasks)).flat();
}

async function safe(fn: SourceFn, q: string, limit: number): Promise<RawLead[]> {
  try {
    return await fn(q, limit);
  } catch (e) {
    console.error("[leadgen] source failed:", e);
    return [];
  }
}
