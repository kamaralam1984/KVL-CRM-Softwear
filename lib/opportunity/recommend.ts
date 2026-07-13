// Phase 3 — AI Opportunity Engine: narrative recommendation.
// Writes a short, persuasive pitch from the detected gaps + recommended
// services. Uses Claude when ANTHROPIC_API_KEY is set, otherwise falls back
// to a clean heuristic paragraph. Never throws — the report always renders.

import Anthropic from "@anthropic-ai/sdk";
import type { OpportunityGap, ServiceRecommendation } from "./types";
import type { RawLead } from "@/lib/leadgen/types";

export async function generateRecommendation(
  company: string,
  gaps: OpportunityGap[],
  services: ServiceRecommendation[],
  lead: RawLead,
): Promise<{ text: string; usedAi: boolean }> {
  if (process.env.ANTHROPIC_API_KEY && services.length > 0) {
    try {
      const text = await askAi(company, gaps, services, lead);
      if (text) return { text, usedAi: true };
    } catch (err) {
      console.error("[opportunity] AI recommendation failed, using heuristic:", err);
    }
  }
  return { text: heuristic(company, services), usedAi: false };
}

async function askAi(
  company: string,
  gaps: OpportunityGap[],
  services: ServiceRecommendation[],
  lead: RawLead,
): Promise<string> {
  const anthropic = new Anthropic();

  const gapList = gaps
    .filter((g) => g.missing)
    .map((g) => `- ${g.label} (${g.severity}): ${g.evidence}`)
    .join("\n");

  const serviceList = services
    .map(
      (s) =>
        `- ${s.name} [${s.priority}] ~$${s.estimatedValue.toLocaleString()} — ${s.rationale}`,
    )
    .join("\n");

  const context = [
    `Company: ${company}`,
    lead.industry ? `Industry: ${lead.industry}` : null,
    lead.employeeCount != null ? `Employees: ${lead.employeeCount}` : null,
    lead.revenueEstimate ? `Revenue: ${lead.revenueEstimate}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system:
      "You are a B2B digital-solutions sales strategist. Write a concise, persuasive 3-4 sentence recommendation explaining why this business is a strong candidate for the recommended services. Start with 'This business is a strong candidate for X, Y, Z because...'. Ground every claim in the provided gaps and services. Return ONLY the paragraph — no headings, no lists, no preamble.",
    messages: [
      {
        role: "user",
        content: `${context}\n\nDetected gaps:\n${gapList}\n\nRecommended services:\n${serviceList}`,
      },
    ],
  });

  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();
}

// Deterministic fallback paragraph built from service names + rationale.
function heuristic(company: string, services: ServiceRecommendation[]): string {
  if (services.length === 0) {
    return `${company} shows no major digital gaps right now, so there is no strong service pitch at this time.`;
  }

  const names = services.map((s) => s.name);
  const nameList =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  const top = services.slice(0, 2).map((s) => s.rationale.toLowerCase());
  const rationale = top.length ? top.join("; and ") : "clear gaps in its digital stack";

  const total = services.reduce((sum, s) => sum + s.estimatedValue, 0);

  return `${company} is a strong candidate for ${nameList} because our scan surfaced ${rationale}. Addressing these gaps would modernize how the business attracts, serves, and retains customers. We estimate a combined engagement value of roughly $${total.toLocaleString()}, prioritizing the highest-impact wins first.`;
}
