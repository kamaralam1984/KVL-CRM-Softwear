"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
// Admin-facing CRUD for lib/intent/rules.ts's DB-backed scoring rules (Wave 4).
//
// Wave 10 — rule_key is no longer globally unique (composite with site_id).
// The Admin Panel's rule editor stays scoped to the default/KVL site only —
// other sites simply inherit lib/intent/rules.ts's in-code DEFAULT_RULES
// until a future wave adds per-site rule management UI (not needed yet: a
// new site works correctly with sensible defaults from day one).
import { getServerClient } from "@/lib/supabase/server";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";

export interface IntentRuleRow {
  id: number;
  rule_key: string;
  points: number;
  description: string;
  updated_at: string;
}

export async function getIntentRules(): Promise<IntentRuleRow[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("intent_scoring_rules")
    .select("*")
    .eq("site_id", DEFAULT_SITE_ID)
    .order("rule_key", { ascending: true });
  if (error || !data) return [];
  return data as IntentRuleRow[];
}

export async function updateIntentRule(ruleKey: string, points: number): Promise<void> {
  const db = getServerClient();
  const { error } = await db
    .from("intent_scoring_rules")
    .update({ points })
    .eq("site_id", DEFAULT_SITE_ID)
    .eq("rule_key", ruleKey);
  if (error) throw new Error(error.message);
}
