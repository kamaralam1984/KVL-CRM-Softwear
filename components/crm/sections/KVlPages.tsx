"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layout, Plus, Eye, Edit2, Trash2, Copy, Globe, Zap,
  BarChart3, MousePointer, Users, ArrowRight, Check,
  Smartphone, Monitor, Tablet, Save, ExternalLink,
  Image, Type, Square, Columns, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GOLD    = "#D4AF37";
const EMERALD = "#00A86B";

const demoPages = [
  { id:1, name:"Lead Capture — Q4 Campaign", status:"Published", visits:2847, conversions:312, rate:"10.9%", template:"Lead Gen",  updated:"2h ago"  },
  { id:2, name:"Product Demo Request",        status:"Published", visits:1203, conversions:189, rate:"15.7%", template:"Demo",     updated:"1d ago"  },
  { id:3, name:"Free Trial Signup",           status:"Draft",     visits:0,    conversions:0,   rate:"—",    template:"Trial",    updated:"3d ago"  },
  { id:4, name:"Webinar Registration",        status:"Published", visits:4120, conversions:520, rate:"12.6%", template:"Event",   updated:"5d ago"  },
  { id:5, name:"Case Study Download",         status:"Paused",    visits:890,  conversions:67,  rate:"7.5%",  template:"Content", updated:"1w ago"  },
];

const templates = [
  { name:"Lead Generation",  desc:"Capture contact info with high-converting form", conversions:"12% avg", icon:"🎯" },
  { name:"Product Demo",     desc:"Book demos with calendar integration",           conversions:"18% avg", icon:"📅" },
  { name:"Free Trial",       desc:"Drive trial signups with value proposition",     conversions:"9% avg",  icon:"🚀" },
  { name:"Webinar / Event",  desc:"Event registration with countdown timer",        conversions:"14% avg", icon:"🎤" },
  { name:"Content Download", desc:"Gated content for lead magnets",                 conversions:"8% avg",  icon:"📄" },
  { name:"Sales Funnel",     desc:"Multi-step funnel with upsell pages",            conversions:"11% avg", icon:"🔄" },
];

const BLOCKS = [
  { icon: Type,    label:"Headline",    color:"#3b82f6" },
  { icon: Type,    label:"Paragraph",   color:"#6b7280" },
  { icon: Square,  label:"Button",      color: GOLD },
  { icon: Image,   label:"Image",       color:"#8b5cf6" },
  { icon: Columns, label:"Two Columns", color:"#06b6d4" },
  { icon: Layout,  label:"Form",        color: EMERALD },
  { icon: Star,    label:"Testimonial", color:"#f59e0b" },
  { icon: BarChart3,label:"Stats Row",  color:"#ef4444" },
];

type ViewMode = "desktop" | "tablet" | "mobile";

export default function KVlPages() {
  const [tab,       setTab]       = useState<"pages"|"builder"|"templates"|"analytics">("pages");
  const [viewMode,  setViewMode]  = useState<ViewMode>("desktop");
  const [selected,  setSelected]  = useState<number|null>(1);
  const [saved,     setSaved]     = useState(false);
  const [published, setPublished] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePublish = () => {
    setPublished(true);
    setTimeout(() => setPublished(false), 2500);
  };

  const totalVisits      = demoPages.reduce((a, p) => a + p.visits, 0);
  const totalConversions = demoPages.reduce((a, p) => a + p.conversions, 0);
  const avgRate = ((totalConversions / Math.max(totalVisits, 1)) * 100).toFixed(1);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD + "20", border:`1px solid ${GOLD}33` }}>
            <Layout size={16} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">KVl Pages</h1>
            <p className="text-[10px] text-slate-500">Landing page builder & funnel creator</p>
          </div>
        </div>
        <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
          onClick={() => setTab("builder")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black"
          style={{ background:`linear-gradient(135deg,${GOLD},#F5C842)` }}>
          <Plus size={13} /> New Page
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 pb-0 flex-shrink-0">
        {(["pages","templates","builder","analytics"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 rounded-t-xl text-xs font-semibold transition-all capitalize border-b-2",
              tab === t ? "text-white border-b-amber-400" : "text-slate-500 border-b-transparent hover:text-slate-300")}
            style={{ borderBottomColor: tab === t ? GOLD : "transparent" }}>
            {t === "builder" ? "Page Builder" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">

        {/* ── PAGES TAB ── */}
        {tab === "pages" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label:"Total Pages",    val: demoPages.length.toString(),   color:"#3b82f6" },
                { label:"Total Visits",   val: totalVisits.toLocaleString(),  color: GOLD },
                { label:"Conversions",    val: totalConversions.toString(),   color: EMERALD },
                { label:"Avg Conv. Rate", val: avgRate + "%",                  color:"#8b5cf6" },
              ].map(s => (
                <div key={s.label} className="glass-card rounded-xl p-3 border border-crm-border text-center">
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Pages list */}
            <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
              <div className="px-4 py-3 border-b border-crm-border flex items-center justify-between">
                <p className="text-xs font-bold text-slate-200">Your Pages</p>
                <span className="text-[10px] text-slate-500">{demoPages.length} pages</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {["Page Name","Status","Visits","Conversions","Conv. Rate","Updated","Actions"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demoPages.map((p, i) => (
                    <tr key={p.id} className={cn("border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors", i % 2 === 0 && "bg-white/[0.01]")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Globe size={12} className="text-slate-500" />
                          <span className="font-medium text-slate-200">{p.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">Template: {p.template}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          p.status === "Published" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          p.status === "Draft"     ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.visits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-300">{p.conversions}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: p.rate !== "—" ? EMERALD : "#64748b" }}>{p.rate}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[10px]">{p.updated}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setTab("builder")} className="w-6 h-6 rounded-lg bg-white/[0.04] border border-crm-border flex items-center justify-center hover:bg-white/[0.08] transition-colors" title="Edit">
                            <Edit2 size={10} className="text-slate-400" />
                          </button>
                          <button className="w-6 h-6 rounded-lg bg-white/[0.04] border border-crm-border flex items-center justify-center hover:bg-white/[0.08] transition-colors" title="Preview">
                            <Eye size={10} className="text-slate-400" />
                          </button>
                          <button className="w-6 h-6 rounded-lg bg-white/[0.04] border border-crm-border flex items-center justify-center hover:bg-white/[0.08] transition-colors" title="Duplicate">
                            <Copy size={10} className="text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-200">Choose a Template to Start</p>
              <span className="text-xs text-slate-500">{templates.length} templates available</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t, i) => (
                <motion.div key={t.name} whileHover={{ y:-4 }} transition={{ duration:0.2 }}
                  className="glass-card rounded-2xl border border-crm-border overflow-hidden cursor-pointer group"
                  onClick={() => setTab("builder")}>
                  {/* Fake preview */}
                  <div className="h-32 flex items-center justify-center text-4xl"
                    style={{ background:`linear-gradient(135deg,${GOLD}10,rgba(0,168,107,0.08))`, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    {t.icon}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold text-white">{t.name}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: EMERALD + "15", color: EMERALD }}>{t.conversions}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-3">{t.desc}</p>
                    <motion.button
                      whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                      className="w-full py-1.5 rounded-xl text-[11px] font-bold text-black opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background:`linear-gradient(135deg,${GOLD},#F5C842)` }}>
                      Use Template →
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── BUILDER TAB ── */}
        {tab === "builder" && (
          <div className="space-y-3">
            {/* Builder toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input defaultValue="Lead Capture — Q4 Campaign" className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-white/[0.04] border border-crm-border text-slate-200 outline-none focus:border-amber-500/40 w-64" />
              </div>
              <div className="flex items-center gap-2">
                {/* View mode */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-crm-border">
                  {([["desktop", Monitor],["tablet", Tablet],["mobile", Smartphone]] as const).map(([mode, Icon]) => (
                    <button key={mode} onClick={() => setViewMode(mode as ViewMode)}
                      className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", viewMode === mode ? "bg-white/[0.08]" : "hover:bg-white/[0.04]")}>
                      <Icon size={13} style={{ color: viewMode === mode ? GOLD : "#64748b" }} />
                    </button>
                  ))}
                </div>
                <motion.button whileHover={{ scale:1.03 }} onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-crm-border text-slate-300 hover:bg-white/[0.04] transition-colors">
                  {saved ? <Check size={12} style={{ color: EMERALD }} /> : <Save size={12} />}
                  {saved ? "Saved!" : "Save Draft"}
                </motion.button>
                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={handlePublish}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-black"
                  style={{ background: published ? `linear-gradient(135deg,${EMERALD},#00843D)` : `linear-gradient(135deg,${GOLD},#F5C842)` }}>
                  {published ? <><Check size={12} /> Published!</> : <><Globe size={12} /> Publish</>}
                </motion.button>
              </div>
            </div>

            {/* Builder layout */}
            <div className="flex gap-4 h-[520px]">
              {/* Left: Blocks panel */}
              <div className="w-44 flex-shrink-0 glass-card rounded-2xl border border-crm-border p-3 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Add Blocks</p>
                <div className="space-y-1.5">
                  {BLOCKS.map(b => {
                    const Icon = b.icon;
                    return (
                      <motion.div key={b.label} whileHover={{ x:2 }} transition={{ duration:0.15 }}
                        className="flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: b.color + "20" }}>
                          <Icon size={12} style={{ color: b.color }} />
                        </div>
                        <span className="text-[11px] text-slate-300">{b.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Center: Canvas */}
              <div className="flex-1 glass-card rounded-2xl border border-crm-border overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-crm-border bg-white/[0.02]">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/50"/><div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"/><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"/></div>
                  <div className="flex-1 px-3 py-1 rounded-md text-[10px] text-slate-500 bg-white/[0.03] border border-white/[0.05]">kvlcrm.com/p/lead-capture-q4</div>
                  <ExternalLink size={11} className="text-slate-600" />
                </div>
                {/* Page preview */}
                <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: viewMode === "mobile" ? "375px" : viewMode === "tablet" ? "768px" : "100%", margin:"0 auto", width:"100%" }}>
                  <div className="space-y-4">
                    {/* Hero block */}
                    <motion.div whileHover={{ outline:"2px solid #D4AF3755" }} className="rounded-xl p-6 text-center cursor-pointer transition-all" style={{ background:"rgba(212,175,55,0.05)", border:"1px dashed rgba(212,175,55,0.2)" }}>
                      <p className="text-xl font-black text-white mb-2">Close More Deals with KVl CRM</p>
                      <p className="text-sm text-slate-400">The all-in-one sales platform for modern revenue teams</p>
                    </motion.div>
                    {/* Form block */}
                    <motion.div whileHover={{ outline:"2px solid #00A86B55" }} className="rounded-xl p-5 cursor-pointer" style={{ background:"rgba(0,168,107,0.04)", border:"1px dashed rgba(0,168,107,0.2)" }}>
                      <p className="text-xs font-bold text-white mb-3">Start Your Free Trial</p>
                      <div className="space-y-2">
                        {["Full Name","Work Email","Company"].map(f => (
                          <div key={f} className="h-8 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center px-3">
                            <span className="text-[10px] text-slate-600">{f}</span>
                          </div>
                        ))}
                        <div className="h-9 rounded-xl flex items-center justify-center text-xs font-black text-black" style={{ background:`linear-gradient(135deg,${GOLD},#F5C842)` }}>
                          Start Free Trial →
                        </div>
                      </div>
                    </motion.div>
                    {/* Stats block */}
                    <motion.div whileHover={{ outline:"2px solid #3b82f655" }} className="rounded-xl p-4 cursor-pointer" style={{ background:"rgba(59,130,246,0.04)", border:"1px dashed rgba(59,130,246,0.2)" }}>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[["2,400+","Companies"],["3.2×","Revenue Growth"],["14 days","Free Trial"]].map(([v,l]) => (
                          <div key={l}><p className="text-sm font-black" style={{ color: GOLD }}>{v}</p><p className="text-[10px] text-slate-500">{l}</p></div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Right: Properties panel */}
              <div className="w-48 flex-shrink-0 glass-card rounded-2xl border border-crm-border p-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Page Settings</p>
                <div className="space-y-3">
                  {[
                    { label:"Page Title",       val:"Lead Capture Q4" },
                    { label:"SEO Description",  val:"Free trial signup" },
                    { label:"Background",       val:"Dark (#080c14)" },
                    { label:"Font Family",      val:"Inter" },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-[9px] text-slate-600 mb-1">{s.label}</p>
                      <div className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-300">{s.val}</div>
                    </div>
                  ))}
                  <div>
                    <p className="text-[9px] text-slate-600 mb-1">CRM Integration</p>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <span className="text-[10px] text-slate-300">Send leads to CRM</span>
                      <div className="w-7 h-4 rounded-full bg-emerald-500/60 flex items-center justify-end pr-0.5">
                        <div className="w-3 h-3 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <div className="space-y-4">
            {/* Top performers */}
            <div className="glass-card rounded-2xl border border-crm-border p-5">
              <p className="text-xs font-bold text-slate-200 mb-4">Page Performance</p>
              <div className="space-y-3">
                {demoPages.filter(p => p.status === "Published").map(p => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300">{p.name}</span>
                      <span className="text-xs font-bold" style={{ color: EMERALD }}>{p.rate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div initial={{ width:0 }} animate={{ width: p.rate !== "—" ? p.rate : "0%" }}
                          transition={{ duration:0.8, ease:"easeOut" }}
                          className="h-full rounded-full" style={{ background:`linear-gradient(90deg,${GOLD},${EMERALD})` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 w-20 text-right">{p.visits.toLocaleString()} visits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Traffic sources */}
            <div className="glass-card rounded-2xl border border-crm-border p-5">
              <p className="text-xs font-bold text-slate-200 mb-4">Traffic Sources</p>
              <div className="space-y-2.5">
                {[
                  { source:"Organic Search", pct:38, visits:3420, color:"#00A86B" },
                  { source:"Direct",         pct:28, visits:2520, color: GOLD },
                  { source:"Email Campaigns",pct:19, visits:1710, color:"#3b82f6" },
                  { source:"Social Media",   pct:11, visits: 990, color:"#8b5cf6" },
                  { source:"Paid Ads",       pct:4,  visits: 360, color:"#ef4444" },
                ].map(t => (
                  <div key={t.source} className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">{t.source}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <motion.div initial={{ width:0 }} animate={{ width:`${t.pct}%` }}
                        transition={{ duration:0.8, ease:"easeOut" }}
                        className="h-full rounded-full" style={{ background: t.color }} />
                    </div>
                    <span className="text-[10px] font-bold w-8 text-right" style={{ color: t.color }}>{t.pct}%</span>
                    <span className="text-[10px] text-slate-500 w-16 text-right">{t.visits.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
