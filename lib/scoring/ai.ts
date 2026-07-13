// Phase 4 — Enhanced AI Lead Scoring: optional Claude-powered judgement.
// Mirrors the Anthropic-optional pattern from lib/leadgen/score.ts: if there is
// no ANTHROPIC_API_KEY, or the call/parse fails, we return null so the caller
// cleanly falls back to the deterministic heuristic in ./factors. Never throws.

import Anthropic from "@anthropic-ai/sdk";
import type { ScoreInput } from "./types";
import type { RawLead } from "@/lib/leadgen/types";

export type AiScoreResult = {
  score: number;            // 0-100 overall fit
  confidence: number;       // 0-100 model confidence
  closeProbability: number; // 0-100 likelihood to close
  reasoning: string;        // one-line why
};

const clampInt = (n: unknown, fallback = 50): number => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
};

// Compact, token-cheap description of the lead + any Phase-3 signals.
function describe(input: ScoreInput): string {
  const l: RawLead = input.lead;
  const dm = l.decisionMaker;
  const lines = [
    `Company: ${l.company || "?"}`,
    `Contact: ${l.name || "?"}${dm?.title ? ` (${dm.title})` : ""}`,
    `Industry: ${l.industry ?? l.category ?? "?"}`,
    `Employees: ${l.employeeCount ?? "?"}`,
    `Email: ${l.email ?? dm?.email ?? "none"}`,
    `Phone: ${l.phone ?? dm?.phone ?? "none"}`,
    `Website: ${l.website ?? "none"}`,
    `Tech: ${l.techStack?.join(", ") || "unknown"}`,
    `Source: ${l.source}`,
  ];
  const opp = input.opportunity;
  if (opp) {
    lines.push(
      `Opportunity score: ${opp.opportunityScore}`,
      `Total potential value: $${opp.totalPotentialValue}`,
      `Recommended services: ${opp.services.map((s) => s.name).join(", ") || "none"}`,
    );
    if (typeof opp.analysis?.overallScore === "number") {
      lines.push(`Website scan score: ${opp.analysis.overallScore}`);
    }
  }
  return lines.join("\n");
}

export async function aiScore(input: ScoreInput): Promise<AiScoreResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const anthropic = new Anthropic();
    const icp = input.idealCustomer?.trim() || "a B2B company that buys digital services (websites, CRM, SEO, apps)";

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system:
        "You are a B2B sales qualification engine. Judge how well ONE lead fits the ideal customer profile. " +
        "Return ONLY a JSON object (no prose, no code fences) with numeric fields 0-100 and a one-line reason: " +
        '{"score": <0-100 overall fit>, "confidence": <0-100 how sure you are given the data>, ' +
        '"closeProbability": <0-100 likelihood to close>, "reasoning": "<one short line>"}.',
      messages: [
        {
          role: "user",
          content: `Ideal customer profile:\n${icp}\n\nLead:\n${describe(input)}`,
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<AiScoreResult>;

    return {
      score: clampInt(parsed.score),
      confidence: clampInt(parsed.confidence),
      closeProbability: clampInt(parsed.closeProbability),
      reasoning:
        typeof parsed.reasoning === "string" && parsed.reasoning.trim()
          ? parsed.reasoning.trim()
          : "AI-scored lead fit.",
    };
  } catch (err) {
    console.error("[scoring] AI scoring failed, falling back to heuristic:", err);
    return null;
  }
}
