// Shared types for enhanced AI Lead Scoring (Phase 4).
// Extends the basic score.ts (score+status) with confidence, close probability,
// priority and an explainable factor breakdown. Existing pipeline untouched.

import type { RawLead } from "@/lib/leadgen/types";
import type { OpportunityReport } from "@/lib/opportunity/types";

export type Temperature = "hot" | "warm" | "cold";
export type Priority = "P1" | "P2" | "P3";

export type ScoreFactor = {
  key: string;               // "contact_completeness", "website_quality", ...
  label: string;
  weight: number;            // 0-1 contribution weight
  value: number;             // 0-100 this factor's score
  note?: string;
};

export type LeadScore = {
  score: number;             // 0-100 overall
  temperature: Temperature;  // hot/warm/cold
  confidence: number;        // 0-100 AI/model confidence in the score
  closeProbability: number;  // 0-100 likelihood to close
  priority: Priority;        // P1 (act now) → P3
  estimatedValue: number;    // USD deal value
  factors: ScoreFactor[];    // explainable breakdown
  reasoning: string;         // one-line why
  usedAi: boolean;
  scoredAt: number;
};

export type ScoreInput = {
  lead: RawLead;
  opportunity?: OpportunityReport; // Phase-3 report boosts accuracy when present
  idealCustomer?: string;          // ICP description
};

export const temperatureFromScore = (s: number): Temperature =>
  s >= 80 ? "hot" : s >= 55 ? "warm" : "cold";

export const priorityFromScore = (s: number, closeProb: number): Priority => {
  const blend = s * 0.6 + closeProb * 0.4;
  return blend >= 75 ? "P1" : blend >= 50 ? "P2" : "P3";
};
