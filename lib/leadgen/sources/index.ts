// Source registry. Maps each LeadSource to its fetch function and runs the
// enabled sources against the given queries, returning one merged RawLead[].

import type { LeadSource, RawLead } from "../types";
import { fetchGoogleMapsLeads } from "./googleMaps";
import { fetchApolloLeads } from "./apollo";
import { fetchHunterLeads } from "./hunter";
import { fetchWebFormLeads } from "./webForm";
import { fetchScrapeLeads } from "./scrape";
// Phase 1 — expanded Lead Intelligence sources
import { fetchLinkedinLeads } from "./linkedin";
import { fetchCrunchbaseLeads } from "./crunchbase";
import { fetchGoodfirmsLeads } from "./goodfirms";
import { fetchClutchLeads } from "./clutch";
import { fetchIndiamartLeads } from "./indiamart";
import { fetchTradeindiaLeads } from "./tradeindia";
import { fetchStartupIndiaLeads } from "./startupIndia";
import { fetchMcaLeads } from "./mca";
import { fetchGoogleSearchLeads } from "./googleSearch";
import { fetchGoogleNewsLeads } from "./googleNews";
import { fetchCompanyWebsiteLeads } from "./companyWebsite";

export type SourceFn = (query: string, limit: number) => Promise<RawLead[]>;

// Registry is Partial so sources can be added incrementally without breaking
// the build. fetchFromSources already skips any source with no adapter.
export const SOURCES: Partial<Record<LeadSource, SourceFn>> = {
  google_maps: fetchGoogleMapsLeads,
  apollo: fetchApolloLeads,
  hunter: fetchHunterLeads,
  web_form: fetchWebFormLeads,
  scrape: fetchScrapeLeads,
  linkedin: fetchLinkedinLeads,
  crunchbase: fetchCrunchbaseLeads,
  goodfirms: fetchGoodfirmsLeads,
  clutch: fetchClutchLeads,
  indiamart: fetchIndiamartLeads,
  tradeindia: fetchTradeindiaLeads,
  startup_india: fetchStartupIndiaLeads,
  mca: fetchMcaLeads,
  google_search: fetchGoogleSearchLeads,
  google_news: fetchGoogleNewsLeads,
  company_website: fetchCompanyWebsiteLeads,
};

// Import-based sources (csv_import, manual_import, api_import) are handled by
// lib/leadgen/import/* — they parse payloads rather than fetch by query, so
// they are intentionally not part of this query-driven registry.

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
