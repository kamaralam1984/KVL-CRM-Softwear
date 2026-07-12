// AI scoring + enrichment. Takes raw leads, asks Claude to rate each 0-100
// for fit, estimate a deal value, and add tags. Falls back to a heuristic
// score if no ANTHROPIC_API_KEY or the AI call fails, so the pipeline never breaks.

import Anthropic from "@anthropic-ai/sdk";
import type { RawLead, ScoredLead } from "./types";

type AiVerdict = {
  sourceId?: string;
  index: number;
  score: number;
  value: number;
  tags: string[];
  reason: string;
};

const initials = (name: string) =>
  name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const statusFromScore = (s: number): ScoredLead["status"] =>
  s >= 80 ? "hot" : s >= 60 ? "warm" : "cold";

export async function scoreLeads(
  raw: RawLead[],
  idealCustomer: string,
): Promise<ScoredLead[]> {
  const verdicts = await askAi(raw, idealCustomer);

  return raw.map((lead, i) => {
    const v = verdicts.find((x) => x.index === i);
    const score = v?.score ?? heuristicScore(lead);
    return {
      name: lead.name,
      company: lead.company,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      score,
      status: statusFromScore(score),
      stage: "Discovery",
      value: v?.value ?? 15000,
      owner: "Unassigned",
      avatar: initials(lead.company || lead.name),
      lastContact: "just now",
      tags: v?.tags ?? (lead.category ? [lead.category] : []),
      source: lead.source,
      reason: v?.reason,
    };
  });
}

async function askAi(raw: RawLead[], idealCustomer: string): Promise<AiVerdict[]> {
  if (!process.env.ANTHROPIC_API_KEY || raw.length === 0) return [];
  try {
    const anthropic = new Anthropic();
    const list = raw
      .map((l, i) => `${i}. ${l.company} | ${l.category ?? "?"} | ${l.address ?? "?"} | web:${l.website ?? "none"}`)
      .join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system:
        "You are a B2B sales qualification engine. Score each lead 0-100 for how well it fits the ideal customer profile. Estimate a realistic annual deal value in USD. Add 1-3 short tags. Give a one-line reason. Reply ONLY with a JSON array of objects: {index, score, value, tags, reason}. No prose.",
      messages: [
        { role: "user", content: `Ideal customer: ${idealCustomer}\n\nLeads:\n${list}` },
      ],
    });

    const text = msg.content.find((b) => b.type === "text")?.text ?? "[]";
    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    return JSON.parse(json) as AiVerdict[];
  } catch (err) {
    console.error("[leadgen] AI scoring failed, using heuristic:", err);
    return [];
  }
}

// Simple deterministic fallback: reward having contact channels + a website.
function heuristicScore(lead: RawLead): number {
  let s = 45;
  if (lead.email) s += 15;
  if (lead.phone) s += 15;
  if (lead.website) s += 15;
  if (lead.category) s += 5;
  return Math.min(s, 95);
}
