// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 5 (Automation + AI Integration)
// Builds a real, current CRM snapshot for the AI Assistant's system prompt.
// Replaces a previously-hardcoded fake data block in app/api/ai/chat/route.ts —
// spec: "AI must use real CRM/database data. Never invent analytics." Every
// source is isolated so one failure degrades gracefully, never throws.

import { getExecutiveMetrics } from "@/lib/executive";
import { getLeads } from "@/lib/actions/leads";
import { getDeals } from "@/lib/actions/deals";
import { getCustomers } from "@/lib/actions/customers";
import { getTeamMembers } from "@/lib/actions/team";
import { getVisitors } from "@/lib/actions/visitors";
import { getCampaigns } from "@/lib/actions/campaigns";

async function safe<T>(load: () => Promise<T[]>, label: string): Promise<T[]> {
  try {
    return await load();
  } catch (err) {
    console.error(`[ai] failed to load ${label}:`, err);
    return [];
  }
}

export async function buildCrmSnapshot(): Promise<string> {
  try {
    const [metrics, leads, deals, customers, team, visitors, campaigns] = await Promise.all([
      getExecutiveMetrics().catch((err) => {
        console.error("[ai] failed to load executive metrics:", err);
        return null;
      }),
      safe(getLeads, "leads"),
      safe(getDeals, "deals"),
      safe(getCustomers, "customers"),
      safe(getTeamMembers, "team"),
      safe(getVisitors, "visitors"),
      safe(getCampaigns, "campaigns"),
    ]);

    const lines: string[] = [`Live CRM snapshot (as of ${new Date().toISOString()}):`];

    if (metrics) {
      lines.push(
        `- Pipeline: $${metrics.pipelineValue.toLocaleString()} · Conversion: ${metrics.conversionRate}% · MoM growth: ${metrics.growthPct}%`
      );
      lines.push(
        `- Revenue: $${metrics.revenue.collected.toLocaleString()} collected of $${metrics.revenue.invoiced.toLocaleString()} invoiced · Forecast next month: $${metrics.forecast.nextMonth.toLocaleString()}`
      );
      lines.push(
        `- Cashflow: net $${metrics.cashflow.net.toLocaleString()} (in $${metrics.cashflow.inflow.toLocaleString()} / out $${metrics.cashflow.outflow.toLocaleString()})`
      );
    }

    const hotLeads = [...leads].sort((a, b) => b.score - a.score).slice(0, 5);
    if (hotLeads.length) {
      lines.push("- Hottest leads:");
      for (const l of hotLeads) {
        const src = l.source ? ` [${l.source}${l.campaign ? "/" + l.campaign : ""}]` : "";
        lines.push(`  • ${l.name} (${l.company || "—"}) — score ${l.score}, $${l.value.toLocaleString()}, ${l.stage}${src}`);
      }
    }

    const openDeals = deals.filter((d) => !/closed/i.test(d.stage));
    if (openDeals.length) {
      const total = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      lines.push(`- Open deals: ${openDeals.length}, total $${total.toLocaleString()}`);
    }

    const atRisk = customers.filter((c) => c.status === "at-risk" || c.health < 65);
    if (atRisk.length) {
      lines.push(`- At-risk customers: ${atRisk.map((c) => `${c.name} (health ${c.health}%)`).join(", ")}`);
    }

    if (team.length) {
      const top = [...team].sort((a, b) => b.performance - a.performance)[0];
      lines.push(`- Top performer: ${top.name} (${top.performance}% of target)`);
    }

    // Acquisition Engine — the actual point of this snapshot rebuild.
    const identified = visitors.filter((v) => v.identified).length;
    const hotVisitors = visitors.filter((v) => v.intent_band === "hot" || v.intent_band === "very_hot");
    lines.push(
      `- Acquisition: ${visitors.length} tracked visitors, ${identified} identified, ${hotVisitors.length} currently hot/very-hot anonymous visitors`
    );
    if (hotVisitors.length) {
      const top = [...hotVisitors].sort((a, b) => b.intent_score - a.intent_score).slice(0, 3);
      lines.push("- Top anonymous intent signals:");
      for (const v of top) {
        lines.push(`  • ${v.visitor_id} — score ${v.intent_score} (${v.intent_band}), source ${v.first_touch_source || "direct"}`);
      }
    }
    if (campaigns.length) {
      const active = campaigns.filter((c) => c.status === "active");
      const spend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      lines.push(`- Campaigns: ${campaigns.length} tracked (${active.length} active), total spend $${spend.toLocaleString()}`);
    }

    return lines.join("\n");
  } catch (err) {
    console.error("[ai] buildCrmSnapshot failed:", err);
    return "Live CRM snapshot unavailable right now — answer using general best practices and say the snapshot couldn't be loaded.";
  }
}
