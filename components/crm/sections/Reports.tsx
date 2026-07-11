"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Download, TrendingUp, FileText, Filter } from "lucide-react";
import { salesChartData, teamPerformanceData } from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";

const CustomTooltipStyle = { backgroundColor: "#0f1729", border: "1px solid #1e2d45", borderRadius: "10px", color: "#e2e8f0", fontSize: 12, padding: "8px 12px" };

const quarterlyData = [
  { quarter: "Q1 2025", revenue: 245000, target: 230000, deals: 48 },
  { quarter: "Q2 2025", revenue: 312000, target: 280000, deals: 63 },
  { quarter: "Q3 2025", revenue: 387000, target: 350000, deals: 78 },
  { quarter: "Q4 2025", revenue: 467000, target: 420000, deals: 94 },
];

const periodSlice: Record<string, number> = { "3M": 3, "6M": 6, "1Y": 12 };

export default function Reports() {
  const [period, setPeriod] = useState("1Y");

  const chartData = salesChartData.slice(-periodSlice[period]);

  const exportFullReport = () => {
    downloadCSV("crm-full-report.csv", salesChartData.map(d => ({
      Month: d.month, Revenue: d.revenue, Leads: d.leads, Deals: d.deals,
    })));
  };

  const exportRevenueCSV = () => {
    downloadCSV(`revenue-${period}.csv`, chartData.map(d => ({
      Month: d.month, Revenue: d.revenue, Leads: d.leads, Deals: d.deals,
    })));
  };

  const exportTeamCSV = () => {
    downloadCSV("team-performance.csv", teamPerformanceData.map(r => ({
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
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04]">
            <Filter size={12} /> Filter
          </button>
          <button onClick={exportFullReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs">
            <Download size={12} /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: "$1.41M", change: "+28.5%", color: "blue" },
          { label: "Total Deals", value: "283", change: "+22%", color: "violet" },
          { label: "Avg Deal Size", value: "$4,982", change: "+8%", color: "cyan" },
          { label: "Win Rate", value: "68.5%", change: "+5.3%", color: "emerald" },
        ].map((kpi) => (
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
        {teamPerformanceData.map((rep, i) => {
          const pct = Math.round((rep.revenue / rep.target) * 100);
          return (
            <motion.div
              key={rep.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-crm-border/50 last:border-0 table-row items-center"
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
    </div>
  );
}
