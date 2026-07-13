// lib/assistant/index.ts
//
// AI Sales Assistant (Phase 6) core. Answers prospect/sales questions about
// pricing, timelines, features, hosting, maintenance/AMC, and can draft a
// proposal summary — grounded in SALES_KB (lib/assistant/knowledge.ts).
//
// - askAssistant(): Claude-powered when ANTHROPIC_API_KEY is set, otherwise a
//   deterministic keyword-matched fallback. NEVER throws.
// - quoteFor(): builds a quick quote from SALES_KB pricing.

import Anthropic from "@anthropic-ai/sdk";
import { SALES_KB, type ServiceKey } from "./knowledge";

export type AssistantContext = {
  company?: string;
  services?: string[];
};

export type AssistantResult = {
  answer: string;
  usedAi: boolean;
};

export type Quote = {
  items: { service: string; price: number }[];
  total: number;
};

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 600;

// ---------------------------------------------------------------------------
// Quote builder
// ---------------------------------------------------------------------------

// Build a quick quote from SALES_KB pricing. Unknown services are skipped.
// Uses each service's `typical` figure.
export function quoteFor(services: string[]): Quote {
  const items: { service: string; price: number }[] = [];

  for (const raw of services ?? []) {
    const key = normalizeService(raw);
    if (!key) continue;
    const point = SALES_KB.pricing.find((p) => p.service === key);
    if (!point) continue;
    items.push({ service: point.label, price: point.typical });
  }

  const total = items.reduce((sum, i) => sum + i.price, 0);
  return { items, total };
}

// Map a loose service string ("SEO", "website", "Custom CRM") to a ServiceKey.
function normalizeService(raw: string): ServiceKey | null {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return null;

  // Direct key match first.
  const direct = SALES_KB.pricing.find((p) => p.service === s.replace(/\s+/g, "_"));
  if (direct) return direct.service;

  const map: [RegExp, ServiceKey][] = [
    [/redesign|web ?site|landing|web dev/, "website_redesign"],
    [/\bcrm\b/, "crm"],
    [/\berp\b/, "erp"],
    [/\bseo\b|search engine/, "seo"],
    [/marketing|ads|paid|ppc|social/, "digital_marketing"],
    [/mobile|\bapp\b|ios|android/, "mobile_app"],
    [/whats ?app/, "whatsapp_automation"],
    [/chat ?bot|\bai bot\b/, "chatbot"],
    [/payment|checkout|gateway/, "online_payment"],
    [/book|schedul|appointment/, "booking_system"],
    [/analytic|tracking|dashboard/, "analytics_setup"],
    [/security|harden|ssl|audit/, "security_hardening"],
  ];
  for (const [re, key] of map) {
    if (re.test(s)) return key;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function askAssistant(
  question: string,
  context?: AssistantContext,
): Promise<AssistantResult> {
  const q = (question ?? "").trim();
  if (!q) {
    return { answer: "Ask me about pricing, timelines, features, hosting, or maintenance and I'll help.", usedAi: false };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const answer = await askClaude(q, context);
      if (answer) return { answer, usedAi: true };
    } catch (err) {
      console.error("[assistant] Claude call failed, falling back:", err);
    }
  }

  return { answer: fallbackAnswer(q, context), usedAi: false };
}

// ---------------------------------------------------------------------------
// Claude-grounded answer
// ---------------------------------------------------------------------------

async function askClaude(question: string, context?: AssistantContext): Promise<string> {
  const anthropic = new Anthropic();

  const system =
    `You are a friendly, concise SALES ASSISTANT for a digital studio. Answer prospect ` +
    `questions about pricing, timelines, features, hosting, and maintenance/AMC using ONLY ` +
    `the knowledge base below as ground truth. Quote ranges in ${SALES_KB.currency}. Keep it ` +
    `short and sales-oriented, use bullets for lists, never invent numbers, and ALWAYS end ` +
    `with a clear next-step call-to-action (e.g. booking a discovery call or requesting a quote). ` +
    `If asked for a proposal, produce a tidy summary with scope, indicative price, timeline, ` +
    `hosting, and AMC.\n\n` +
    `=== KNOWLEDGE BASE (JSON) ===\n${JSON.stringify(SALES_KB)}\n=== END ===`;

  const userContent = context
    ? `Prospect context: ${JSON.stringify(context)}\n\nQuestion: ${question}`
    : question;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  return res.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

// ---------------------------------------------------------------------------
// Deterministic fallback (no AI)
// ---------------------------------------------------------------------------

const CTA = "\n\nWant a tailored quote? Book a quick discovery call and we'll map it to your goals.";

function fallbackAnswer(question: string, context?: AssistantContext): string {
  const q = question.toLowerCase();
  const parts: string[] = [];

  const wantsPricing = /price|pricing|cost|budget|quote|how much|\$/.test(q);
  const wantsTimeline = /timeline|how long|weeks?|when|deliver|duration|fast/.test(q);
  const wantsHosting = /host|server|cloud|deploy|uptime/.test(q);
  const wantsMaint = /maintenance|amc|support|upkeep|warranty|annual/.test(q);
  const wantsProposal = /proposal|summary|scope|overview/.test(q);
  const wantsFeatures = /feature|capabilit|what can you|build|integrat|do you (make|build|offer)/.test(q);

  // If the question references specific services, quote them.
  const mentioned = detectServices(q).concat(
    (context?.services ?? []).map((s) => s),
  );
  const quote = mentioned.length ? quoteFor(mentioned) : null;

  if (wantsProposal) {
    return proposalSummary(mentioned.length ? mentioned : ["website_redesign"], context);
  }

  if (wantsPricing) {
    if (quote && quote.items.length) {
      parts.push("Indicative pricing:");
      for (const i of quote.items) parts.push(`- ${i.service}: from $${i.price.toLocaleString()}`);
      parts.push(`Estimated total: ~$${quote.total.toLocaleString()} (${SALES_KB.currency}).`);
    } else {
      parts.push("Indicative pricing (USD):");
      for (const p of SALES_KB.pricing.slice(0, 6)) {
        const per = p.unit === "monthly" ? "/mo" : "";
        parts.push(`- ${p.label}: $${p.min.toLocaleString()}-$${p.max.toLocaleString()}${per}`);
      }
    }
  }

  if (wantsTimeline) {
    parts.push("Typical timelines:");
    const list = quote && quote.items.length ? detectServices(q) : ["website_redesign", "crm", "erp"];
    const keys = list.length ? list : ["website_redesign", "crm", "erp"];
    for (const raw of keys) {
      const t = SALES_KB.timelines.find((x) => x.service === raw);
      if (t) parts.push(`- ${t.label}: ${t.minWeeks}-${t.maxWeeks} weeks`);
    }
  }

  if (wantsHosting) {
    parts.push("Hosting options:");
    for (const h of SALES_KB.hosting) {
      const price = h.monthly > 0 ? `$${h.monthly}/mo` : "billed to your cloud account";
      parts.push(`- ${h.label} (${price}): ${h.bestFor}`);
    }
  }

  if (wantsMaint) {
    parts.push("Maintenance / AMC tiers:");
    for (const m of SALES_KB.maintenance) {
      parts.push(`- ${m.label}: ${m.annualPctOfProject}% of project/yr (from $${m.monthlyFrom}/mo), ${m.responseSla} response`);
    }
  }

  if (wantsFeatures) {
    parts.push("We build: " + SALES_KB.pricing.map((p) => p.label).join(", ") + ".");
  }

  // Nothing matched — try FAQ, else a general overview.
  if (parts.length === 0) {
    const faq = SALES_KB.faqs.find((f) => f.tags.some((t) => q.includes(t)));
    if (faq) {
      parts.push(faq.a);
    } else {
      parts.push(SALES_KB.companyBlurb);
      parts.push("I can help with pricing, timelines, features, hosting, and maintenance/AMC.");
    }
  }

  return parts.join("\n") + CTA;
}

// Detect which service keys a free-text question refers to.
function detectServices(text: string): string[] {
  const found: string[] = [];
  for (const p of SALES_KB.pricing) {
    const key = normalizeService(p.label) ?? p.service;
    if (normalizeService(text) === p.service) found.push(p.service);
    // also scan for the label words
    const words = p.label.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => text.includes(w))) found.push(key);
  }
  return Array.from(new Set(found));
}

// Build a lightweight proposal summary from services + KB.
function proposalSummary(services: string[], context?: AssistantContext): string {
  const quote = quoteFor(services);
  const lines: string[] = [];
  const who = context?.company ? ` for ${context.company}` : "";
  lines.push(`Proposal Summary${who}`);
  lines.push("");
  lines.push("Scope & indicative pricing:");

  let maxWeeks = 0;
  for (const raw of services) {
    const key = SALES_KB.pricing.find((p) => p.label === raw || p.service === raw)?.service;
    const point = SALES_KB.pricing.find((p) => p.service === (key ?? normalizeServiceSafe(raw)));
    if (!point) continue;
    lines.push(`- ${point.label}: from $${point.typical.toLocaleString()}`);
    const t = SALES_KB.timelines.find((x) => x.service === point.service);
    if (t) maxWeeks = Math.max(maxWeeks, t.maxWeeks);
  }

  lines.push("");
  lines.push(`Estimated investment: ~$${quote.total.toLocaleString()} (${SALES_KB.currency}).`);
  if (maxWeeks) lines.push(`Estimated timeline: up to ${maxWeeks} weeks.`);

  const host = SALES_KB.hosting[0];
  lines.push(`Hosting: ${host.label} from $${host.monthly}/mo.`);
  const amc = SALES_KB.maintenance[1] ?? SALES_KB.maintenance[0];
  lines.push(`Maintenance: ${amc.label} (${amc.annualPctOfProject}% of project/yr).`);

  return lines.join("\n") + CTA;
}

function normalizeServiceSafe(raw: string): ServiceKey {
  return normalizeService(raw) ?? "website_redesign";
}
