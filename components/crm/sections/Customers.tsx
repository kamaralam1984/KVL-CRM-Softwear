"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Phone, Mail, Shield,
  Users, MapPin, AlertTriangle, Star, RefreshCw,
  CheckCircle, Clock, TrendingUp, TrendingDown, Send,
  Calendar, DollarSign, Activity, Zap, ChevronRight,
  Flag, Award, ThumbsUp, ThumbsDown, Minus, Edit2, Trash2,
} from "lucide-react";
import { customers as initialCustomers } from "@/lib/data";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/lib/actions/customers";
import { createTask } from "@/lib/actions/tasks";
import { getNpsResponses, submitNpsResponse, type NpsResponse } from "@/lib/actions/nps";
import { cn, formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/modal";

// ─── helpers ──────────────────────────────────────────────────────────────────
const healthColor = (h: number) =>
  h >= 90 ? "#10b981" : h >= 70 ? "#3b82f6" : h >= 55 ? "#f59e0b" : "#f43f5e";

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  active:   { bg: "bg-emerald-500/10", text: "text-emerald-400",  border: "border-emerald-500/20" },
  "at-risk":{ bg: "bg-rose-500/10",    text: "text-rose-400",     border: "border-rose-500/20"    },
  champion: { bg: "bg-violet-500/10",  text: "text-violet-400",   border: "border-violet-500/20"  },
};
const segmentColors: Record<string, string> = {
  Enterprise: "text-blue-400",
  SMB:        "text-cyan-400",
  Startup:    "text-amber-400",
  Agency:     "text-violet-400",
};

const inputCls  = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type CustForm = { name: string; contact: string; email: string; phone: string; value: string; segment: string; status: string };
const emptyForm: CustForm = { name: "", contact: "", email: "", phone: "", value: "", segment: "SMB", status: "active" };

// ─── mock data for new tabs ────────────────────────────────────────────────────
const journeyStages = [
  { stage: "Lead",       icon: Flag,         date: "Jan 15, 2024", duration: "8 days",  actions: ["Demo scheduled","Proposal sent","Budget qualified"] },
  { stage: "Trial",      icon: Zap,          date: "Jan 23, 2024", duration: "14 days", actions: ["Trial activated","Onboarding call","Feature walkthrough"] },
  { stage: "Onboarding", icon: MapPin,        date: "Feb 6, 2024",  duration: "21 days", actions: ["Data migration","Team training","Integrations setup"] },
  { stage: "Active",     icon: CheckCircle,   date: "Feb 27, 2024", duration: "90 days", actions: ["QBR completed","Upsell pitched","Health 92%"] },
  { stage: "Champion",   icon: Award,         date: "May 28, 2024", duration: "Ongoing", actions: ["Case study signed","Referral submitted","NPS 10"] },
];

// ─── date helpers (renewals) ────────────────────────────────────────────────────
// Real `nextRenewal` values are freeform labels like "Dec 2025" (see lib/data.ts /
// lib/supabase/schema.sql `next_renewal`), not ISO dates. Parse that one known
// format deterministically to end-of-month; anything else is left unparsed rather
// than guessing.
const MONTH_ABBRS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
function parseRenewalLabel(label?: string): Date | null {
  if (!label) return null;
  const m = label.trim().match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
  if (!m) return null;
  const idx = MONTH_ABBRS.indexOf(m[1].toLowerCase().slice(0, 3));
  if (idx === -1) return null;
  const year = parseInt(m[2], 10);
  // last day of that month
  return new Date(year, idx + 1, 0);
}
const daysUntil = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86400000);

// ─── sub-components ────────────────────────────────────────────────────────────

function CustomerJourneyTab({ customers }: { customers: typeof initialCustomers }) {
  const [selectedId, setSelectedId] = useState<number>(customers[0]?.id ?? 0);
  const selected = customers.find((c) => c.id === selectedId) ?? customers[0];

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Customer list sidebar */}
      <div className="col-span-1 space-y-2 overflow-y-auto pr-1">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-3">Select Customer</p>
        {customers.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
              selectedId === c.id
                ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]"
                : "border-crm-border bg-white/[0.02] hover:border-blue-500/30"
            )}
          >
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {c.avatar}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{c.name}</p>
              <p className={cn("text-[10px]", statusStyles[c.status]?.text)}>{c.status}</p>
            </div>
            {selectedId === c.id && <ChevronRight size={12} className="ml-auto text-[#D4AF37] flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* Journey timeline */}
      <div className="col-span-2 overflow-y-auto">
        {selected && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-sm font-bold text-white">
                {selected.avatar}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">{selected.name}</p>
                <p className="text-xs text-slate-500">Customer since {selected.since}</p>
              </div>
            </div>

            {/* Horizontal stage pills */}
            <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
              {journeyStages.map((s, i) => (
                <div key={s.stage} className="flex items-center flex-shrink-0">
                  <div className={cn(
                    "flex flex-col items-center gap-1",
                    i < 4 ? "opacity-100" : selected.status === "champion" ? "opacity-100" : "opacity-30"
                  )}>
                    <div className={cn(
                      "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all",
                      i <= 3 || selected.status === "champion"
                        ? "border-[#00A86B] bg-[#00A86B]/20"
                        : "border-slate-700 bg-slate-800/40"
                    )}>
                      <s.icon size={14} className={i <= 3 || selected.status === "champion" ? "text-[#00A86B]" : "text-slate-600"} />
                    </div>
                    <p className="text-[9px] text-slate-400 whitespace-nowrap">{s.stage}</p>
                  </div>
                  {i < journeyStages.length - 1 && (
                    <div className={cn(
                      "h-0.5 w-10 mx-1 rounded-full transition-all",
                      i < 3 ? "bg-[#00A86B]" : "bg-slate-700"
                    )} />
                  )}
                </div>
              ))}
            </div>

            {/* Stage detail cards */}
            <div className="space-y-3">
              {journeyStages.map((s, i) => {
                const active = i <= 3 || selected.status === "champion";
                return (
                  <motion.div
                    key={s.stage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: active ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="glass-card rounded-xl border border-crm-border p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center",
                          active ? "bg-[#00A86B]/20" : "bg-slate-800/40"
                        )}>
                          <s.icon size={12} className={active ? "text-[#00A86B]" : "text-slate-600"} />
                        </div>
                        <p className="text-sm font-semibold text-slate-200">{s.stage}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">{s.date}</p>
                        <p className="text-[10px] text-[#D4AF37]">{s.duration}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.actions.map((a) => (
                        <span key={a} className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-crm-border text-[10px] text-slate-400">
                          {a}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Deterministic churn-risk score computed purely from real customer fields —
// no fabricated sub-signals. Churned accounts are excluded: they're already
// lost, not "at risk of" churning.
function computeChurnRisk(c: (typeof initialCustomers)[number]) {
  let score = 100 - c.health;
  if (c.status === "at-risk") score += 20;
  score = Math.max(0, Math.min(100, score));

  const factors: string[] = [];
  if (c.health < 60) factors.push("Low Health Score");
  if (c.status === "at-risk") factors.push("At-Risk Status");

  return { score, factors };
}

function ChurnRiskTab({ customers }: { customers: typeof initialCustomers }) {
  const [taskAdded, setTaskAdded] = useState<Set<number>>(new Set());

  const scored = customers
    .filter((c) => c.status !== "churned")
    .map((c) => ({ ...c, ...computeChurnRisk(c) }))
    .sort((a, b) => b.score - a.score);

  const safe   = scored.filter((c) => c.score < 30).length;
  const watch  = scored.filter((c) => c.score >= 30 && c.score < 60).length;
  const atRisk = scored.filter((c) => c.score >= 60).length;

  const addTask = (c: (typeof scored)[number]) => {
    createTask({
      title: `Follow up with ${c.name} on churn risk`,
      priority: c.score >= 60 ? "high" : c.score >= 30 ? "medium" : "low",
      due: "Tomorrow",
      assignee: "You",
      status: "pending",
      tags: ["Churn Risk"],
      company: c.name,
    }).catch(() => {});
    setTaskAdded((prev) => new Set(prev).add(c.id));
  };

  const riskColor = (s: number) =>
    s >= 60 ? { bar: "#f43f5e", badge: "bg-rose-500/15 text-rose-400 border-rose-500/25", label: "At Risk" }
    : s >= 30 ? { bar: "#f59e0b", badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", label: "Watch" }
    : { bar: "#00A86B", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", label: "Safe" };

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Safe",    count: safe,   color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle },
          { label: "Watch",   count: watch,  color: "text-amber-400",   bg: "bg-amber-500/10",   icon: AlertTriangle },
          { label: "At Risk", count: atRisk, color: "text-rose-400",    bg: "bg-rose-500/10",    icon: TrendingDown },
        ].map((s) => (
          <div key={s.label} className={cn("glass-card rounded-xl border border-crm-border p-4 flex items-center gap-3", s.bg)}>
            <s.icon size={20} className={s.color} />
            <div>
              <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Risk table */}
      <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_2fr_auto] gap-0">
          {/* Header */}
          <div className="col-span-4 grid grid-cols-[2fr_1fr_2fr_auto] px-4 py-2.5 border-b border-crm-border bg-white/[0.02]">
            {["Customer","Risk Score","Risk Factors","Action"].map((h) => (
              <p key={h} className="text-[10px] uppercase tracking-wider text-slate-500">{h}</p>
            ))}
          </div>

          {scored.length === 0 && (
            <div className="col-span-4 px-4 py-8 text-center text-xs text-slate-500">No active accounts to assess.</div>
          )}

          {scored.map((c, i) => {
            const rc = riskColor(c.score);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="col-span-4 grid grid-cols-[2fr_1fr_2fr_auto] px-4 py-3 border-b border-crm-border/50 hover:bg-white/[0.02] transition-colors items-center"
              >
                {/* Name */}
                <div>
                  <p className="text-xs font-semibold text-slate-200">{c.name}</p>
                  <p className="text-[10px] text-slate-500">{formatCurrency(c.value)} contract</p>
                </div>

                {/* Score bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden max-w-[60px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.score}%` }}
                      transition={{ delay: i * 0.05 + 0.2, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: rc.bar }}
                    />
                  </div>
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", rc.badge)}>{c.score}</span>
                </div>

                {/* Factors */}
                <div className="flex flex-wrap gap-1">
                  {c.factors.length === 0
                    ? <span className="text-[10px] text-slate-600">No active flags</span>
                    : c.factors.map((f) => (
                        <span key={f} className="px-1.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] text-rose-400">{f}</span>
                      ))
                  }
                </div>

                {/* Action */}
                <button
                  onClick={() => addTask(c)}
                  disabled={taskAdded.has(c.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors whitespace-nowrap",
                    taskAdded.has(c.id)
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 cursor-default"
                      : "bg-[#D4AF37]/10 border-[#D4AF37]/25 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                  )}
                >
                  {taskAdded.has(c.id) ? <><CheckCircle size={9} /> Added</> : <><Plus size={9} /> Task</>}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type NpsLogForm = { customerName: string; score: string; comment: string };
const emptyNpsForm: NpsLogForm = { customerName: "", score: "8", comment: "" };

function NPSManagementTab({ customers }: { customers: typeof initialCustomers }) {
  const [responses, setResponses] = useState<NpsResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState<NpsLogForm>(emptyNpsForm);
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    getNpsResponses().then((rows) => { setResponses(rows); setLoaded(true); }).catch(() => setLoaded(true));
  };
  useEffect(() => { refresh(); }, []);

  const total = responses.length;
  const promotersCount  = responses.filter((r) => r.score >= 9).length;
  const passivesCount   = responses.filter((r) => r.score >= 7 && r.score < 9).length;
  const detractorsCount = responses.filter((r) => r.score <= 6).length;
  const promotersPct  = total ? Math.round((promotersCount  / total) * 100) : 0;
  const passivesPct   = total ? Math.round((passivesCount   / total) * 100) : 0;
  const detractorsPct = total ? Math.round((detractorsCount / total) * 100) : 0;
  const nps = total ? Math.round(promotersPct - detractorsPct) : null;

  // Group responses by calendar month for a real trend line — only rendered
  // once there's more than one distinct month of data to actually trend across.
  const monthBuckets = new Map<string, { sortKey: number; promoters: number; detractors: number; total: number }>();
  for (const r of responses) {
    const d = new Date(r.date);
    if (isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const bucket = monthBuckets.get(key) ?? { sortKey: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), promoters: 0, detractors: 0, total: 0 };
    bucket.total += 1;
    if (r.score >= 9) bucket.promoters += 1;
    else if (r.score <= 6) bucket.detractors += 1;
    monthBuckets.set(key, bucket);
  }
  const trend = Array.from(monthBuckets.entries())
    .map(([month, b]) => ({ month, score: Math.round((b.promoters / b.total) * 100 - (b.detractors / b.total) * 100), sortKey: b.sortKey }))
    .sort((a, b) => a.sortKey - b.sortKey);
  const maxTrend = trend.length ? Math.max(...trend.map((t) => Math.abs(t.score)), 1) : 1;

  const scoreColor = (s: number) =>
    s >= 9 ? "text-emerald-400" : s >= 7 ? "text-amber-400" : "text-rose-400";

  const submitLog = async () => {
    if (!logForm.customerName.trim()) return;
    const score = Math.max(0, Math.min(10, parseInt(logForm.score, 10) || 0));
    setSubmitting(true);
    try {
      await submitNpsResponse({ customerName: logForm.customerName.trim(), score, comment: logForm.comment.trim() });
      refresh();
      setShowLogModal(false);
      setLogForm(emptyNpsForm);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* NPS hero */}
      <div className="grid grid-cols-3 gap-4">
        {/* Big NPS number */}
        <div className="glass-card rounded-2xl border border-crm-border p-5 flex flex-col items-center justify-center col-span-1">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">NPS Score</p>
          {nps === null ? (
            <>
              <p className="text-4xl font-black text-slate-600">N/A</p>
              <p className="text-[10px] text-slate-500 mt-2 text-center">No responses yet</p>
            </>
          ) : (
            <>
              <motion.p
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-6xl font-black"
                style={{ color: "#D4AF37" }}
              >
                {nps}
              </motion.p>
              {/* Gauge bar */}
              <div className="w-full mt-3 h-2.5 rounded-full overflow-hidden bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(nps + 100) / 2}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#f43f5e,#f59e0b,#00A86B)" }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                {nps > 70 ? "World-class (>70)" : nps > 30 ? "Great (>30)" : nps >= 0 ? "Needs work" : "At risk"}
              </p>
            </>
          )}
          <button
            onClick={() => setShowLogModal(true)}
            className="mt-4 flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-bg text-white text-[11px] font-medium"
          >
            <Send size={10} /> Log NPS Response
          </button>
        </div>

        {/* Breakdown */}
        <div className="glass-card rounded-2xl border border-crm-border p-5 col-span-1 space-y-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Breakdown</p>
          {[
            { label: "Promoters",   pct: promotersPct,  color: "#00A86B", icon: ThumbsUp,   range: "Score 9–10" },
            { label: "Passives",    pct: passivesPct,   color: "#f59e0b", icon: Minus,      range: "Score 7–8"  },
            { label: "Detractors",  pct: detractorsPct, color: "#f43f5e", icon: ThumbsDown, range: "Score 0–6"  },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <item.icon size={11} style={{ color: item.color }} />
                  <span className="text-xs text-slate-300">{item.label}</span>
                  <span className="text-[9px] text-slate-600">{item.range}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: item.color }}>{item.pct}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.pct}%` }}
                  transition={{ duration: 0.7 }}
                  className="h-full rounded-full"
                  style={{ background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div className="glass-card rounded-2xl border border-crm-border p-5 col-span-1">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-4">Monthly Trend</p>
          {trend.length < 2 ? (
            <div className="h-24 flex items-center justify-center">
              <p className="text-[10px] text-slate-600 text-center px-2">Not enough data yet<br />for a trend</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-24">
              {trend.map((t, i) => (
                <div key={t.month} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[9px]" style={{ color: "#D4AF37" }}>{t.score}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(Math.abs(t.score) / maxTrend) * 80}px` }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="w-full rounded-t-md"
                    style={{ background: "#D4AF37", opacity: 0.4 + i * (0.6 / Math.max(trend.length - 1, 1)) }}
                  />
                  <span className="text-[9px] text-slate-600">{t.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent responses */}
      <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
        <div className="px-4 py-3 border-b border-crm-border bg-white/[0.02] flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-300">Recent Responses</p>
          <span className="text-[10px] text-slate-500">{total} response{total === 1 ? "" : "s"}</span>
        </div>
        {loaded && total === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500">No responses yet — log one to get started.</div>
        ) : (
          <div className="divide-y divide-crm-border/50">
            {responses.map((r, i) => (
              <motion.div
                key={`${r.name}-${r.date}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {r.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-slate-200">{r.name}</p>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", scoreColor(r.score),
                      r.score >= 9 ? "bg-emerald-500/15" : r.score >= 7 ? "bg-amber-500/15" : "bg-rose-500/15"
                    )}>
                      {r.score}/10
                    </span>
                    <span className="ml-auto text-[10px] text-slate-600 flex-shrink-0">{r.date}</span>
                  </div>
                  {r.comment && <p className="text-[11px] text-slate-400 truncate">{r.comment}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Log NPS response modal */}
      <Modal
        open={showLogModal}
        onClose={() => { setShowLogModal(false); setLogForm(emptyNpsForm); }}
        title="Log NPS Response"
      >
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Customer *</label>
            <input
              className={inputCls}
              list="nps-customer-list"
              placeholder="Acme Corp"
              value={logForm.customerName}
              onChange={(e) => setLogForm((p) => ({ ...p, customerName: e.target.value }))}
            />
            <datalist id="nps-customer-list">
              {customers.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Score (0–10) *</label>
            <select
              className={selectCls}
              value={logForm.score}
              onChange={(e) => setLogForm((p) => ({ ...p, score: e.target.value }))}
            >
              {Array.from({ length: 11 }, (_, n) => n).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Comment</label>
            <input
              className={inputCls}
              placeholder="Optional feedback"
              value={logForm.comment}
              onChange={(e) => setLogForm((p) => ({ ...p, comment: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setShowLogModal(false); setLogForm(emptyNpsForm); }}
              className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitLog}
              disabled={!logForm.customerName.trim() || submitting}
              className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40"
            >
              {submitting ? "Saving…" : "Save Response"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RenewalsTab({ customers }: { customers: typeof initialCustomers }) {
  const [started, setStarted] = useState<Set<number>>(new Set());

  // Real renewals = customers that actually have a next-renewal label set.
  const renewals = customers
    .filter((c) => c.nextRenewal && c.nextRenewal.trim() !== "")
    .map((c) => {
      const renewalDate = parseRenewalLabel(c.nextRenewal);
      const daysLeft = renewalDate ? daysUntil(renewalDate) : null;
      return { ...c, daysLeft };
    })
    .sort((a, b) => {
      if (a.daysLeft === null && b.daysLeft === null) return 0;
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });

  const totalValue = renewals.reduce((s, r) => s + r.value, 0);

  const urgency = (d: number | null) =>
    d === null
      ? { color: "text-slate-500", bg: "bg-white/[0.04]", border: "border-crm-border", label: "Unknown" }
      : d < 30
      ? { color: "text-rose-400",   bg: "bg-rose-500/10",    border: "border-rose-500/20",    label: "Urgent"  }
      : d < 60
      ? { color: "text-amber-400",  bg: "bg-amber-500/10",   border: "border-amber-500/25",   label: "Soon"    }
      : { color: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "On Track" };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl border border-crm-border p-4 col-span-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Renewal Value</p>
          <p className="text-2xl font-black text-[#D4AF37] mt-1">{formatCurrency(totalValue)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{renewals.length} contract{renewals.length === 1 ? "" : "s"}</p>
        </div>
        {[
          { label: "< 30 Days",  count: renewals.filter((r) => r.daysLeft !== null && r.daysLeft < 30).length,                          color: "text-rose-400",    icon: AlertTriangle },
          { label: "30–60 Days", count: renewals.filter((r) => r.daysLeft !== null && r.daysLeft >= 30 && r.daysLeft < 60).length,       color: "text-amber-400", icon: Clock },
          { label: "60–90 Days", count: renewals.filter((r) => r.daysLeft !== null && r.daysLeft >= 60 && r.daysLeft < 90).length,       color: "text-emerald-400", icon: Calendar },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl border border-crm-border p-4 flex items-center gap-3">
            <s.icon size={18} className={s.color} />
            <div>
              <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Renewals table */}
      <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-crm-border bg-white/[0.02] grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3">
          {["Customer","Contract Value","Renewal Date","Health","Contact","Action"].map((h) => (
            <p key={h} className="text-[10px] uppercase tracking-wider text-slate-500">{h}</p>
          ))}
        </div>
        {renewals.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-slate-500">No customers have a renewal date on file.</div>
        )}
        <div className="divide-y divide-crm-border/50">
          {renewals.map((r, i) => {
            const u = urgency(r.daysLeft);
            const hc = healthColor(r.health);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
              >
                {/* Customer */}
                <div className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", u.bg, "border", u.border)} />
                  <p className="text-xs font-semibold text-slate-200 truncate">{r.name}</p>
                </div>

                {/* Value */}
                <p className="text-xs font-bold text-[#D4AF37]">{formatCurrency(r.value)}</p>

                {/* Date */}
                <div>
                  <p className="text-xs text-slate-300">{r.nextRenewal}</p>
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full border", u.color, u.bg, u.border)}>
                    {r.daysLeft === null ? "—" : `${r.daysLeft}d left`}
                  </span>
                </div>

                {/* Health */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden max-w-[50px]">
                    <div className="h-full rounded-full" style={{ width: `${r.health}%`, background: hc }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: hc }}>{r.health}</span>
                </div>

                {/* Contact */}
                <p className="text-xs text-slate-400 truncate">{r.contact}</p>

                {/* Action */}
                <button
                  onClick={() => setStarted((prev) => new Set(prev).add(r.id))}
                  disabled={started.has(r.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors whitespace-nowrap",
                    started.has(r.id)
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 cursor-default"
                      : "bg-[#00A86B]/10 border-[#00A86B]/25 text-[#00A86B] hover:bg-[#00A86B]/20"
                  )}
                >
                  {started.has(r.id) ? <><CheckCircle size={9} /> Started</> : <><RefreshCw size={9} /> Start</>}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── tabs config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",  label: "Overview",         icon: Users       },
  { id: "journey",   label: "Customer Journey",  icon: MapPin      },
  { id: "churn",     label: "Churn Risk",        icon: AlertTriangle},
  { id: "nps",       label: "NPS Management",    icon: Star        },
  { id: "renewals",  label: "Renewals",          icon: RefreshCw   },
] as const;
type TabId = typeof TABS[number]["id"];

// ─── main component ────────────────────────────────────────────────────────────
export default function Customers() {
  const [custList, setCustList] = useState<typeof initialCustomers>([]);
  const [custLoading, setCustLoading] = useState(true);
  const [search,   setSearch]   = useState("");
  const [showModal,setShowModal]= useState(false);
  const [form,     setForm]     = useState<CustForm>(emptyForm);
  const [editingId,setEditingId]= useState<number | null>(null);
  const [activeTab,setActiveTab]= useState<TabId>("overview");

  // Load from Supabase on mount — real rows only; an empty account shows
  // an empty state, never the seed data.
  useEffect(() => {
    getCustomers().then((rows) => setCustList(rows ?? [])).catch(() => {}).finally(() => setCustLoading(false));
  }, []);

  const set = (k: keyof CustForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = custList.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.toLowerCase().includes(search.toLowerCase())
  );

  const addCustomer = () => {
    if (!form.name.trim() || !form.contact.trim()) return;
    const avatar = form.name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

    if (editingId != null) {
      const patch = {
        name: form.name,
        contact: form.contact,
        email: form.email,
        phone: form.phone,
        value: parseInt(form.value) || 0,
        segment: form.segment,
        status: form.status as "active" | "at-risk" | "champion",
        avatar,
      };
      setCustList((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...patch } : c)));
      // Persist to Supabase when configured; demo mode throws → ignored (optimistic update stays)
      updateCustomer(editingId, patch).catch(() => {});
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
      return;
    }

    const newCustomer = {
      id: Date.now(),
      name: form.name,
      contact: form.contact,
      email: form.email,
      phone: form.phone,
      value: parseInt(form.value) || 0,
      segment: form.segment,
      health: 75,
      since: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      status: form.status as "active" | "at-risk" | "champion",
      avatar,
      nextRenewal: "Dec 2026",
    };
    setCustList((prev) => [...prev, newCustomer]);
    // Persist to Supabase when configured; demo mode throws → ignored (optimistic add stays)
    const { id: _id, ...customerData } = newCustomer;
    createCustomer(customerData).catch(() => {});
    setShowModal(false);
    setForm(emptyForm);
  };

  const openEdit = (c: (typeof custList)[number]) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      contact: c.contact,
      email: c.email,
      phone: c.phone,
      value: String(c.value),
      segment: c.segment,
      status: c.status,
    });
    setShowModal(true);
  };

  const removeCustomer = (id: number) => {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    setCustList((prev) => prev.filter((c) => c.id !== id));
    // Persist to Supabase when configured; demo mode throws → ignored (optimistic removal stays)
    deleteCustomer(id).catch(() => {});
  };

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-4">
        {/* ── Tab bar ── */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-crm-border w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeTab === t.id
                  ? "bg-white/[0.08] text-[#D4AF37] border border-[#D4AF37]/25 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <t.icon size={11} />
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Customers", value: custList.length,                                              color: "text-blue-400"    },
                  { label: "Champions",        value: custList.filter((c) => c.status === "champion").length,      color: "text-violet-400"  },
                  { label: "At Risk",          value: custList.filter((c) => c.status === "at-risk").length,       color: "text-rose-400"    },
                  { label: "Total ARR",        value: formatCurrency(custList.reduce((s, c) => s + c.value, 0)),   color: "text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="glass-card rounded-xl border border-crm-border p-3 text-center">
                    <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-[11px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Search + add */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-crm-border bg-white/[0.03] flex-1 max-w-xs">
                  <Search size={13} className="text-slate-500" />
                  <input
                    placeholder="Search customers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none flex-1"
                  />
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs ml-auto"
                >
                  <Plus size={12} /> Add Customer
                </button>
              </div>

              {/* Customer cards */}
              {!custLoading && filtered.length === 0 ? (
                <div className="glass-card rounded-2xl border border-crm-border p-10 text-center">
                  <p className="text-sm font-medium text-slate-300">No customers yet</p>
                  <p className="text-xs text-slate-500 mt-1">Add your first customer to see them here.</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map((c, i) => {
                  const st = statusStyles[c.status];
                  const hc = healthColor(c.health);
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card rounded-2xl border border-crm-border p-4 hover:border-blue-500/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {c.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.contact}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("badge border", st.bg, st.text, st.border)}>{c.status}</span>
                          <button
                            title="Edit"
                            onClick={() => openEdit(c)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] transition-all"
                          >
                            <Edit2 size={12} className="text-slate-400" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => removeCustomer(c.id)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 size={12} className="text-rose-400/70 hover:text-rose-400" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                          <p className="text-[10px] text-slate-500">Contract Value</p>
                          <p className="text-sm font-bold text-slate-100">{formatCurrency(c.value)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Segment</p>
                          <p className={cn("text-xs font-semibold", segmentColors[c.segment] || "text-slate-300")}>{c.segment}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Renewal</p>
                          <p className="text-xs text-slate-300">{c.nextRenewal}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Shield size={10} /> Health Score
                          </div>
                          <span className="text-xs font-bold" style={{ color: hc }}>{c.health}%</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${c.health}%` }}
                            transition={{ delay: i * 0.05 + 0.2, duration: 0.6 }}
                            className="h-full rounded-full"
                            style={{ background: hc }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-between">
                        <span className="text-[10px] text-slate-600">Since {c.since}</span>
                        <div className="flex gap-1.5">
                          <a
                            href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center hover:bg-blue-500/25 transition-colors"
                          >
                            <Phone size={10} className="text-blue-400" />
                          </a>
                          <a
                            href={`mailto:${c.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/25 transition-colors"
                          >
                            <Mail size={10} className="text-violet-400" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              )}
            </motion.div>
          )}

          {activeTab === "journey" && (
            <motion.div
              key="journey"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <CustomerJourneyTab customers={custList} />
            </motion.div>
          )}

          {activeTab === "churn" && (
            <motion.div
              key="churn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ChurnRiskTab customers={custList} />
            </motion.div>
          )}

          {activeTab === "nps" && (
            <motion.div
              key="nps"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <NPSManagementTab customers={custList} />
            </motion.div>
          )}

          {activeTab === "renewals" && (
            <motion.div
              key="renewals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <RenewalsTab customers={custList} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); setForm(emptyForm); }}
        title={editingId != null ? "Edit Customer" : "Add New Customer"}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Company Name *</label>
              <input className={inputCls} placeholder="Acme Corp" value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Contact Person *</label>
              <input className={inputCls} placeholder="Jane Smith" value={form.contact} onChange={set("contact")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Email</label>
              <input className={inputCls} placeholder="jane@acme.com" type="email" value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Phone</label>
              <input className={inputCls} placeholder="+1 555-0000" value={form.phone} onChange={set("phone")} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Contract Value ($)</label>
              <input className={inputCls} placeholder="100000" type="number" value={form.value} onChange={set("value")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Segment</label>
              <select className={selectCls} value={form.segment} onChange={set("segment")}>
                {["Enterprise", "SMB", "Startup", "Agency"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Status</label>
              <select className={selectCls} value={form.status} onChange={set("status")}>
                <option value="active">Active</option>
                <option value="champion">Champion</option>
                <option value="at-risk">At Risk</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setShowModal(false); setEditingId(null); setForm(emptyForm); }}
              className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addCustomer}
              disabled={!form.name.trim() || !form.contact.trim()}
              className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40"
            >
              {editingId != null ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
