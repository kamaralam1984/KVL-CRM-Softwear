// Executive Dashboard — pure compute helpers (Phase 10).
//
// Every function here is deterministic and side-effect free (no I/O, no clock),
// so they are trivially unit-testable. Inputs use minimal structural shapes so
// the helpers stay decoupled from the concrete server-action row types.

export interface LeadLike {
  stage?: string;
  status?: string;
  value?: number;
}

export interface DealLike {
  value?: number;
  probability?: number;
  stage?: string;
}

export interface InvoiceLike {
  amount?: number;
  status?: string;
}

export interface SalesPoint {
  month?: string;
  revenue?: number;
  leads?: number;
  deals?: number;
}

/** Round to `dp` decimal places, coercing non-finite values to 0. */
function round(n: number, dp = 0): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

const isWon = (stage?: string): boolean => /closed\s*won/i.test(stage ?? "");
const isClosed = (stage?: string): boolean => /closed/i.test(stage ?? "");

/**
 * Lead → deal conversion as a 0–100 percentage. Uses closed-won deals as the
 * numerator when present, otherwise falls back to total deal count. Clamped.
 */
export function conversionRate(leads: LeadLike[], deals: DealLike[]): number {
  const denom = leads.length;
  if (denom <= 0) return 0;
  const won = deals.filter((d) => isWon(d.stage)).length;
  const converted = won > 0 ? won : deals.length;
  const rate = (converted / denom) * 100;
  return round(Math.max(0, Math.min(100, rate)), 1);
}

/**
 * Simple linear-trend (least-squares) projection over monthly revenue.
 * Returns the next single month and the next three months combined.
 */
export function forecastRevenue(
  salesChartData: SalesPoint[],
): { nextMonth: number; nextQuarter: number } {
  const ys = salesChartData
    .map((d) => Number(d.revenue))
    .filter((v) => Number.isFinite(v));
  const n = ys.length;

  if (n === 0) return { nextMonth: 0, nextQuarter: 0 };
  if (n === 1) {
    const only = Math.max(0, ys[0]);
    return { nextMonth: round(only), nextQuarter: round(only * 3) };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let x = 0; x < n; x++) {
    sumX += x;
    sumY += ys[x];
    sumXY += x * ys[x];
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const predict = (x: number) => Math.max(0, intercept + slope * x);

  const nextMonth = predict(n);
  const nextQuarter = predict(n) + predict(n + 1) + predict(n + 2);
  return { nextMonth: round(nextMonth), nextQuarter: round(nextQuarter) };
}

/**
 * Cashflow derived from invoices: inflow = paid, outflow = overdue (cash at
 * risk / not collected), net = inflow − outflow.
 */
export function cashflowFromInvoices(
  invoices: InvoiceLike[],
): { inflow: number; outflow: number; net: number } {
  let inflow = 0;
  let outflow = 0;
  for (const inv of invoices) {
    const amount = Number(inv.amount) || 0;
    const status = (inv.status ?? "").toLowerCase();
    if (status === "paid") inflow += amount;
    else if (status === "overdue") outflow += amount;
  }
  return { inflow: round(inflow), outflow: round(outflow), net: round(inflow - outflow) };
}

/** Month-over-month revenue growth (%) from the last two data points. */
export function growthRate(salesChartData: SalesPoint[]): number {
  const ys = salesChartData
    .map((d) => Number(d.revenue))
    .filter((v) => Number.isFinite(v));
  const n = ys.length;
  if (n < 2) return 0;
  const prev = ys[n - 2];
  const curr = ys[n - 1];
  if (prev === 0) return 0;
  return round(((curr - prev) / prev) * 100, 1);
}

/** Weighted open-pipeline value: Σ (deal value × probability%) over non-closed deals. */
export function pipelineValue(deals: DealLike[]): number {
  let total = 0;
  for (const d of deals) {
    if (isClosed(d.stage)) continue;
    const value = Number(d.value) || 0;
    const prob = Number(d.probability);
    const weight = Number.isFinite(prob) ? Math.max(0, Math.min(100, prob)) / 100 : 1;
    total += value * weight;
  }
  return round(total);
}
