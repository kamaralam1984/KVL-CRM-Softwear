// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 4 (Lead Intent Scoring)
// Rules are admin-configurable (spec §34) via the `intent_scoring_rules` table —
// DEFAULT_RULES is only the in-code fallback so scoring still works correctly
// before the SQL migration runs, matching this codebase's "real-or-mock" convention.

import { getServerClient } from "@/lib/supabase/server";
import type { IntentBand } from "./types";

export const DEFAULT_RULES: Record<string, number> = {
  "event:page_view": 5,
  "event:pricing_view": 10,
  "event:demo_click": 15,
  "event:whatsapp_click": 15,
  "event:form_start": 10,
  "event:form_submit": 25,
  "event:phone_click": 10,
  "event:email_click": 8,
  "event:video_play": 5,
  "event:video_complete": 10,
  "event:cta_click": 5,
  "event:outbound_click": 3,
  "event:download": 8,
  "event:scroll_depth": 2,
  "bonus:repeat_visit": 10,
  "bonus:return_within_7_days": 10,
  "threshold:warm": 31,
  "threshold:hot": 61,
  "threshold:very_hot": 81,
};

export async function getRules(siteId: string): Promise<Record<string, number>> {
  try {
    const db = getServerClient();
    const { data } = await db.from("intent_scoring_rules").select("rule_key, points").eq("site_id", siteId);
    if (!data || !data.length) return DEFAULT_RULES;
    const merged = { ...DEFAULT_RULES };
    for (const row of data as { rule_key: string; points: number }[]) {
      merged[row.rule_key] = row.points;
    }
    return merged;
  } catch (err) {
    console.error("[intent] getRules failed", err);
    return DEFAULT_RULES;
  }
}

export function bandFromScore(score: number, rules: Record<string, number>): IntentBand {
  if (score >= (rules["threshold:very_hot"] ?? 81)) return "very_hot";
  if (score >= (rules["threshold:hot"] ?? 61)) return "hot";
  if (score >= (rules["threshold:warm"] ?? 31)) return "warm";
  return "cold";
}
