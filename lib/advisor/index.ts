// AI Business Advisor — builds a DailyBriefing from real CRM data.
//
// Data is pulled through the existing server actions (which fall back to seed
// data in demo mode). Metrics (revenue, pipeline, hot leads, risks) are always
// computed deterministically. The narrative summary + suggestions +
// growthOpportunities come from Claude when ANTHROPIC_API_KEY is set, and from
// heuristic rules otherwise. This function never throws.

import Anthropic from "@anthropic-ai/sdk";
import { getLeads } from "@/lib/actions/leads";
import { getDeals } from "@/lib/actions/deals";
import { getInvoices } from "@/lib/actions/invoices";
import { getTasks } from "@/lib/actions/tasks";
import { getCustomers } from "@/lib/actions/customers";
import type { DailyBriefing, HotLead } from "./types";

const usd = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

// Each fetch is wrapped so one failing source never breaks the briefing.
async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error("[advisor] data fetch failed:", err);
    return [];
  }
}

export async function generateDailyBriefing(
  dateISO: string,
): Promise<DailyBriefing> {
  const [leads, deals, invoices, tasks, customers] = await Promise.all([
    safe(getLeads),
    safe(getDeals),
    safe(getInvoices),
    safe(getTasks),
    safe(getCustomers),
  ]);

  // ---- Revenue (from invoices) --------------------------------------------
  const sum = <T>(arr: T[], pick: (x: T) => number) =>
    arr.reduce((t, x) => t + (pick(x) || 0), 0);

  const invoiced = sum(invoices, (i) => Number(i.amount));
  const collected = sum(
    invoices.filter((i) => i.status === "paid"),
    (i) => Number(i.amount),
  );
  const pending = sum(
    invoices.filter((i) => i.status === "pending" || i.status === "overdue"),
    (i) => Number(i.amount),
  );

  // ---- Pipeline (from deals) ----------------------------------------------
  const isWon = (stage: string) => /won/i.test(stage);
  const openDeals = deals.filter((d) => !isWon(String(d.stage)));
  const wonDeals = deals.filter((d) => isWon(String(d.stage)));
  const pipeline = {
    open: openDeals.length,
    value: sum(openDeals, (d) => Number(d.value)),
    won: sum(wonDeals, (d) => Number(d.value)),
  };

  // ---- Hot leads (top by score, status hot) -------------------------------
  const hotLeads: HotLead[] = leads
    .filter((l) => String(l.status) === "hot")
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 5)
    .map((l) => ({
      name: String(l.name),
      company: String(l.company),
      score: Number(l.score),
    }));

  // ---- Risks ---------------------------------------------------------------
  const risks: string[] = [];

  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  if (overdueInvoices.length > 0) {
    const total = sum(overdueInvoices, (i) => Number(i.amount));
    risks.push(
      `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""} worth ${usd(total)} outstanding.`,
    );
  }

  const atRisk = customers.filter((c) => String(c.status) === "at-risk");
  if (atRisk.length > 0) {
    risks.push(
      `${atRisk.length} at-risk customer${atRisk.length > 1 ? "s" : ""}: ${atRisk
        .map((c) => String(c.name))
        .join(", ")}.`,
    );
  }

  // Stale high-value deals: still open, sitting a long time in-stage.
  const staleDeals = openDeals.filter(
    (d) => Number(d.value) >= 50000 && Number(d.daysInStage) >= 7,
  );
  if (staleDeals.length > 0) {
    risks.push(
      `${staleDeals.length} high-value deal${staleDeals.length > 1 ? "s" : ""} stalling in-stage: ${staleDeals
        .map((d) => `${String(d.name)} (${usd(Number(d.value))}, ${Number(d.daysInStage)}d)`)
        .join(", ")}.`,
    );
  }

  // Task.due is a freeform label, so treat unfinished high-priority tasks as
  // the actionable/overdue backlog.
  const openTasks = tasks.filter((t) => String(t.status) !== "completed");
  const urgentTasks = openTasks.filter((t) => String(t.priority) === "high");
  if (urgentTasks.length > 0) {
    risks.push(
      `${urgentTasks.length} high-priority task${urgentTasks.length > 1 ? "s" : ""} still open (e.g. ${String(urgentTasks[0].title)}).`,
    );
  }

  // ---- Narrative: AI or heuristic -----------------------------------------
  const metrics = {
    date: dateISO,
    revenue: { invoiced, collected, pending },
    pipeline,
    hotLeadCount: hotLeads.length,
    topHotLeads: hotLeads,
    openTaskCount: openTasks.length,
    overdueInvoiceTotal: sum(overdueInvoices, (i) => Number(i.amount)),
    atRiskCustomers: atRisk.map((c) => String(c.name)),
    staleDealCount: staleDeals.length,
  };

  const ai = await askAi(metrics);

  let summary: string;
  let suggestions: string[];
  let growthOpportunities: string[];
  let usedAi: boolean;

  if (ai) {
    summary = ai.summary;
    suggestions = ai.suggestions;
    growthOpportunities = ai.growthOpportunities;
    usedAi = true;
  } else {
    const h = heuristics(metrics);
    summary = h.summary;
    suggestions = h.suggestions;
    growthOpportunities = h.growthOpportunities;
    usedAi = false;
  }

  return {
    date: dateISO,
    summary,
    revenue: { invoiced, collected, pending },
    pipeline,
    hotLeads,
    risks,
    suggestions,
    growthOpportunities,
    usedAi,
  };
}

type Narrative = {
  summary: string;
  suggestions: string[];
  growthOpportunities: string[];
};

type Metrics = {
  date: string;
  revenue: { invoiced: number; collected: number; pending: number };
  pipeline: { open: number; value: number; won: number };
  hotLeadCount: number;
  topHotLeads: HotLead[];
  openTaskCount: number;
  overdueInvoiceTotal: number;
  atRiskCustomers: string[];
  staleDealCount: number;
};

async function askAi(m: Metrics): Promise<Narrative | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system:
        "You are a sharp CRM business advisor writing a founder's daily briefing. " +
        "Given today's computed metrics, write a concise 2-3 sentence executive `summary`, " +
        "3-5 concrete next-step `suggestions`, and 2-4 `growthOpportunities`. " +
        "Be specific and reference the numbers. Reply ONLY with a JSON object " +
        '{"summary": string, "suggestions": string[], "growthOpportunities": string[]}. No prose.',
      messages: [
        {
          role: "user",
          content: `Today's metrics:\n${JSON.stringify(m, null, 2)}`,
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Partial<Narrative>;
    if (!parsed.summary) return null;
    return {
      summary: parsed.summary,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      growthOpportunities: Array.isArray(parsed.growthOpportunities)
        ? parsed.growthOpportunities
        : [],
    };
  } catch (err) {
    console.error("[advisor] AI briefing failed, using heuristics:", err);
    return null;
  }
}

function heuristics(m: Metrics): Narrative {
  const suggestions: string[] = [];
  const growthOpportunities: string[] = [];

  if (m.hotLeadCount > 0) {
    suggestions.push(
      `Follow up with ${m.hotLeadCount} hot lead${m.hotLeadCount > 1 ? "s" : ""} today${m.topHotLeads[0] ? ` — start with ${m.topHotLeads[0].name} (${m.topHotLeads[0].company})` : ""}.`,
    );
  }
  if (m.overdueInvoiceTotal > 0) {
    suggestions.push(`Chase ${usd(m.overdueInvoiceTotal)} in overdue invoices.`);
  }
  if (m.staleDealCount > 0) {
    suggestions.push(
      `Re-engage ${m.staleDealCount} stalling high-value deal${m.staleDealCount > 1 ? "s" : ""} before they go cold.`,
    );
  }
  if (m.openTaskCount > 0) {
    suggestions.push(`Clear ${m.openTaskCount} open task${m.openTaskCount > 1 ? "s" : ""} from the backlog.`);
  }
  if (suggestions.length === 0) {
    suggestions.push("Pipeline is healthy — prospect for new opportunities.");
  }

  if (m.pipeline.value > 0) {
    growthOpportunities.push(
      `Accelerate ${usd(m.pipeline.value)} of open pipeline across ${m.pipeline.open} deal${m.pipeline.open > 1 ? "s" : ""}.`,
    );
  }
  if (m.atRiskCustomers.length > 0) {
    growthOpportunities.push(
      `Run save/upsell plays on at-risk accounts: ${m.atRiskCustomers.join(", ")}.`,
    );
  }
  if (m.revenue.pending > 0) {
    growthOpportunities.push(
      `Convert ${usd(m.revenue.pending)} of pending invoices into collected cash.`,
    );
  }
  if (growthOpportunities.length === 0) {
    growthOpportunities.push("Invest in new lead generation to refill the funnel.");
  }

  const summary =
    `On ${m.date.slice(0, 10)}: collected ${usd(m.revenue.collected)} of ${usd(m.revenue.invoiced)} invoiced, ` +
    `with ${usd(m.revenue.pending)} still pending. ` +
    `${m.pipeline.open} open deals worth ${usd(m.pipeline.value)} in play and ${usd(m.pipeline.won)} won. ` +
    `${m.hotLeadCount} hot lead${m.hotLeadCount === 1 ? "" : "s"} and ${m.openTaskCount} open task${m.openTaskCount === 1 ? "" : "s"} need attention.`;

  return { summary, suggestions, growthOpportunities };
}
