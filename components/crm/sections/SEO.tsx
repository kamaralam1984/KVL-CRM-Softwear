"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Plus, Trash2, ExternalLink, BarChart2,
  Globe, Link2, Eye, Target, Zap, FileText, Image, AlertCircle,
  ChevronUp, ChevronDown, Minus,
} from "lucide-react";

/* ── Palette ─────────────────────────────────────────── */
const GOLD    = "#D4AF37";
const EMERALD = "#00A86B";
const BG      = "#080c14";
const SURFACE = "#0d1424";
const BORDER  = "rgba(255,255,255,0.07)";

/* ── Mock Data ───────────────────────────────────────── */
const TOP_KEYWORDS = [
  { keyword: "CRM software",          position: 4,  volume: 18200, change: +2  },
  { keyword: "sales automation tool", position: 7,  volume: 9400,  change: +5  },
  { keyword: "lead management",       position: 12, volume: 6700,  change: -1  },
  { keyword: "pipeline tracking",     position: 19, volume: 3200,  change: +3  },
  { keyword: "customer database",     position: 28, volume: 2100,  change: -4  },
];

const ALL_KEYWORDS = [
  { keyword: "CRM software",          position: 4,  volume: 18200, change: +2,  difficulty: 72, status: "Ranking"   },
  { keyword: "sales automation tool", position: 7,  volume: 9400,  change: +5,  difficulty: 58, status: "Ranking"   },
  { keyword: "lead management",       position: 12, volume: 6700,  change: -1,  difficulty: 65, status: "Ranking"   },
  { keyword: "pipeline tracking",     position: 19, volume: 3200,  change: +3,  difficulty: 44, status: "Improving" },
  { keyword: "customer database",     position: 28, volume: 2100,  change: -4,  difficulty: 51, status: "Declining" },
  { keyword: "email marketing crm",   position: 35, volume: 4500,  change: 0,   difficulty: 68, status: "Stable"    },
  { keyword: "sales pipeline tool",   position: 42, volume: 1800,  change: +8,  difficulty: 39, status: "Improving" },
  { keyword: "contact management",    position: 56, volume: 5100,  change: -2,  difficulty: 60, status: "Declining" },
];

const COMPETITORS = [
  { domain: "hubspot.com",    da: 92, topKeywords: 48200, overlap: 34 },
  { domain: "salesforce.com", da: 96, topKeywords: 72400, overlap: 28 },
  { domain: "pipedrive.com",  da: 81, topKeywords: 19700, overlap: 42 },
];

const COMPARISON_ROWS = [
  { feature: "Domain Authority", you: 58, c1: 92,   c2: 96  },
  { feature: "Backlinks",        you: 12400, c1: 284000, c2: 510000 },
  { feature: "Organic Keywords", you: 2840, c1: 48200,  c2: 72400 },
  { feature: "Monthly Traffic",  you: 38200, c1: 1200000, c2: 3400000 },
];

const AUDIT_PASSED = [
  { label: "HTTPS Enabled",          desc: "Your site uses a valid SSL certificate." },
  { label: "XML Sitemap Present",     desc: "Sitemap found at /sitemap.xml." },
  { label: "Mobile Friendly",         desc: "All pages pass the mobile usability test." },
  { label: "Robots.txt Valid",        desc: "robots.txt is accessible and correctly formatted." },
  { label: "Canonical Tags Set",      desc: "Canonical URLs are configured on key pages." },
];

const AUDIT_WARNINGS = [
  { label: "Missing Image Alt Tags",    desc: "23 images across 9 pages are missing alt attributes." },
  { label: "Thin Meta Descriptions",    desc: "14 pages have meta descriptions under 50 characters." },
  { label: "Page Speed (Desktop)",      desc: "Average LCP is 3.4 s — target is below 2.5 s." },
];

const AUDIT_CRITICAL = [
  { label: "Broken Internal Links",    desc: "7 internal links return 404. Hurts crawlability." },
  { label: "Duplicate Title Tags",     desc: "11 pages share identical <title> values." },
];

/* ── Helpers ─────────────────────────────────────────── */
function positionColor(pos: number) {
  if (pos <= 10) return EMERALD;
  if (pos <= 30) return "#F59E0B";
  return "#EF4444";
}

function ChangeCell({ change }: { change: number }) {
  if (change > 0) return <span style={{ color: EMERALD }} className="flex items-center gap-0.5 text-xs font-semibold"><ChevronUp size={13} />+{change}</span>;
  if (change < 0) return <span className="flex items-center gap-0.5 text-xs font-semibold text-red-400"><ChevronDown size={13} />{change}</span>;
  return <span className="flex items-center gap-0.5 text-xs text-slate-500"><Minus size={11} />0</span>;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-2 rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right shrink-0">{pct}%</span>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={{ background: SURFACE, borderColor: BORDER }}
    >
      {children}
    </div>
  );
}

/* ── Gauge ───────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const pct  = score / 100;
  const r    = 56;
  const circ = 2 * Math.PI * r;
  // half-circle arc: offset for 0–100 mapped to upper semicircle
  const dashOffset = circ * (1 - pct * 0.5) - circ * 0.5;
  const color = score >= 80 ? EMERALD : score >= 50 ? GOLD : "#EF4444";
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* track */}
        <path
          d="M 14 76 A 56 56 0 0 1 126 76"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* fill */}
        <motion.path
          d="M 14 76 A 56 56 0 0 1 126 76"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * r}`}
          initial={{ strokeDashoffset: Math.PI * r }}
          animate={{ strokeDashoffset: Math.PI * r * (1 - pct) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="-mt-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-black"
          style={{ color }}
        >
          {score}
        </motion.p>
        <p className="text-xs text-slate-500 mt-0.5">out of 100</p>
      </div>
    </div>
  );
}

/* ── Tab: Overview ───────────────────────────────────── */
function Overview({ onTabChange }: { onTabChange: (t: string) => void }) {
  return (
    <div className="space-y-5">
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score */}
        <Card className="flex flex-col items-center justify-center py-6 md:col-span-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">SEO Health Score</p>
          <ScoreGauge score={74} />
          <p className="text-xs text-slate-500 mt-2">Last updated: today</p>
        </Card>

        {/* Issues breakdown */}
        <Card className="md:col-span-2 flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Issues Breakdown</p>
          <div className="space-y-3 flex-1">
            {[
              { label: "Critical",  count: 3,  color: "#EF4444", Icon: XCircle      },
              { label: "Warnings",  count: 8,  color: "#F59E0B", Icon: AlertTriangle },
              { label: "Passed",    count: 47, color: EMERALD,   Icon: CheckCircle   },
            ].map(({ label, count, color, Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={15} style={{ color }} className="shrink-0" />
                <span className="text-sm text-slate-300 w-20">{label}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((count / 58) * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <span className="text-sm font-bold w-6 text-right" style={{ color }}>{count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-4">58 total checks performed</p>
        </Card>
      </div>

      {/* Top 5 keywords */}
      <Card>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Top 5 Keywords</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-600 border-b" style={{ borderColor: BORDER }}>
                <th className="pb-2 font-medium">Keyword</th>
                <th className="pb-2 font-medium text-center">Position</th>
                <th className="pb-2 font-medium text-right">Volume</th>
                <th className="pb-2 font-medium text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {TOP_KEYWORDS.map((kw, i) => (
                <motion.tr
                  key={kw.keyword}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="border-b last:border-0"
                  style={{ borderColor: BORDER }}
                >
                  <td className="py-2.5 text-slate-200">{kw.keyword}</td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${positionColor(kw.position)}22`, color: positionColor(kw.position) }}>
                      #{kw.position}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-400">{kw.volume.toLocaleString()}</td>
                  <td className="py-2.5 text-right"><ChangeCell change={kw.change} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Run Audit",         icon: RefreshCw,  tab: "audit",      color: EMERALD },
          { label: "Track Keywords",    icon: Search,     tab: "keywords",   color: GOLD    },
          { label: "Analyze Competitor",icon: BarChart2,  tab: "competitor", color: "#818CF8" },
        ].map(({ label, icon: Icon, tab, color }) => (
          <motion.button
            key={label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onTabChange(tab)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors"
            style={{ borderColor: `${color}44`, color, background: `${color}11` }}
          >
            <Icon size={15} />
            {label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Keyword Tracker ────────────────────────────── */
function KeywordTracker() {
  const [keywords, setKeywords] = useState(ALL_KEYWORDS);
  const [input, setInput] = useState("");

  const avgPos = Math.round(keywords.reduce((s, k) => s + k.position, 0) / keywords.length);
  const top10  = keywords.filter(k => k.position <= 10).length;
  const totalVol = keywords.reduce((s, k) => s + k.volume, 0);

  const addKeyword = () => {
    const val = input.trim();
    if (!val) return;
    setKeywords(prev => [
      ...prev,
      { keyword: val, position: Math.floor(Math.random() * 80) + 1, volume: Math.floor(Math.random() * 5000) + 500, change: 0, difficulty: Math.floor(Math.random() * 80) + 10, status: "New" },
    ]);
    setInput("");
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avg Position",       value: `#${avgPos}`,                  color: GOLD    },
          { label: "Top 10 Keywords",    value: top10,                          color: EMERALD },
          { label: "Total Search Volume", value: totalVol.toLocaleString(),     color: "#818CF8" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center">
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Add keyword */}
      <Card>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addKeyword()}
              placeholder="Add a keyword to track…"
              className="w-full bg-transparent border rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-yellow-500/50 transition-colors"
              style={{ borderColor: BORDER }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={addKeyword}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: GOLD, color: "#000" }}
          >
            <Plus size={14} />
            Add Keyword
          </motion.button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-600 border-b" style={{ borderColor: BORDER }}>
              {["Keyword", "Position", "Search Volume", "Change", "Difficulty", "Status", ""].map(h => (
                <th key={h} className="pb-2 font-medium pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {keywords.map((kw, i) => (
                <motion.tr
                  key={kw.keyword}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b last:border-0"
                  style={{ borderColor: BORDER }}
                >
                  <td className="py-2.5 text-slate-200 font-medium pr-3">{kw.keyword}</td>
                  <td className="py-2.5 pr-3">
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${positionColor(kw.position)}22`, color: positionColor(kw.position) }}>
                      #{kw.position}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400 pr-3">{kw.volume.toLocaleString()}</td>
                  <td className="py-2.5 pr-3"><ChangeCell change={kw.change} /></td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${kw.difficulty}%`, background: kw.difficulty > 70 ? "#EF4444" : kw.difficulty > 45 ? "#F59E0B" : EMERALD }} />
                      </div>
                      <span className="text-xs text-slate-500">{kw.difficulty}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: kw.status === "Ranking" ? `${EMERALD}22` : kw.status === "Improving" ? `${GOLD}22` : kw.status === "Declining" ? "#EF444422" : "rgba(255,255,255,0.06)",
                      color: kw.status === "Ranking" ? EMERALD : kw.status === "Improving" ? GOLD : kw.status === "Declining" ? "#EF4444" : "#94A3B8",
                    }}>
                      {kw.status}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={() => setKeywords(prev => prev.filter(k => k.keyword !== kw.keyword))}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ── Tab: Competitor Analysis ────────────────────────── */
function CompetitorAnalysis() {
  const [competitors, setCompetitors] = useState(COMPETITORS);

  const formatNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  return (
    <div className="space-y-5">
      {/* Competitor cards */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-300">Tracked Competitors</h3>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
          style={{ borderColor: `${GOLD}44`, color: GOLD, background: `${GOLD}11` }}
        >
          <Plus size={12} />
          Add Competitor
        </motion.button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {competitors.map((c, i) => (
          <motion.div
            key={c.domain}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={14} style={{ color: GOLD }} />
                  <span className="text-sm font-semibold text-slate-200">{c.domain}</span>
                </div>
                <button
                  onClick={() => setCompetitors(prev => prev.filter(x => x.domain !== c.domain))}
                  className="text-slate-700 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "DA Score",    value: c.da                            },
                  { label: "Top KWs",     value: formatNum(c.topKeywords)        },
                  { label: "KW Overlap",  value: `${c.overlap}%`                 },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-sm font-bold" style={{ color: GOLD }}>{value}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Comparison table */}
      <Card>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Head-to-Head Comparison</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-600 border-b" style={{ borderColor: BORDER }}>
                <th className="text-left pb-2 font-medium">Metric</th>
                <th className="text-center pb-2 font-medium" style={{ color: EMERALD }}>You</th>
                {competitors.map(c => (
                  <th key={c.domain} className="text-center pb-2 font-medium text-slate-500">{c.domain}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, ri) => {
                const maxVal = Math.max(row.you, row.c1, row.c2);
                const vals   = [row.you, row.c1, row.c2];
                return (
                  <tr key={row.feature} className="border-b last:border-0" style={{ borderColor: BORDER }}>
                    <td className="py-3 text-slate-400">{row.feature}</td>
                    {vals.slice(0, 1 + competitors.length).map((v, vi) => (
                      <td key={vi} className="py-3 px-2">
                        <div className="space-y-1">
                          <p className={`text-xs font-bold text-center ${vi === 0 ? "text-emerald-400" : "text-slate-400"}`}>
                            {v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                          </p>
                          <Bar value={v} max={maxVal} color={vi === 0 ? EMERALD : vi === 1 ? GOLD : "#818CF8"} />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── Tab: SEO Audit ──────────────────────────────────── */
function SEOAudit() {
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(true);
  const [fixed, setFixed]     = useState<Set<string>>(new Set());

  const runAudit = () => {
    setRunning(true);
    setDone(false);
    setTimeout(() => { setRunning(false); setDone(true); }, 2200);
  };

  const fixItem = (label: string) => setFixed(prev => new Set(prev).add(label));

  const score = Math.round(((AUDIT_PASSED.length + fixed.size) / (AUDIT_PASSED.length + AUDIT_WARNINGS.length + AUDIT_CRITICAL.length)) * 100);

  return (
    <div className="space-y-5">
      {/* Run button + score */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Full Site Audit</h3>
          <p className="text-xs text-slate-600 mt-0.5">Checks 58 SEO factors across your entire domain</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={runAudit}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: running ? "rgba(0,168,107,0.2)" : EMERALD, color: running ? EMERALD : "#000" }}
        >
          <RefreshCw size={14} className={running ? "animate-spin" : ""} />
          {running ? "Running Audit…" : "Run Full Audit"}
        </motion.button>
      </div>

      {/* Progress bar */}
      {done && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 font-medium">Overall Score</p>
            <p className="text-sm font-black" style={{ color: score >= 80 ? EMERALD : GOLD }}>{score}/100</p>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{ background: `linear-gradient(90deg, ${EMERALD}, ${GOLD})` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-2">{AUDIT_PASSED.length + fixed.size} checks passed · {AUDIT_WARNINGS.length + AUDIT_CRITICAL.length - fixed.size} need attention</p>
        </Card>
      )}

      {/* Running skeleton */}
      {running && (
        <Card className="flex items-center justify-center py-10">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: `${EMERALD}66`, borderTopColor: EMERALD }} />
            <p className="text-sm text-slate-400">Crawling your site…</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {done && (
        <div className="space-y-4">
          {/* Passed */}
          <AuditGroup
            title="Passed"
            count={AUDIT_PASSED.length}
            icon={<CheckCircle size={15} style={{ color: EMERALD }} />}
            color={EMERALD}
            items={AUDIT_PASSED}
            fixed={fixed}
            onFix={fixItem}
            showFix={false}
          />
          {/* Warnings */}
          <AuditGroup
            title="Warnings"
            count={AUDIT_WARNINGS.length}
            icon={<AlertTriangle size={15} style={{ color: "#F59E0B" }} />}
            color="#F59E0B"
            items={AUDIT_WARNINGS}
            fixed={fixed}
            onFix={fixItem}
            showFix
          />
          {/* Critical */}
          <AuditGroup
            title="Critical"
            count={AUDIT_CRITICAL.length}
            icon={<XCircle size={15} style={{ color: "#EF4444" }} />}
            color="#EF4444"
            items={AUDIT_CRITICAL}
            fixed={fixed}
            onFix={fixItem}
            showFix
          />
        </div>
      )}
    </div>
  );
}

function AuditGroup({ title, count, icon, color, items, fixed, onFix, showFix }: {
  title: string; count: number; icon: React.ReactNode; color: string;
  items: { label: string; desc: string }[]; fixed: Set<string>;
  onFix: (l: string) => void; showFix: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setOpen(p => !p)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold" style={{ color }}>{title}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${color}22`, color }}>{count}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {items.map(item => {
                const isFixed = fixed.has(item.label);
                return (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", opacity: isFixed ? 0.5 : 1 }}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {isFixed
                        ? <CheckCircle size={13} style={{ color: EMERALD }} className="mt-0.5 shrink-0" />
                        : <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: `${color}66`, border: `1.5px solid ${color}` }} />
                      }
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    {showFix && !isFixed && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onFix(item.label)}
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0"
                        style={{ background: `${color}22`, color }}
                      >
                        Fix
                      </motion.button>
                    )}
                    {showFix && isFixed && (
                      <span className="text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0" style={{ background: `${EMERALD}22`, color: EMERALD }}>Fixed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ── Main Component ──────────────────────────────────── */
const TABS = [
  { id: "overview",    label: "Overview"           },
  { id: "keywords",   label: "Keyword Tracker"    },
  { id: "competitor", label: "Competitor Analysis" },
  { id: "audit",      label: "SEO Audit"          },
];

export default function SEO() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-100">SEO Suite</h1>
          <p className="text-xs text-slate-500 mt-0.5">Monitor rankings, audit health, and outperform competitors</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500">Live tracking</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative flex-1 py-2 text-xs font-semibold rounded-lg transition-colors"
            style={{ color: activeTab === tab.id ? "#000" : "#64748B" }}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="seo-tab-pill"
                className="absolute inset-0 rounded-lg"
                style={{ background: GOLD }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "overview"    && <Overview onTabChange={setActiveTab} />}
          {activeTab === "keywords"   && <KeywordTracker />}
          {activeTab === "competitor" && <CompetitorAnalysis />}
          {activeTab === "audit"      && <SEOAudit />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
