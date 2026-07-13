// Enhanced lead scoring orchestrator (Phase 4).
// Combines the heuristic factor model with an optional AI pass, producing a
// rich, explainable LeadScore. Never throws. Existing score.ts is untouched.

import { computeFactors } from "./factors";
import { aiScore } from "./ai";
import {
  temperatureFromScore,
  priorityFromScore,
  type LeadScore,
  type ScoreInput,
} from "./types";

export async function scoreLead(input: ScoreInput): Promise<LeadScore> {
  const base = computeFactors(input);
  const ai = await aiScore(input).catch(() => null);

  const score = clamp(ai?.score ?? base.score);
  const confidence = clamp(ai?.confidence ?? base.confidence);
  const closeProbability = clamp(ai?.closeProbability ?? base.closeProbability);
  const temperature = temperatureFromScore(score);
  const priority = priorityFromScore(score, closeProbability);
  const reasoning =
    ai?.reasoning ??
    `${temperature.toUpperCase()} lead — ${score}/100 from ${base.factors.length} weighted factors`;

  return {
    score,
    temperature,
    confidence,
    closeProbability,
    priority,
    estimatedValue: Math.round(base.estimatedValue),
    factors: base.factors,
    reasoning,
    usedAi: !!ai,
    scoredAt: Date.now(),
  };
}

export async function scoreLeads(inputs: ScoreInput[]): Promise<LeadScore[]> {
  return Promise.all(inputs.map((i) => scoreLead(i)));
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export * from "./types";
export { computeFactors } from "./factors";
export { aiScore } from "./ai";
