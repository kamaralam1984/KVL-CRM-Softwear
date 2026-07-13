// Executive Dashboard — metric contract (Phase 10).
//
// A single, serializable snapshot of company health that the Dashboard section
// (or any page / the /api/executive/metrics route) can consume directly.

export interface ExecutiveMetrics {
  /** Leads first contacted today (heuristic on lastContact). */
  todaysLeads: number;
  /** Tasks/meetings due today. */
  meetingsToday: number;
  revenue: {
    /** Total value of all invoices issued. */
    invoiced: number;
    /** Value of invoices actually paid. */
    collected: number;
  };
  /** Weighted value of the open deal pipeline. */
  pipelineValue: number;
  /** Lead → deal conversion, as a 0–100 percentage. */
  conversionRate: number;
  /** Month-over-month revenue growth, as a percentage (may be negative). */
  growthPct: number;
  forecast: {
    /** Projected revenue for the next single month. */
    nextMonth: number;
    /** Projected revenue for the next three months combined. */
    nextQuarter: number;
  };
  cashflow: {
    /** Cash collected (paid invoices). */
    inflow: number;
    /** Cash at risk / going out (overdue invoices). */
    outflow: number;
    /** inflow − outflow. */
    net: number;
  };
  /** Heuristic, human-readable next-best-actions. */
  recommendations: string[];
}
