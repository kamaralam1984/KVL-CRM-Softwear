// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 4 (Lead Intent Scoring)
// + Wave 5 (Automation integration): crossing into Hot/Very Hot (unlinked
// visitor) or a linked lead's score reaching 80 now fires real automation
// triggers (lib/automation/engine.ts).
//
// Live, event-driven visitor scoring (spec §9). Deliberately separate from
// lib/scoring/* (which evaluates cold/scraped leads for the outbound leadgen
// pipeline — a different input and purpose). Fails soft throughout — a
// scoring failure must never break event collection or session tracking.

import { getServerClient } from "@/lib/supabase/server";
import { getRules, bandFromScore } from "./rules";
import { triggerHighIntentVisitor, triggerLeadScoreSpike } from "@/lib/automation/engine";
import type { IntentBand } from "./types";

const HOT_BANDS: IntentBand[] = ["hot", "very_hot"];
const LEAD_ALERT_THRESHOLD = 80;

function log(where: string, err: unknown) {
  console.error(`[intent] ${where} failed`, err);
}

/** Mirrors a visitor's intent score onto the Lead it resolved to (Wave 3), if any. */
async function syncLeadScore(leadId: number, score: number, band: IntentBand): Promise<void> {
  try {
    const db = getServerClient();
    const { data: lead } = await db.from("leads").select("score, name, company").eq("id", leadId).maybeSingle();
    const previousScore = (lead?.score as number | undefined) ?? 0;

    // leads.status is a 3-tier check constraint (hot/warm/cold) — hot and
    // very_hot both collapse to "hot" there; the finer 4-tier band stays on
    // the visitor record.
    const status = band === "cold" ? "cold" : band === "warm" ? "warm" : "hot";
    await db.from("leads").update({ score, status }).eq("id", leadId);

    if (score >= LEAD_ALERT_THRESHOLD && previousScore < LEAD_ALERT_THRESHOLD) {
      triggerLeadScoreSpike({
        leadId,
        name: (lead?.name as string | undefined) ?? "",
        company: (lead?.company as string | undefined) ?? "",
        score,
      });
    }
  } catch (err) {
    log("syncLeadScore", err);
  }
}

async function addIntentPoints(visitorId: string, points: number, siteId: string): Promise<void> {
  if (!points) return;
  try {
    const db = getServerClient();
    const { data } = await db
      .from("visitors")
      .select("intent_score, first_touch_source, last_touch_source")
      .eq("visitor_id", visitorId)
      .maybeSingle();
    const current = (data?.intent_score as number | undefined) ?? 0;
    const source = (data?.first_touch_source as string | undefined) || (data?.last_touch_source as string | undefined) || "";

    const rules = await getRules(siteId);
    const previousBand = bandFromScore(current, rules);
    const next = Math.max(0, Math.min(100, current + points));
    const band = bandFromScore(next, rules);

    await db.from("visitors").update({ intent_score: next, intent_band: band }).eq("visitor_id", visitorId);

    const { data: link } = await db
      .from("visitor_identity_links")
      .select("lead_id")
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (link) {
      await syncLeadScore(link.lead_id as number, next, band);
    } else if (HOT_BANDS.includes(band) && !HOT_BANDS.includes(previousBand)) {
      triggerHighIntentVisitor({ visitorId, score: next, band, source });
    }
  } catch (err) {
    log("addIntentPoints", err);
  }
}

/** applyEventPoints — sum rule points across a batch of just-recorded event names. */
export async function applyEventPoints(visitorId: string, eventNames: string[], siteId: string): Promise<void> {
  try {
    const rules = await getRules(siteId);
    const points = eventNames.reduce((sum, name) => sum + (rules[`event:${name}`] ?? 0), 0);
    await addIntentPoints(visitorId, points, siteId);
  } catch (err) {
    log("applyEventPoints", err);
  }
}

/** applyVisitBonus — award repeat-visit / return-within-7-days bonuses on a new session. */
export async function applyVisitBonus(
  visitorId: string,
  info: { isReturning: boolean; previousLastSeenAt: string | null },
  siteId: string
): Promise<void> {
  if (!info.isReturning) return;
  try {
    const rules = await getRules(siteId);
    let points = rules["bonus:repeat_visit"] ?? 10;
    if (info.previousLastSeenAt) {
      const days = (Date.now() - new Date(info.previousLastSeenAt).getTime()) / 86_400_000;
      if (days <= 7) points += rules["bonus:return_within_7_days"] ?? 10;
    }
    await addIntentPoints(visitorId, points, siteId);
  } catch (err) {
    log("applyVisitBonus", err);
  }
}
