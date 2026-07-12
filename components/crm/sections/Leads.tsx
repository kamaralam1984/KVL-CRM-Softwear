"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Plus, MoreHorizontal, Star, Phone, Mail, Brain } from "lucide-react";
import { leads as initialLeads } from "@/lib/data";
import { getLeads, createLead } from "@/lib/actions/leads";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/modal";

const statusColors = {
  hot: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/20", dot: "bg-rose-500" },
  warm: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" },
  cold: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/20", dot: "bg-slate-500" },
};

const stageColors: Record<string, string> = {
  Discovery: "text-cyan-400",
  Qualified: "text-blue-400",
  Proposal: "text-violet-400",
  Negotiation: "text-amber-400",
};

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type LeadForm = { name: string; company: string; email: string; phone: string; value: string; stage: string; status: string };
const emptyForm: LeadForm = { name: "", company: "", email: "", phone: "", value: "", stage: "Discovery", status: "warm" };

export default function Leads() {
  const [leadList, setLeadList] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortByScore, setSortByScore] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<LeadForm>(emptyForm);

  // Load from Supabase on mount; falls back to seed data in demo mode
  useEffect(() => {
    getLeads().then((rows) => { if (rows?.length) setLeadList(rows); }).catch(() => {});
  }, []);

  const set = (k: keyof LeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = leadList
    .filter((l) => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "All" || l.status === filter.toLowerCase();
      return matchSearch && matchFilter;
    })
    .sort((a, b) => (sortByScore ? b.score - a.score : 0));

  const addLead = () => {
    if (!form.name.trim() || !form.company.trim()) return;
    const avatar = form.name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
    const newLead = {
      id: Date.now(),
      name: form.name,
      company: form.company,
      email: form.email,
      phone: form.phone,
      value: parseInt(form.value) || 0,
      stage: form.stage,
      status: form.status as "hot" | "warm" | "cold",
      score: Math.floor(Math.random() * 25) + 60,
      lastContact: "Just now",
      tags: [] as string[],
      avatar,
      owner: "Unassigned",
    };
    setLeadList((prev) => [...prev, newLead]);
    // Persist to Supabase when configured; demo mode throws → ignored (optimistic add stays)
    const { id: _id, ...leadData } = newLead;
    createLead(leadData).catch(() => {});
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Leads", value: leadList.length.toLocaleString(), color: "text-blue-400" },
            { label: "Hot Leads", value: leadList.filter((l) => l.status === "hot").length, color: "text-rose-400" },
            { label: "Warm Leads", value: leadList.filter((l) => l.status === "warm").length, color: "text-amber-400" },
            { label: "This Week", value: `+${leadList.filter((l) => l.lastContact === "Just now").length + 48}`, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl border border-crm-border p-3 text-center">
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-crm-border bg-white/[0.03] flex-1 max-w-xs">
            <Search size={13} className="text-slate-500" />
            <input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none flex-1"
            />
          </div>
          <div className="flex gap-1">
            {["All", "Hot", "Warm", "Cold"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn("text-xs px-3 py-1.5 rounded-lg transition-all", filter === f ? "gradient-bg text-white" : "text-slate-400 border border-crm-border hover:bg-white/[0.04]")}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortByScore((s) => !s)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:bg-white/[0.04]", sortByScore ? "border-blue-500/40 text-blue-400" : "border-crm-border text-slate-400")}
          >
            <Filter size={12} /> {sortByScore ? "Score ↓" : "Filter"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs ml-auto"
          >
            <Plus size={12} /> Add Lead
          </button>
        </div>

        {/* AI Suggestion Banner */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-violet-500/20 text-xs" style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.12), rgba(59,130,246,0.06))" }}>
          <Brain size={14} className="text-violet-400 flex-shrink-0" />
          <p className="text-slate-300"><span className="text-violet-300 font-medium">AI Recommendation:</span> Lisa Zhang (HealthTech AI) has a score of 95 and hasn&apos;t been contacted in 1h — high close probability. Follow up now!</p>
          <button className="ml-auto flex-shrink-0 text-blue-400 hover:text-blue-300 font-medium">Act</button>
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((lead, i) => {
            const sc = statusColors[lead.status as keyof typeof statusColors];
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card rounded-2xl border border-crm-border p-4 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {lead.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("badge border", sc.bg, sc.text, sc.border)}>
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1", sc.dot)} />
                      {lead.status}
                    </span>
                    <MoreHorizontal size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-500">Potential Value</p>
                    <p className="text-sm font-bold text-slate-100">${lead.value.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Stage</p>
                    <p className={cn("text-xs font-semibold", stageColors[lead.stage] || "text-slate-300")}>{lead.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Last Contact</p>
                    <p className="text-xs text-slate-300">{lead.lastContact}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Star size={11} className="text-amber-400" /> Lead Score
                    </div>
                    <span className="text-xs font-bold" style={{ color: lead.score >= 85 ? "#f43f5e" : lead.score >= 70 ? "#f59e0b" : "#94a3b8" }}>
                      {lead.score}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${lead.score}%` }}
                      transition={{ delay: i * 0.04 + 0.2, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: lead.score >= 85 ? "#f43f5e" : lead.score >= 70 ? "#f59e0b" : "#64748b" }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {lead.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-crm-border text-slate-500">{tag}</span>
                  ))}
                  <div className="ml-auto flex gap-1.5">
                    <button className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center hover:bg-blue-500/25 transition-colors">
                      <Phone size={10} className="text-blue-400" />
                    </button>
                    <button className="w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/25 transition-colors">
                      <Mail size={10} className="text-violet-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Lead">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Full Name *</label>
              <input className={inputCls} placeholder="John Doe" value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Company *</label>
              <input className={inputCls} placeholder="Acme Corp" value={form.company} onChange={set("company")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Email</label>
              <input className={inputCls} placeholder="john@acme.com" type="email" value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Phone</label>
              <input className={inputCls} placeholder="+1 555-0000" value={form.phone} onChange={set("phone")} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Value ($)</label>
              <input className={inputCls} placeholder="50000" type="number" value={form.value} onChange={set("value")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Stage</label>
              <select className={selectCls} value={form.stage} onChange={set("stage")}>
                {["Discovery", "Qualified", "Proposal", "Negotiation"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Status</label>
              <select className={selectCls} value={form.status} onChange={set("status")}>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addLead}
              disabled={!form.name.trim() || !form.company.trim()}
              className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40"
            >
              Add Lead
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
