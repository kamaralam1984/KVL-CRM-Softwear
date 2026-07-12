"use server";
// The daily lead-generation pipeline.
//
//   source(s) → dedupe (against DB + within batch) → AI score → top N → save
//
// Designed to be called by a cron job once a day, or manually from the API
// route / dashboard button. Returns a summary of what happened.

import { getServerClient } from "@/lib/supabase/server";
import { fetchFromSources, type SourcePlan } from "./sources";
import { scoreLeads } from "./score";
import { runOutreach } from "./outreach";
import type { OutreachConfig, OutreachResult } from "./outreach/types";
import type { RawLead, ScoredLead } from "./types";

export type PipelineConfig = {
  // Legacy: plain queries run through Google Maps only.
  queries?: string[];       // e.g. ["dentists in Delhi", "gyms in Mumbai"]
  // Preferred: run specific sources with their own queries.
  sources?: SourcePlan[];   // e.g. [{source:"apollo", queries:["saas founder"]}]
  idealCustomer: string;    // ICP description for AI scoring
  dailyTarget?: number;     // how many leads to keep (default 10)
  outreach?: OutreachConfig; // if set, auto-reach out to the saved leads
};

export type PipelineResult = {
  sourced: number;
  afterDedupe: number;
  saved: number;
  leads: ScoredLead[];
  usedMockData: boolean;
  outreach?: OutreachResult[];
};

export async function runLeadGenPipeline(
  config: PipelineConfig,
): Promise<PipelineResult> {
  const target = config.dailyTarget ?? 10;

  // Build the source plan. Prefer explicit `sources`; else fall back to the
  // legacy `queries` (Google Maps only).
  const plans: SourcePlan[] =
    config.sources && config.sources.length > 0
      ? config.sources
      : [{ source: "google_maps", queries: config.queries ?? [] }];

  const usedMockData = plans.some(
    (p) => p.source === "google_maps" && !process.env.GOOGLE_MAPS_API_KEY,
  );

  // 1. SOURCE — run every enabled source, merged into one list.
  const sourced: RawLead[] = await fetchFromSources(plans, 20);

  // 2. DEDUPE — within the batch (by email/phone) and against existing leads.
  const existing = await existingContactKeys();
  const seen = new Set<string>();
  const fresh = sourced.filter((l) => {
    const key = (l.email || l.phone || l.sourceId || l.company).toLowerCase();
    if (seen.has(key) || existing.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 3. SCORE with AI, then keep the best `target`.
  const scored = (await scoreLeads(fresh, config.idealCustomer))
    .sort((a, b) => b.score - a.score)
    .slice(0, target);

  // 4. SAVE to the CRM leads table.
  const saved = await saveLeads(scored);

  // 5. OUTREACH — optionally reach out to every fresh lead right away.
  let outreach: OutreachResult[] | undefined;
  if (config.outreach && config.outreach.channels.length > 0) {
    outreach = await runOutreach(scored, config.outreach);
  }

  return {
    sourced: sourced.length,
    afterDedupe: fresh.length,
    saved,
    leads: scored,
    usedMockData,
    outreach,
  };
}

async function existingContactKeys(): Promise<Set<string>> {
  const db = getServerClient();
  const { data } = await db.from("leads").select("email, phone, company");
  const set = new Set<string>();
  for (const r of data ?? []) {
    if (r.email) set.add(String(r.email).toLowerCase());
    if (r.phone) set.add(String(r.phone).toLowerCase());
    if (r.company) set.add(String(r.company).toLowerCase());
  }
  return set;
}

async function saveLeads(leads: ScoredLead[]): Promise<number> {
  if (leads.length === 0) return 0;
  const db = getServerClient();
  // Strip pipeline-only fields the table doesn't have.
  const rows = leads.map(({ source, reason, ...row }) => row);
  const { data, error } = await db.from("leads").insert(rows).select("id");
  if (error) {
    console.error("[leadgen] save failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
