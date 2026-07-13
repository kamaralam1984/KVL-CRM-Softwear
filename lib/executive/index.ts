// Executive Dashboard — metrics engine (Phase 10).
//
// getExecutiveMetrics() gathers live CRM data via the existing server actions
// (which transparently fall back to seed data in demo mode) and computes a
// single ExecutiveMetrics snapshot. It NEVER throws — every data source is
// isolated so one failure degrades to an empty array, and computation is
// defensive. Any page / the /api/executive/metrics route can consume it.

import { getLeads } from "@/lib/actions/leads";
import { getDeals } from "@/lib/actions/deals";
import { getInvoices } from "@/lib/actions/invoices";
import { getTasks } from "@/lib/actions/tasks";
import { salesChartData } from "@/lib/data";

import type { ExecutiveMetrics } from "./types";
import {
  conversionRate,
  forecastRevenue,
  cashflowFromInvoices,
  growthRate,
  pipelineValue,
  type LeadLike,
  type DealLike,
  type InvoiceLike,
} from "./metrics";

/** Run an async loader, degrading any failure to an empty array. */
async function safe<T>(load: () => Promise<T[]>, label: string): Promise<T[]> {
  try {
    return await load();
  } catch (err) {
    console.error(`[executive] failed to load ${label}:`, err);
    return [];
  }
}

/** True when a free-text recency string ("2h ago", "Today 3:00 PM") reads as today. */
function isToday(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const t = text.toLowerCase().trim();
  if (t.includes("today")) return true;
  // "2h ago", "45m ago", "just now" → within the current day.
  if (/^just\s*now/.test(t)) return true;
  return /^\d+\s*[hm]\b.*ago/.test(t);
}

export async function getExecutiveMetrics(): Promise<ExecutiveMetrics> {
  const [leads, deals, invoices, tasks] = await Promise.all([
    safe(getLeads, "leads"),
    safe(getDeals, "deals"),
    safe(getInvoices, "invoices"),
    safe(getTasks, "tasks"),
  ]);

  try {
    const leadRows = leads as LeadLike[];
    const dealRows = deals as DealLike[];
    const invoiceRows = invoices as InvoiceLike[];

    // "Today" activity.
    const todaysLeads = leads.filter(
      (l) => isToday((l as { lastContact?: unknown }).lastContact),
    ).length;
    const meetingsToday = tasks.filter((t) => {
      const status = String((t as { status?: unknown }).status ?? "").toLowerCase();
      return status !== "completed" && isToday((t as { due?: unknown }).due);
    }).length;

    // Revenue from invoices.
    const invoiced = invoiceRows.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const collected = invoiceRows
      .filter((i) => (i.status ?? "").toLowerCase() === "paid")
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const pipeline = pipelineValue(dealRows);
    const conversion = conversionRate(leadRows, dealRows);
    const growthPct = growthRate(salesChartData);
    const forecast = forecastRevenue(salesChartData);
    const cashflow = cashflowFromInvoices(invoiceRows);

    const recommendations = buildRecommendations({
      pipeline,
      invoiced,
      collected,
      conversion,
      growthPct,
      cashflow,
      todaysLeads,
    });

    return {
      todaysLeads,
      meetingsToday,
      revenue: { invoiced: Math.round(invoiced), collected: Math.round(collected) },
      pipelineValue: pipeline,
      conversionRate: conversion,
      growthPct,
      forecast,
      cashflow,
      recommendations,
    };
  } catch (err) {
    console.error("[executive] metric computation failed:", err);
    return emptyMetrics();
  }
}

function buildRecommendations(m: {
  pipeline: number;
  invoiced: number;
  collected: number;
  conversion: number;
  growthPct: number;
  cashflow: { inflow: number; outflow: number; net: number };
  todaysLeads: number;
}): string[] {
  const recs: string[] = [];

  if (m.invoiced > 0 && m.pipeline < m.invoiced) {
    recs.push("Pipeline coverage low relative to invoiced revenue — increase prospecting.");
  }
  recs.push(
    m.cashflow.net >= 0
      ? "Cashflow positive — reinvest into growth channels."
      : "Cashflow negative — prioritize collections on overdue invoices.",
  );
  if (m.collected < m.invoiced) {
    recs.push("Outstanding receivables — follow up on unpaid invoices to close the gap.");
  }
  if (m.conversion < 20) {
    recs.push("Low lead-to-deal conversion — tighten qualification criteria.");
  } else if (m.conversion >= 50) {
    recs.push("Strong conversion rate — scale top-of-funnel lead generation.");
  }
  recs.push(
    m.growthPct < 0
      ? "Revenue declining month-over-month — review at-risk accounts."
      : "Revenue trending up — maintain momentum on active deals.",
  );
  if (m.todaysLeads === 0) {
    recs.push("No new leads today — run outreach to keep the pipeline warm.");
  }

  return recs;
}

function emptyMetrics(): ExecutiveMetrics {
  return {
    todaysLeads: 0,
    meetingsToday: 0,
    revenue: { invoiced: 0, collected: 0 },
    pipelineValue: 0,
    conversionRate: 0,
    growthPct: 0,
    forecast: { nextMonth: 0, nextQuarter: 0 },
    cashflow: { inflow: 0, outflow: 0, net: 0 },
    recommendations: [],
  };
}
