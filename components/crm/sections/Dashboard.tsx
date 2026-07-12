"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, DollarSign, Target, Zap,
  CheckSquare, Trophy, UserPlus, Mail, Calendar, Sparkles,
  ArrowUpRight, Eye, Brain, GitBranch, Star, Flame,
  ChevronRight, Clock, Phone, Activity, Rocket, Shield,
  BarChart3, Globe, Heart,
} from "lucide-react";
import { salesChartData, revenueByCategory, activityFeed, teamMembers, leads as seedLeads, deals as seedDeals, tasks as seedTasks } from "@/lib/data";
import { getActivityFeed } from "@/lib/actions/activity";
import { getLeads } from "@/lib/actions/leads";
import { getDeals } from "@/lib/actions/deals";
import { getTasks } from "@/lib/actions/tasks";
import { cn, formatCurrency } from "@/lib/utils";
import GenerateLeadsButton from "@/components/crm/GenerateLeadsButton";

/* ── Animated Counter ── */
function AnimatedCounter({ target, prefix = "", suffix = "", decimals = 0 }: { target: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const step = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(current);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  let display: string;
  if (target >= 1_000_000) display = (count / 1_000_000).toFixed(2) + "M";
  else if (target >= 1000 && decimals === 0) display = Math.floor(count).toLocaleString();
  else display = count.toFixed(decimals);
  return <>{prefix}{display}{suffix}</>;
}

/* ── Mini Sparkline ── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const w = 72, h = 28;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  const fillPts = `0,${h} ${pts} ${(data.length - 1) * step},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) * step} cy={h - ((data[data.length - 1] - min) / range) * h} r="3" fill={color} />
    </svg>
  );
}

/* ── Circular Progress ── */
function CircleProgress({ value, size = 56, stroke = 5, color }: { value: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2d45" strokeWidth={stroke} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

/* ── Data ── */
const revSparkline  = salesChartData.slice(-7).map(d => d.revenue / 1000);
const leadSparkline = salesChartData.slice(-7).map(d => d.leads);
const dealSparkline = salesChartData.slice(-7).map(d => d.deals * 10);
const taskSparkline = [52, 48, 55, 43, 50, 46, 48].map(v => v * 10);

const kpis = [
  { label: "Total Revenue",   value: 1134000, change: +28.5, icon: DollarSign, color: "#3b82f6", glow: "rgba(59,130,246,0.25)",  border: "border-blue-500/25",   bg: "from-blue-500/10 to-blue-500/0",    iconBg: "bg-blue-500/15",   sparkColor: "#3b82f6", spark: revSparkline,  prefix: "$", suffix: "",  pct: 76 },
  { label: "Active Leads",    value: 1247,    change: +18.2, icon: Users,       color: "#8b5cf6", glow: "rgba(139,92,246,0.2)",   border: "border-violet-500/25", bg: "from-violet-500/10 to-violet-500/0", iconBg: "bg-violet-500/15", sparkColor: "#8b5cf6", spark: leadSparkline, prefix: "",  suffix: "",  pct: 83 },
  { label: "Win Rate",        value: 68.5,    change: +12.9, icon: Target,      color: "#06b6d4", glow: "rgba(6,182,212,0.2)",    border: "border-cyan-500/25",   bg: "from-cyan-500/10 to-cyan-500/0",    iconBg: "bg-cyan-500/15",   sparkColor: "#06b6d4", spark: dealSparkline, prefix: "",  suffix: "%", pct: 69 },
  { label: "Tasks Completed", value: 48,      change: -8.3,  icon: CheckSquare, color: "#f43f5e", glow: "rgba(244,63,94,0.2)",    border: "border-rose-500/25",   bg: "from-rose-500/10 to-rose-500/0",    iconBg: "bg-rose-500/15",   sparkColor: "#f43f5e", spark: taskSparkline, prefix: "",  suffix: "",  pct: 40 },
];

const pipelineStages = [
  { label: "Prospect",     count: 24, value: 380000, color: "#475569", pct: 100 },
  { label: "Qualified",    count: 18, value: 540000, color: "#3b82f6", pct: 75 },
  { label: "Proposal",     count: 12, value: 720000, color: "#8b5cf6", pct: 50 },
  { label: "Negotiation",  count:  7, value: 490000, color: "#f59e0b", pct: 29 },
  { label: "Closed Won",   count:  5, value: 850000, color: "#10b981", pct: 21 },
];

const recentWins = [
  { name: "SkyNet Robotics",   value: 520000, rep: "Priya N.", time: "2h ago",  color: "#10b981" },
  { name: "Apex Analytics",    value: 312000, rep: "Sarah C.", time: "1d ago",  color: "#3b82f6" },
  { name: "Nexus Systems",     value: 245000, rep: "Mike R.",  time: "2d ago",  color: "#8b5cf6" },
];

const businessMetrics = [
  { label: "MRR",        value: "$94.2K",  trend: "+12.4%", icon: TrendingUp,  color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  { label: "ARR",        value: "$1.13M",  trend: "+28.5%", icon: Rocket,      color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
  { label: "NPS Score",  value: "72",      trend: "+8pts",  icon: Heart,       color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
  { label: "Churn Rate", value: "2.1%",    trend: "-0.4%",  icon: Shield,      color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { label: "Avg Deal",   value: "$38.4K",  trend: "+15.2%", icon: Trophy,      color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  { label: "CAC",        value: "$1,240",  trend: "-8.3%",  icon: Target,      color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
];

const activityIcons: Record<string, { icon: typeof Trophy; color: string; bg: string }> = {
  deal:     { icon: Trophy,      color: "text-emerald-400", bg: "bg-emerald-500/10" },
  lead:     { icon: UserPlus,    color: "text-blue-400",    bg: "bg-blue-500/10" },
  email:    { icon: Mail,        color: "text-violet-400",  bg: "bg-violet-500/10" },
  task:     { icon: CheckSquare, color: "text-cyan-400",    bg: "bg-cyan-500/10" },
  meeting:  { icon: Calendar,    color: "text-amber-400",   bg: "bg-amber-500/10" },
  customer: { icon: Globe,       color: "text-rose-400",    bg: "bg-rose-500/10" },
  call:     { icon: Phone,       color: "text-teal-400",    bg: "bg-teal-500/10" },
};

const periodSlice: Record<string, number> = { "3M": 3, "6M": 6, "1Y": 12 };
const TooltipStyle = { backgroundColor: "#0f1729", border: "1px solid #1e2d45", borderRadius: "10px", color: "#e2e8f0", fontSize: 12, padding: "8px 12px" };

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export default function Dashboard() {
  const [period, setPeriod] = useState("1Y");
  // Load real data from Supabase on mount; falls back to seed data in demo mode
  const [activity, setActivity] = useState(activityFeed);
  const [leads, setLeads] = useState(seedLeads);
  const [deals, setDeals] = useState(seedDeals);
  const [tasks, setTasks] = useState(seedTasks);
  useEffect(() => {
    getActivityFeed().then((rows) => { if (rows?.length) setActivity(rows); }).catch(() => {});
    getLeads().then((rows) => { if (rows?.length) setLeads(rows); }).catch(() => {});
    getDeals().then((rows) => { if (rows?.length) setDeals(rows); }).catch(() => {});
    getTasks().then((rows) => { if (rows?.length) setTasks(rows); }).catch(() => {});
  }, []);

  // Derive live KPI numbers from real data (reconcile with loaded leads/deals/tasks)
  const totalRevenue    = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const activeLeads     = leads.length;
  const wonDeals        = deals.filter((d) => /won|closed/i.test(String(d.stage))).length;
  const winRate         = deals.length ? Math.round((wonDeals / deals.length) * 1000) / 10 : 0;
  const tasksCompleted  = tasks.filter((t) => t.status === "completed").length;
  const hotLeads        = leads.filter((l) => l.status === "hot").length;
  const tasksDue        = tasks.filter((t) => t.status === "pending").length;
  const liveKpiValues   = [totalRevenue, activeLeads, winRate, tasksCompleted];
  const liveKpis        = kpis.map((k, i) => ({ ...k, value: liveKpiValues[i] ?? k.value }));

  const chartData = salesChartData.slice(-periodSlice[period]);
  const topPerformer = [...teamMembers].filter(m => m.performance > 0).sort((a,b) => b.revenue - a.revenue).slice(0, 3);

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">

      {/* ══════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative rounded-2xl overflow-hidden border border-blue-500/20 p-5"
        style={{ background: "linear-gradient(135deg, #080c14 0%, #0d1f3c 40%, #130d2b 70%, #080c14 100%)", minHeight: 112 }}
      >
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{ x: [0,20,0], y: [0,10,0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-12 right-32 w-64 h-64 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(40px)" }} />
          <motion.div animate={{ x: [0,-15,0], y: [0,15,0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-16 right-0 w-80 h-80 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Avatar with ring */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }} />
              <div className="relative w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white font-bold text-xl" style={{ boxShadow: "0 0 24px rgba(59,130,246,0.4)" }}>
                A
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#080c14] flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[11px] text-slate-500">{today}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">● Live</span>
              </div>
              <h2 className="text-xl font-bold text-white">{getGreeting()}, Animesh! 👋</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-amber-400 font-semibold">{hotLeads} hot lead{hotLeads === 1 ? "" : "s"}</span> need immediate follow-up ·
                <span className="text-blue-400 font-semibold"> {tasksDue} task{tasksDue === 1 ? "" : "s"}</span> pending ·
                <span className="text-emerald-400 font-semibold"> {formatCurrency(totalRevenue)}</span> in open pipeline
              </p>
            </div>
          </div>

          {/* Hero quick stats + action */}
          <div className="flex flex-col items-end gap-3">
            <GenerateLeadsButton />
            <div className="flex items-center gap-3 flex-wrap">
            {[
              { icon: Rocket,    label: "Pipeline",   value: "$2.98M",  color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
              { icon: TrendingUp,label: "Growth",     value: "+28.5%",  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { icon: Users,     label: "Team",       value: "6 Reps",  color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
              { icon: BarChart3, label: "Win Rate",   value: "68.5%",   color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.label} whileHover={{ y: -2, scale: 1.02 }}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-sm", s.bg, s.border)}>
                  <Icon size={13} className={s.color} />
                  <div>
                    <p className="text-[10px] text-slate-500 leading-none">{s.label}</p>
                    <p className={cn("text-xs font-bold leading-tight mt-0.5", s.color)}>{s.value}</p>
                  </div>
                </motion.div>
              );
            })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════
          KPI CARDS — with circle progress
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {liveKpis.map((m, i) => {
          const Icon = m.icon;
          const isPos = m.change > 0;
          return (
            <motion.div key={m.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className={cn("relative glass-card rounded-2xl p-4 border overflow-hidden bg-gradient-to-br cursor-default group", m.border, m.bg)}
              style={{ boxShadow: `0 4px 24px ${m.glow}` }}
              whileHover={{ y: -3, boxShadow: `0 12px 40px ${m.glow}` }}
            >
              {/* Background glow */}
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 pointer-events-none"
                style={{ background: m.color, filter: "blur(20px)" }} />

              <div className="flex items-start justify-between mb-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", m.iconBg)}>
                  <Icon size={16} style={{ color: m.color }} />
                </div>
                {/* Circle progress ring */}
                <div className="relative">
                  <CircleProgress value={m.pct} size={44} stroke={4} color={m.color} />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: m.color }}>{m.pct}%</span>
                </div>
              </div>

              <div className="text-2xl font-extrabold text-slate-100 tracking-tight mb-0.5">
                <AnimatedCounter target={m.value} prefix={m.prefix} suffix={m.suffix} decimals={m.suffix === "%" ? 1 : 0} />
              </div>
              <p className="text-[11px] text-slate-500 mb-2">{m.label}</p>
              <div className="flex items-end justify-between">
                <div className={cn("flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full", isPos ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400")}>
                  {isPos ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                  {Math.abs(m.change)}%
                </div>
                <Sparkline data={m.spark} color={m.sparkColor} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════
          ROW 2 — Business Metrics + Pipeline
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Business KPI Grid */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="xl:col-span-2 glass-card rounded-2xl border border-crm-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Business Pulse</h3>
              <p className="text-xs text-slate-500">Key performance indicators — real time</p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live data
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {businessMetrics.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div key={m.label}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.05 }}
                  className={cn("rounded-xl border p-3 group hover:scale-[1.02] transition-all cursor-default", m.bg, m.border)}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={13} className={m.color} />
                    <span className="text-[10px] font-semibold text-emerald-400">{m.trend}</span>
                  </div>
                  <p className={cn("text-lg font-extrabold tracking-tight", m.color)}>{m.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.label}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Pipeline Funnel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl border border-crm-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Pipeline Health</h3>
              <p className="text-xs text-slate-500">$2.98M total value</p>
            </div>
            <button className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              Full view <ChevronRight size={10}/>
            </button>
          </div>
          <div className="space-y-3">
            {pipelineStages.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.07 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400">{s.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600">{s.count} deals</span>
                    <span className="text-xs font-semibold text-slate-300">{formatCurrency(s.value)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════
          ROW 3 — Revenue Chart + Recent Wins + Top Reps
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="xl:col-span-3 glass-card rounded-2xl border border-crm-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Revenue Growth</h3>
              <p className="text-xs text-slate-500">Monthly revenue vs lead acquisition</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block"/>Leads</span>
              </div>
              <div className="flex gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-crm-border">
                {["3M","6M","1Y"].map(t => (
                  <button key={t} onClick={() => setPeriod(t)}
                    className={cn("text-[11px] px-2.5 py-1 rounded-md transition-all", period === t ? "gradient-bg text-white" : "text-slate-500 hover:text-slate-300")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="lG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`}/>
                  <Tooltip contentStyle={TooltipStyle} formatter={((v: unknown, n: unknown) => [n === "revenue" ? `$${((v as number)/1000).toFixed(0)}K` : String(v), n]) as never}/>
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#rG)" dot={false} activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }}/>
                  <Area type="monotone" dataKey="leads"   stroke="#8b5cf6" strokeWidth={2}   fill="url(#lG)" dot={false} activeDot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Right column: Recent Wins + Top Reps */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Recent Wins */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="glass-card rounded-2xl border border-crm-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy size={13} className="text-amber-400"/>
                <p className="text-sm font-bold text-slate-100">Recent Wins</p>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold">+3 this week</span>
            </div>
            <div className="space-y-2.5">
              {recentWins.map((w, i) => (
                <motion.div key={w.name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.06 }}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: w.color + "25", border: `1px solid ${w.color}30` }}>
                    {w.name.substring(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{w.name}</p>
                    <p className="text-[10px] text-slate-600">{w.rep} · {w.time}</p>
                  </div>
                  <p className="text-xs font-bold flex-shrink-0" style={{ color: w.color }}>{formatCurrency(w.value)}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Top Reps */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex-1 glass-card rounded-2xl border border-crm-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star size={13} className="text-amber-400"/>
                <p className="text-sm font-bold text-slate-100">Top Performers</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {topPerformer.map((rep, i) => (
                <div key={rep.id} className="flex items-center gap-2.5">
                  <span className={cn("text-xs font-bold w-4 text-center flex-shrink-0",
                    i===0?"text-amber-400":i===1?"text-slate-300":"text-orange-500")}>{i+1}</span>
                  <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {rep.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{rep.name.split(" ")[0]}</p>
                    <div className="h-1 bg-white/[0.06] rounded-full mt-1 overflow-hidden">
                      <motion.div className="h-full rounded-full"
                        style={{ background: i===0?"#f59e0b":i===1?"#3b82f6":"#f97316" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${rep.performance}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 flex-shrink-0">{formatCurrency(rep.revenue)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ROW 4 — AI Insight + Activity Feed
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* AI Insight Panel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="glass-card rounded-2xl border border-violet-500/20 p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.2) 0%, rgba(30,58,120,0.15) 50%, rgba(8,12,20,0.95) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-10"
            style={{ background: "radial-gradient(circle at top right, #8b5cf6 0%, transparent 70%)" }}/>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <Brain size={15} className="text-violet-400"/>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">AI Revenue Intelligence</p>
              <p className="text-[10px] text-violet-400">Powered by FreedomWithAI</p>
            </div>
            <span className="ml-auto text-[10px] bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/20 font-semibold">87% confidence</span>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: TrendingUp,   color: "text-emerald-400", bg: "bg-emerald-500/10", text: "Q1 2026 forecast: $1.8M — 14 deals in late stage driving 28.5% YoY growth." },
              { icon: Flame,        color: "text-amber-400",   bg: "bg-amber-500/10",   text: "3 hot leads (score 88+) idle for 2h — historical data shows 67% drop in conversion." },
              { icon: Zap,          color: "text-blue-400",    bg: "bg-blue-500/10",    text: "Automate follow-ups for 12 warm leads to save ~4hrs/week and boost conversion +23%." },
            ].map((ins, i) => {
              const Icon = ins.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.07 }}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", ins.bg)}>
                    <Icon size={11} className={ins.color}/>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{ins.text}</p>
                </motion.div>
              );
            })}
          </div>
          <button className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Full AI Report <ArrowUpRight size={11}/>
          </button>
        </motion.div>

        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="xl:col-span-2 glass-card rounded-2xl border border-crm-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-slate-400"/>
              <h3 className="text-sm font-bold text-slate-100">Live Activity Feed</h3>
            </div>
            <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              View all <ChevronRight size={11}/>
            </button>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6">
            {activity.map((item, i) => {
              const meta = activityIcons[item.type] || activityIcons.deal;
              const Icon = meta.icon;
              return (
                <motion.div key={item.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 + i * 0.04 }}
                  className="flex items-start gap-2.5 py-2.5 border-b border-crm-border/40 last:border-0 group cursor-pointer">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform", meta.bg)}>
                    <Icon size={11} className={meta.color}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-300 leading-snug group-hover:text-slate-100 transition-colors">{item.text}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                      <Clock size={8}/> {item.time}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
