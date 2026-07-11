"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2, Globe, Camera, Briefcase, PlayCircle, Hash,
  CheckSquare, Square, Image, Video, Type, Film, BookOpen,
  Upload, Calendar, Clock, Sparkles, Send, Zap,
  ChevronLeft, ChevronRight, BarChart2, TrendingUp, Heart,
  MessageCircle, Repeat2, Copy, Check, Eye, Users, Activity,
  LayoutDashboard,
} from "lucide-react";

// ── Colours ─────────────────────────────────────────────────────────────────
const GOLD    = "#D4AF37";
const EMERALD = "#00A86B";
const BG      = "#080c14";

const PLATFORM_CFG = {
  facebook:  { label: "Globe",  color: "#1877F2", icon: Globe,  charLimit: 3000 },
  instagram: { label: "Camera", color: "#E1306C", icon: Camera, charLimit: 2200 },
  linkedin:  { label: "LinkedIn",  color: "#0A66C2", icon: Briefcase,  charLimit: 3000 },
  youtube:   { label: "YouTube",   color: "#FF0000", icon: PlayCircle,   charLimit: 5000 },
  twitter:   { label: "Hash/X", color: "#1DA1F2", icon: Hash,   charLimit: 280  },
};
type PlatformKey = keyof typeof PLATFORM_CFG;

// ── Mock data ────────────────────────────────────────────────────────────────
const UPCOMING_POSTS = [
  { id: 1, platform: "instagram" as PlatformKey, content: "🚀 Excited to share our latest product update! New features dropping this week...", scheduledAt: "Today, 2:00 PM",   status: "scheduled" },
  { id: 2, platform: "facebook"  as PlatformKey, content: "Join us for our live webinar on scaling your sales pipeline. Limited spots available!", scheduledAt: "Today, 4:30 PM",   status: "scheduled" },
  { id: 3, platform: "linkedin"  as PlatformKey, content: "5 proven strategies to increase your close rate by 40%. A thread every sales pro should bookmark.", scheduledAt: "Tomorrow, 9:00 AM", status: "scheduled" },
  { id: 4, platform: "instagram" as PlatformKey, content: "Behind the scenes of our team building event. Culture is everything ✨",            scheduledAt: "Tomorrow, 1:00 PM", status: "draft"     },
  { id: 5, platform: "facebook"  as PlatformKey, content: "Customer spotlight: How Acme Corp 3× their revenue in 6 months using KVl CRM.", scheduledAt: "Wed, 10:00 AM",    status: "scheduled" },
];

const PLATFORM_STATS = {
  facebook:  { followers: "12.4K", reach: "8.2K",  engagement: "3.8%", bestTime: "Wed 2–4 PM" },
  instagram: { followers: "8.9K",  reach: "6.1K",  engagement: "5.2%", bestTime: "Fri 11 AM"  },
  linkedin:  { followers: "5.2K",  reach: "4.8K",  engagement: "4.1%", bestTime: "Tue 8–9 AM" },
  youtube:   { followers: "2.1K",  reach: "1.4K",  engagement: "2.9%", bestTime: "Sun 3 PM"   },
};

const TOP_POSTS = [
  { platform: "instagram" as PlatformKey, content: "How we closed a $50K deal in 48 hours",   likes: 842, comments: 94,  shares: 211 },
  { platform: "linkedin"  as PlatformKey, content: "The future of CRM is AI-powered insights", likes: 631, comments: 78,  shares: 189 },
  { platform: "facebook"  as PlatformKey, content: "Free webinar: B2B Sales Masterclass",      likes: 412, comments: 103, shares: 97  },
];

const FREQ_DATA = [
  { day: "Mon", posts: 3 },
  { day: "Tue", posts: 5 },
  { day: "Wed", posts: 4 },
  { day: "Thu", posts: 6 },
  { day: "Fri", posts: 7 },
  { day: "Sat", posts: 2 },
  { day: "Sun", posts: 1 },
];

const GROWTH_DATA = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 51 },
  { label: "Thu", value: 74 },
  { label: "Fri", value: 89 },
  { label: "Sat", value: 63 },
  { label: "Sun", value: 95 },
];

const AI_VARIATIONS = [
  {
    content: "🚀 Transform your sales game with AI-powered insights. Our clients see an average 40% increase in close rates within the first 90 days. Ready to level up? Drop a comment below and let's talk! #SalesGrowth #CRM #AI",
    hashtags: ["#SalesGrowth", "#CRM", "#AI", "#B2BSales"],
    emojis: ["🚀", "📈", "💡", "🎯"],
  },
  {
    content: "Most sales teams are leaving money on the table. Here's the truth: 68% of leads are lost due to poor follow-up. KVl CRM ensures you never miss a beat. Automate. Follow up. Close. 💰",
    hashtags: ["#SalesAutomation", "#LeadGeneration", "#KVlCRM"],
    emojis: ["💰", "🤝", "✅", "📊"],
  },
  {
    content: "Your competitors are already using AI to close deals faster. Are you? KVl CRM's Smart Insights tell you exactly when to reach out, what to say, and how to close. Try it free for 14 days. ✨",
    hashtags: ["#SalesTech", "#AITools", "#CRM", "#GrowthHacking"],
    emojis: ["✨", "🧠", "⚡", "🏆"],
  },
];

// ── Calendar helpers ──────────────────────────────────────────────────────────
function buildCalendarMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

// Post density per day (1-28 mock)
const POST_DAYS: Record<number, PlatformKey[]> = {
  2: ["instagram"], 5: ["facebook", "linkedin"], 8: ["instagram", "facebook"],
  10: ["linkedin"], 13: ["instagram"], 15: ["facebook", "instagram", "linkedin"],
  18: ["youtube"], 20: ["facebook"], 22: ["instagram", "linkedin"],
  25: ["facebook", "instagram"], 28: ["linkedin"],
};

// ── Small components ──────────────────────────────────────────────────────────
function PlatformBadge({ platform, size = 14 }: { platform: PlatformKey; size?: number }) {
  const cfg = PLATFORM_CFG[platform];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center justify-center rounded-full" style={{ background: cfg.color + "22", width: size + 10, height: size + 10 }}>
      <Icon size={size} style={{ color: cfg.color }} />
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = status === "scheduled"
    ? { bg: "rgba(0,168,107,0.15)", color: EMERALD, label: "Scheduled" }
    : { bg: "rgba(212,175,55,0.15)", color: GOLD,    label: "Draft"     };
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── TAB: Dashboard ────────────────────────────────────────────────────────────
function DashboardTab() {
  const CONNECTED: { key: PlatformKey; ok: boolean }[] = [
    { key: "facebook",  ok: true  },
    { key: "instagram", ok: true  },
    { key: "linkedin",  ok: true  },
    { key: "youtube",   ok: false },
    { key: "twitter",   ok: false },
  ];

  const STATS = [
    { label: "Scheduled Posts",    value: "12",    sub: "pending",         icon: Calendar  },
    { label: "Published This Week", value: "8",    sub: "↑ 14% vs last",  icon: Send      },
    { label: "Total Reach",         value: "24.5K", sub: "across platforms", icon: Eye      },
    { label: "Engagement Rate",     value: "4.2%",  sub: "↑ 0.8% vs avg",  icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Connected accounts */}
      <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-semibold text-slate-200 mb-4">Connected Accounts</p>
        <div className="flex flex-wrap gap-3">
          {CONNECTED.map(({ key, ok }) => {
            const cfg = PLATFORM_CFG[key];
            const Icon = cfg.icon;
            return (
              <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ background: ok ? cfg.color + "10" : "rgba(255,255,255,0.03)", borderColor: ok ? cfg.color + "40" : "rgba(255,255,255,0.06)" }}>
                <Icon size={16} style={{ color: ok ? cfg.color : "#475569" }} />
                <span className="text-xs font-medium" style={{ color: ok ? "#e2e8f0" : "#475569" }}>{cfg.label}</span>
                <span className="text-base">{ok ? "✅" : "❌"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,175,55,0.12)" }}>
                <Icon size={14} style={{ color: GOLD }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Upcoming posts */}
      <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-semibold text-slate-200 mb-4">Upcoming Posts</p>
        <div className="space-y-3">
          {UPCOMING_POSTS.map((post) => (
            <motion.div key={post.id} whileHover={{ x: 3 }}
              className="flex items-start gap-3 p-3 rounded-lg border transition-colors hover:border-white/10"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
              <PlatformBadge platform={post.platform} size={15} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{post.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={10} className="text-slate-600" />
                  <span className="text-[10px] text-slate-500">{post.scheduledAt}</span>
                </div>
              </div>
              <StatusBadge status={post.status} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TAB: Schedule Post ────────────────────────────────────────────────────────
function SchedulePostTab({ initialContent = "", onPreFill }: { initialContent?: string; onPreFill?: (content: string) => void }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformKey>>(new Set(["instagram"]));
  const [postType, setPostType] = useState<"image" | "video" | "text" | "story" | "reel">("image");
  const [content, setContent] = useState(initialContent);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [posted, setPosted] = useState(false);

  const togglePlatform = (key: PlatformKey) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const mainLimit = [...selectedPlatforms].reduce((min, k) => Math.min(min, PLATFORM_CFG[k].charLimit), 99999);
  const limitLabel = mainLimit === 99999 ? 5000 : mainLimit;
  const pct = Math.min((content.length / limitLabel) * 100, 100);
  const limitColor = pct > 90 ? "#EF4444" : pct > 70 ? GOLD : EMERALD;

  const handleAI = () => {
    setAiLoading(true);
    setTimeout(() => {
      setContent("🚀 Ready to transform how your team sells? KVl CRM's AI-powered insights help you close deals 2× faster. Join 10,000+ sales professionals already winning big. Comment 'DEMO' to get started! #SalesGrowth #CRM #AI");
      setAiLoading(false);
    }, 1500);
  };

  const POST_TYPES = [
    { key: "image", label: "Image",  icon: Image  },
    { key: "video", label: "Video",  icon: Video  },
    { key: "text",  label: "Text",   icon: Type   },
    { key: "story", label: "Story",  icon: BookOpen },
    { key: "reel",  label: "Reel",   icon: Film   },
  ] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left */}
      <div className="space-y-5">
        {/* Platform selector */}
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-semibold text-slate-200 mb-3">Select Platforms</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PLATFORM_CFG) as PlatformKey[]).filter(k => k !== "twitter").map((key) => {
              const cfg = PLATFORM_CFG[key];
              const Icon = cfg.icon;
              const active = selectedPlatforms.has(key);
              return (
                <button key={key} onClick={() => togglePlatform(key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all"
                  style={{ background: active ? cfg.color + "18" : "rgba(255,255,255,0.02)", borderColor: active ? cfg.color + "60" : "rgba(255,255,255,0.06)" }}>
                  {active ? <CheckSquare size={14} style={{ color: cfg.color }} /> : <Square size={14} className="text-slate-600" />}
                  <Icon size={14} style={{ color: active ? cfg.color : "#475569" }} />
                  <span className="text-xs" style={{ color: active ? "#e2e8f0" : "#475569" }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Post type */}
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-semibold text-slate-200 mb-3">Post Type</p>
          <div className="flex flex-wrap gap-2">
            {POST_TYPES.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setPostType(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all"
                style={{ background: postType === key ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)", borderColor: postType === key ? GOLD + "60" : "rgba(255,255,255,0.06)", color: postType === key ? GOLD : "#64748b" }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Media upload */}
        <div className="rounded-xl border border-dashed p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gold/30 transition-colors"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(212,175,55,0.2)", minHeight: 120 }}>
          <Upload size={24} style={{ color: GOLD + "80" }} />
          <p className="text-xs text-slate-500">Click to upload image / video</p>
          <p className="text-[10px] text-slate-600">JPG, PNG, MP4 · Max 50 MB</p>
          <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mt-1">
            <Image size={20} className="text-slate-600" />
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="space-y-5">
        {/* Content + AI */}
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-200">Content</p>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: "rgba(212,175,55,0.12)", color: GOLD, border: `1px solid ${GOLD}40` }}>
              {aiLoading ? <><Sparkles size={12} className="animate-spin" /> Generating…</> : <><Sparkles size={12} /> AI Content</>}
            </button>
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
            placeholder="Write your post caption here…"
            className="w-full bg-transparent border rounded-lg p-3 text-xs text-slate-300 resize-none focus:outline-none focus:border-gold/40 placeholder:text-slate-600"
            style={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1 h-1 rounded-full bg-white/5 mr-3 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: limitColor }} />
            </div>
            <span className="text-[10px]" style={{ color: limitColor }}>{content.length} / {limitLabel}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[...selectedPlatforms].map(k => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: PLATFORM_CFG[k].color + "20", color: PLATFORM_CFG[k].color }}>
                {PLATFORM_CFG[k].label}: {PLATFORM_CFG[k].charLimit.toLocaleString()} chars
              </span>
            ))}
          </div>
        </div>

        {/* Date + Time */}
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-semibold text-slate-200 mb-3">Schedule</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Date</label>
              <div className="relative">
                <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent border rounded-lg pl-7 pr-2 py-2 text-xs text-slate-300 focus:outline-none"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Time</label>
              <div className="relative">
                <Clock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-transparent border rounded-lg pl-7 pr-2 py-2 text-xs text-slate-300 focus:outline-none"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { setPosted(true); setTimeout(() => setPosted(false), 2500); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
            <Calendar size={15} /> Schedule Post
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${EMERALD}, #007a4d)`, color: "#fff" }}>
            <Zap size={15} /> Post Now
          </button>
        </div>
        <AnimatePresence>
          {posted && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-xs text-center font-semibold" style={{ color: EMERALD }}>
              ✅ Post scheduled successfully!
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── TAB: Content Calendar ─────────────────────────────────────────────────────
function ContentCalendarTab() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<number | null>(null);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const { firstDay, daysInMonth } = buildCalendarMonth(year, month);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelected(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelected(null); };

  const LEGEND = (Object.keys(PLATFORM_CFG) as PlatformKey[]).filter(k => k !== "twitter");

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {LEGEND.map(k => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: PLATFORM_CFG[k].color }} />
            {PLATFORM_CFG[k].label}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
          <p className="text-sm font-bold text-slate-200">{MONTHS[month]} {year}</p>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => <p key={d} className="text-center text-[10px] font-semibold text-slate-600 py-1">{d}</p>)}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const platforms = POST_DAYS[day] ?? [];
            const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
            const isSel = selected === day;
            return (
              <button key={day} onClick={() => setSelected(isSel ? null : day)}
                className="rounded-lg p-1.5 flex flex-col items-center gap-0.5 transition-all hover:bg-white/5 min-h-[52px]"
                style={{ background: isSel ? "rgba(212,175,55,0.1)" : "transparent", border: isSel ? `1px solid ${GOLD}40` : "1px solid transparent", outline: isToday ? `1px solid ${GOLD}60` : "none" }}>
                <span className="text-xs font-medium" style={{ color: isToday ? GOLD : "#94a3b8" }}>{day}</span>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {platforms.slice(0, 3).map((p, pi) => (
                    <span key={pi} className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: PLATFORM_CFG[p].color }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <AnimatePresence>
        {selected && POST_DAYS[selected] && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
            <p className="text-xs font-semibold text-slate-300 mb-3">Posts on {MONTHS[month]} {selected}</p>
            <div className="space-y-2">
              {POST_DAYS[selected].map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border" style={{ borderColor: PLATFORM_CFG[p].color + "30", background: PLATFORM_CFG[p].color + "08" }}>
                  <PlatformBadge platform={p} size={13} />
                  <span className="text-xs text-slate-400">{PLATFORM_CFG[p].label} · Scheduled post</span>
                  <StatusBadge status="scheduled" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TAB: Analytics ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const platforms = (Object.keys(PLATFORM_STATS) as (keyof typeof PLATFORM_STATS)[]);
  const maxFreq = Math.max(...FREQ_DATA.map(d => d.posts));
  const maxGrowth = Math.max(...GROWTH_DATA.map(d => d.value));

  return (
    <div className="space-y-6">
      {/* Platform cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {platforms.map((key) => {
          const cfg = PLATFORM_CFG[key];
          const stats = PLATFORM_STATS[key];
          const Icon = cfg.icon;
          return (
            <div key={key} className="rounded-xl border p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cfg.color + "20" }}>
                  <Icon size={14} style={{ color: cfg.color }} />
                </div>
                <span className="text-xs font-semibold text-slate-300">{cfg.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-1">
                {[
                  { l: "Followers", v: stats.followers, ic: Users },
                  { l: "Reach",     v: stats.reach,     ic: Eye },
                  { l: "Engagement",v: stats.engagement,ic: Heart },
                  { l: "Best Time", v: stats.bestTime,  ic: Clock },
                ].map(({ l, v, ic: Ic }) => (
                  <div key={l}>
                    <p className="text-[9px] text-slate-600">{l}</p>
                    <p className="text-xs font-bold text-slate-300">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posting frequency chart */}
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-semibold text-slate-200 mb-4">Posting Frequency</p>
          <div className="flex items-end gap-2 h-32">
            {FREQ_DATA.map(({ day, posts }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500">{posts}</span>
                <div className="w-full rounded-t-md transition-all" style={{ height: `${(posts / maxFreq) * 100}%`, background: `linear-gradient(180deg, ${GOLD}, ${GOLD}60)` }} />
                <span className="text-[9px] text-slate-600">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth chart */}
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-semibold text-slate-200 mb-4">7-Day Reach Growth</p>
          <div className="flex items-end gap-2 h-32">
            {GROWTH_DATA.map(({ label, value }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500">{value}</span>
                <div className="w-full rounded-t-md transition-all" style={{ height: `${(value / maxGrowth) * 100}%`, background: `linear-gradient(180deg, ${EMERALD}, ${EMERALD}60)` }} />
                <span className="text-[9px] text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-semibold text-slate-200 mb-4">Best Performing Posts</p>
        <div className="space-y-3">
          {TOP_POSTS.map((post, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black flex-shrink-0"
                style={{ background: PLATFORM_CFG[post.platform].color + "20", color: PLATFORM_CFG[post.platform].color }}>
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{post.content}</p>
                <PlatformBadge platform={post.platform} size={11} />
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs text-slate-500"><Heart size={11} style={{ color: "#E1306C" }} />{post.likes}</div>
                <div className="flex items-center gap-1 text-xs text-slate-500"><MessageCircle size={11} style={{ color: GOLD }} />{post.comments}</div>
                <div className="flex items-center gap-1 text-xs text-slate-500"><Repeat2 size={11} style={{ color: EMERALD }} />{post.shares}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TAB: AI Content Generator ─────────────────────────────────────────────────
function AIGeneratorTab({ onUse }: { onUse: (content: string) => void }) {
  const [topic, setTopic]       = useState("");
  const [tone, setTone]         = useState("Professional");
  const [platform, setPlatform] = useState<PlatformKey>("instagram");
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<typeof AI_VARIATIONS>([]);
  const [copied, setCopied]     = useState<number | null>(null);

  const TONES = ["Professional", "Casual", "Witty", "Inspirational"];

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setResults(AI_VARIATIONS);
      setLoading(false);
    }, 1800);
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-[10px] text-slate-500 block mb-1.5">Topic / Keyword</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. product launch, tips…"
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none placeholder:text-slate-600"
              style={{ borderColor: "rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1.5">Brand Tone</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className="px-2.5 py-1 rounded-lg text-xs border transition-all"
                  style={{ background: tone === t ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)", borderColor: tone === t ? GOLD + "60" : "rgba(255,255,255,0.06)", color: tone === t ? GOLD : "#64748b" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1.5">Platform</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PLATFORM_CFG) as PlatformKey[]).filter(k => k !== "twitter").map(k => {
                const cfg = PLATFORM_CFG[k];
                const Icon = cfg.icon;
                return (
                  <button key={k} onClick={() => setPlatform(k)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                    style={{ background: platform === k ? cfg.color + "20" : "rgba(255,255,255,0.03)", borderColor: platform === k ? cfg.color + "60" : "rgba(255,255,255,0.06)" }}>
                    <Icon size={14} style={{ color: platform === k ? cfg.color : "#475569" }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <button onClick={generate} disabled={loading}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
          {loading ? <><Sparkles size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Generate Content</>}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {results.map((v, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-[10px] font-semibold text-slate-500">Variation {i + 1}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleCopy(i, v.content)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: copied === i ? EMERALD : "#64748b" }}>
                      {copied === i ? <Check size={11} /> : <Copy size={11} />}
                      {copied === i ? "Copied" : "Copy"}
                    </button>
                    <button onClick={() => onUse(v.content)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                      style={{ background: "rgba(212,175,55,0.12)", borderColor: GOLD + "40", color: GOLD }}>
                      <Send size={11} /> Use This
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">{v.content}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {v.hashtags.map(h => (
                    <span key={h} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(26,161,255,0.1)", color: "#1DA1F2" }}>{h}</span>
                  ))}
                </div>
                <div className="flex gap-1">
                  {v.emojis.map((e, ei) => (
                    <span key={ei} className="text-base leading-none">{e}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard",        icon: LayoutDashboard },
  { id: "schedule",  label: "Schedule Post",    icon: Send },
  { id: "calendar",  label: "Content Calendar", icon: Calendar },
  { id: "analytics", label: "Analytics",        icon: BarChart2 },
  { id: "ai",        label: "AI Generator",     icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Social() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [preFilledContent, setPreFilledContent] = useState("");

  const handleUseContent = (content: string) => {
    setPreFilledContent(content);
    setActiveTab("schedule");
  };

  return (
    <div className="p-6 min-h-full" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}30` }}>
          <Share2 size={20} style={{ color: GOLD }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100">Social Media Scheduler</h1>
          <p className="text-xs text-slate-500">Manage all your social channels in one place</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: active ? "rgba(212,175,55,0.12)" : "transparent", color: active ? GOLD : "#64748b", border: active ? `1px solid ${GOLD}40` : "1px solid transparent" }}>
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "schedule"  && <SchedulePostTab initialContent={preFilledContent} onPreFill={(c) => setPreFilledContent(c)} />}
          {activeTab === "calendar"  && <ContentCalendarTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "ai"        && <AIGeneratorTab onUse={handleUseContent} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
