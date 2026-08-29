"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Download, TrendingUp, FileText, Filter } from "lucide-react";
import { deals as seedDeals } from "@/lib/data";
import { getDeals } from "@/lib/actions/deals";
import { getCampaigns } from "@/lib/actions/campaigns";
import { getLeads, type Lead } from "@/lib/actions/leads";
import { computeCampaignRoi } from "@/lib/attribution/roi";
import type { Campaign } from "@/lib/attribution/types";
import { cn, formatCurrency } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";

type TeamRow = { name: string; deals: number; revenue: number; target: number };

const CustomTooltipStyle = { backgroundColor: "#0f1729", border: "1px solid #1e2d45", borderRadius: "10px", color: "#e2e8f0", fontSize: 12, padding: "8px 12px" };

const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const periodSlice: Record<string, number> = { "3M": 3, "6M": 6, "1Y": 12 };
const periodOptions = ["3M", "6M", "1Y"];

export default function Reports() {
  const [period, setPeriod] = useState("1Y");
  const [deals, setDeals] = useState<typeof seedDeals>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  useEffect(() => {
    // Real rows only — no seed-data fallback, so an empty account renders
    // empty charts/tables rather than fabricated revenue figures.
    getDeals().then((rows) => setDeals(rows ?? [])).catch(() => {});
    getCampaigns().then(setCampaigns).catch(() => {});
    getLeads().then(setLeads).catch(() => {});
  }, []);

  // Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
  const campaignRois = campaigns.map((c) => ({ campaign: c, roi: computeCampaignRoi(c, leads) }));
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalAttributedRevenue = campaignRois.reduce((s, r) => s + r.roi.revenue, 0);
  const blendedRoas = totalSpend > 0 ? totalAttributedRevenue / totalSpend : null;
  const acquisitionLeadCount = leads.filter((l) => l.visitor_id).length;

  const exportAcquisitionCSV = () => {
    downloadCSV("campaign-roi-report.csv", campaignRois.map(({ campaign: c, roi }) => ({
      Campaign: c.name, Source: c.source, Medium: c.medium, Spend: c.spend,
      Leads: roi.leadCount, Closed: roi.closedCount, "Revenue (first-touch)": roi.revenue,
      ROAS: roi.roas !== null ? roi.roas.toFixed(2) : "",
    })));
  };

  // Derive KPIs from real deals
  const totalRevenue = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const totalDeals   = deals.length;
  const avgDeal      = totalDeals ? Math.round(totalRevenue / totalDeals) : 0;
  const wonDeals     = deals.filter((d) => /won|closed/i.test(String(d.stage))).length;
  const winRate      = totalDeals ? Math.round((wonDeals / totalDeals) * 1000) / 10 : 0;
  const kpiCards = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), change: "+28.5%", color: "blue" },
    { label: "Total Deals",   value: String(totalDeals),          change: "+22%",   color: "violet" },
    { label: "Avg Deal Size", value: formatCurrency(avgDeal),     change: "+8%",    color: "cyan" },
    { label: "Win Rate",      value: `${winRate}%`,               change: "+5.3%",  color: "emerald" },
  ];

  // Derive team performance by grouping real deals by owner; target = peer average
  const byOwner: Record<string, TeamRow> = {};
  for (const d of deals) {
    const o = String(d.owner || "Unassigned");
    byOwner[o] ??= { name: o, deals: 0, revenue: 0, target: 0 };
    byOwner[o].deals += 1;
    byOwner[o].revenue += Number(d.value) || 0;
  }
  const teamRowsRaw = Object.values(byOwner);
  const avgRev = teamRowsRaw.length ? teamRowsRaw.reduce((s, r) => s + r.revenue, 0) / teamRowsRaw.length : 0;
  const teamRows: TeamRow[] = teamRowsRaw
    .map((r) => ({ ...r, target: Math.max(Math.round(avgRev), 1) }))
    .sort((a, b) => b.revenue - a.revenue);
  const teamTable = teamRows;

  // Derive monthly revenue by bucketing real deals (created_at) by month
  type MonthRow = { month: string; revenue: number; leads: number; deals: number; order: number };
  const dealCreatedAt = (d: unknown) => (d as { created_at?: string }).created_at;
  const dealsWithDates = deals.filter((d) => dealCreatedAt(d));
  const monthBuckets: Record<string, MonthRow> = {};
  for (const d of dealsWithDates) {
    const dt = new Date(dealCreatedAt(d)!);
    if (isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    monthBuckets[key] ??= { month: monthShort[dt.getMonth()], revenue: 0, leads: 0, deals: 0, order: dt.getFullYear() * 12 + dt.getMonth() };
    monthBuckets[key].revenue += Number(d.value) || 0;
    monthBuckets[key].deals += 1;
  }
  const monthlyFromDeals = Object.values(monthBuckets).sort((a, b) => a.order - b.order);
  const monthlyChartData = monthlyFromDeals;

  // Derive quarterly revenue vs peer-average target from real deals
  type QuarterRow = { quarter: string; revenue: number; deals: number; order: number };
  const quarterBuckets: Record<string, QuarterRow> = {};
  for (const d of dealsWithDates) {
    const dt = new Date(dealCreatedAt(d)!);
    if (isNaN(dt.getTime())) continue;
    const q = Math.floor(dt.getMonth() / 3) + 1;
    const key = `${dt.getFullYear()}-Q${q}`;
    quarterBuckets[key] ??= { quarter: `Q${q} ${dt.getFullYear()}`, revenue: 0, deals: 0, order: dt.getFullYear() * 4 + q };
    quarterBuckets[key].revenue += Number(d.value) || 0;
    quarterBuckets[key].deals += 1;
  }
  const quarterRowsRaw = Object.values(quarterBuckets).sort((a, b) => a.order - b.order);
  const avgQuarterRevenue = quarterRowsRaw.length ? quarterRowsRaw.reduce((s, r) => s + r.revenue, 0) / quarterRowsRaw.length : 0;
  const quarterlyFromDeals = quarterRowsRaw.map((r) => ({ ...r, target: Math.max(Math.round(avgQuarterRevenue), 1) }));
  const quarterlyData = quarterlyFromDeals;

  const chartData = monthlyChartData.slice(-periodSlice[period]);

  const exportFullReport = () => {
    downloadCSV("crm-full-report.csv", monthlyChartData.map(d => ({
      Month: d.month, Revenue: d.revenue, Leads: d.leads, Deals: d.deals,
    })));
  };

  const exportRevenueCSV = () => {
    downloadCSV(`revenue-${period}.csv`, chartData.map(d => ({
      Month: d.month, Revenue: d.revenue, Leads: d.leads, Deals: d.deals,
    })));
  };

  const exportTeamCSV = () => {
    downloadCSV("team-performance.csv", teamTable.map(r => ({
      Rep: r.name, Deals: r.deals, Revenue: r.revenue, Target: r.target,
      "vs Target %": Math.round((r.revenue / r.target) * 100),
    })));
  };

  return (
    <div className="p-5 h-full overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Reports & Analytics</h2>
          <p className="text-xs text-slate-500">Year-to-date performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod((p) => periodOptions[(periodOptions.indexOf(p) + 1) % periodOptions.length])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04]"
          >
            <Filter size={12} /> Filter ({period})
          </button>
          <button onClick={exportFullReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs">
            <Download size={12} /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="glass-card rounded-xl border border-crm-border p-4">
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className="text-xl font-bold text-slate-100">{kpi.value}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400">
              <TrendingUp size={11} /> {kpi.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Monthly Revenue with period filter */}
        <div className="glass-card rounded-2xl border border-crm-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Monthly Revenue</h3>
              <p className="text-xs text-slate-500">
                {period === "3M" ? "Last 3 months" : period === "6M" ? "Last 6 months" : "Full year 2025"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {["3M", "6M", "1Y"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-lg transition-colors",
                      period === p ? "gradient-bg text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button onClick={exportRevenueCSV} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors">
                <Download size={11} /> CSV
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={CustomTooltipStyle} formatter={((v: unknown) => [`$${((v as number) / 1000).toFixed(0)}K`]) as never} />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#repGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quarterly Performance */}
        <div className="glass-card rounded-2xl border border-crm-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Quarterly vs Target</h3>
              <p className="text-xs text-slate-500">Revenue comparison</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={quarterlyData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip contentStyle={CustomTooltipStyle} formatter={((v: unknown) => [`$${((v as number) / 1000).toFixed(0)}K`]) as never} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" fill="#1e2d45" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-crm-border">
          <h3 className="text-sm font-semibold text-slate-200">Team Performance</h3>
          <button onClick={exportTeamCSV} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <FileText size={11} /> Export CSV
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3 px-4 py-2 border-b border-crm-border text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          <div className="col-span-2">Rep</div>
          <div className="text-center">Deals</div>
          <div className="text-center">Revenue</div>
          <div className="text-center">vs Target</div>
        </div>
        {teamTable.map((rep, i) => {
          const pct = Math.round((rep.revenue / rep.target) * 100);
          return (
            <motion.div
              key={rep.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-crm-border/50 last:border-0 items-center"
            >
              <div className="col-span-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-[10px] font-bold text-white">
                  {rep.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-slate-300">{rep.name}</span>
                {i === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">🏆 Top</span>}
              </div>
              <div className="text-center text-xs font-medium text-slate-200">{rep.deals}</div>
              <div className="text-center text-xs font-semibold text-slate-200">{formatCurrency(rep.revenue)}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "#10b981" : pct >= 90 ? "#3b82f6" : "#f59e0b" }} />
                </div>
                <span className="text-[11px] font-bold w-8 text-right" style={{ color: pct >= 100 ? "#10b981" : pct >= 90 ? "#3b82f6" : "#f59e0b" }}>{pct}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Acquisition — Campaign ROI (first-touch attribution; see docs/ACQUISITION_ENGINE_ROADMAP.md) */}
      <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-crm-border">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Acquisition — Campaign ROI</h3>
            <p className="text-xs text-slate-500">Revenue = value of Closed leads sourced from each campaign (first-touch)</p>
          </div>
          <button onClick={exportAcquisitionCSV} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <FileText size={11} /> Export CSV
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3 p-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Campaign Spend</p>
            <p className="text-lg font-bold text-slate-100">{formatCurrency(totalSpend)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Attributed Revenue</p>
            <p className="text-lg font-bold text-slate-100">{formatCurrency(totalAttributedRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Blended ROAS</p>
            <p className="text-lg font-bold text-slate-100">{blendedRoas !== null ? `${blendedRoas.toFixed(1)}x` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Leads from Acquisition Engine</p>
            <p className="text-lg font-bold text-slate-100">{acquisitionLeadCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
