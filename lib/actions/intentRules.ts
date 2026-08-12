"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
// Admin-facing CRUD for lib/intent/rules.ts's DB-backed scoring rules (Wave 4).
import { getServerClient } from "@/lib/supabase/server";

export interface IntentRuleRow {
  id: number;
  rule_key: string;
  points: number;
  description: string;
  updated_at: string;
}

export async function getIntentRules(): Promise<IntentRuleRow[]> {
  const db = getServerClient();
  const { data, error } = await db.from("intent_scoring_rules").select("*").order("rule_key", { ascending: true });
  if (error || !data) return [];
  return data as IntentRuleRow[];
}

export async function updateIntentRule(ruleKey: string, points: number): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("intent_scoring_rules").update({ points }).eq("rule_key", ruleKey);
  if (error) throw new Error(error.message);
}
