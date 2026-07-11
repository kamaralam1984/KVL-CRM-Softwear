"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Plus, Crown } from "lucide-react";
import { teamMembers as initialMembers } from "@/lib/data";
import { getTeamMembers, createTeamMember } from "@/lib/actions/team";
import { cn, formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/modal";

const statusDot: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-600",
};

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type MemberForm = { name: string; role: string; email: string; status: string };
const emptyForm: MemberForm = { name: "", role: "", email: "", status: "online" };

const roles = ["Senior AE", "Account Manager", "Account Executive", "BDR", "Sales Engineer"];

export default function Team() {
  const [members, setMembers] = useState(initialMembers);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm);

  // Load from Supabase on mount; falls back to seed data in demo mode
  useEffect(() => {
    getTeamMembers().then((rows) => { if (rows?.length) setMembers(rows); }).catch(() => {});
  }, []);

  const set = (k: keyof MemberForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const topPerformer = members.reduce((a, b) => a.performance > b.performance ? a : b);

  const addMember = () => {
    if (!form.name.trim() || !form.role.trim()) return;
    const avatar = form.name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
    const newMember = {
      id: Date.now(),
      name: form.name,
      role: form.role,
      email: form.email,
      avatar,
      status: form.status as "online" | "away" | "offline",
      revenue: 0,
      deals: 0,
      target: 0,
      performance: 0,
      joined: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    };
    setMembers((prev) => [...prev, newMember]);
    // Persist to Supabase when configured; demo mode throws → ignored (optimistic add stays)
    const { id: _id, ...memberData } = newMember;
    createTeamMember(memberData).catch(() => {});
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Team Size", value: members.length, color: "text-blue-400" },
            { label: "Online Now", value: members.filter((m) => m.status === "online").length, color: "text-emerald-400" },
            { label: "Avg Performance", value: `${Math.round(members.filter((m) => m.performance > 0).reduce((s, m) => s + m.performance, 0) / Math.max(members.filter((m) => m.performance > 0).length, 1))}%`, color: "text-violet-400" },
            { label: "Total Revenue", value: formatCurrency(members.reduce((s, m) => s + m.revenue, 0)), color: "text-cyan-400" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl border border-crm-border p-3 text-center">
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Leaderboard */}
          <div className="glass-card rounded-2xl border border-crm-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <Crown size={14} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Leaderboard</h3>
            </div>
            <div className="space-y-3">
              {[...members].filter((m) => m.revenue > 0).sort((a, b) => b.revenue - a.revenue).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className={cn("text-xs font-bold w-5 text-center", i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-600")}>
                    {i + 1}
                  </span>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-[10px] font-bold text-white">
                      {m.avatar}
                    </div>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-crm-surface", statusDot[m.status])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{m.name.split(" ")[0]}</p>
                    <p className="text-[10px] text-slate-600">{m.deals} deals</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-300">{formatCurrency(m.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Cards */}
          <div className="col-span-2 grid grid-cols-2 gap-3 content-start">
            {members.map((m, i) => {
              const isTop = m.id === topPerformer.id && m.performance > 0;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn("glass-card rounded-xl border p-4 hover:border-blue-500/30 transition-all cursor-pointer group", isTop ? "border-amber-500/25" : "border-crm-border")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-xs font-bold text-white">
                        {m.avatar}
                      </div>
                      <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2", statusDot[m.status], "border-crm-card")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-semibold text-slate-200 truncate">{m.name}</p>
                        {isTop && <Crown size={11} className="text-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500">{m.role}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center hover:bg-blue-500/25 transition-colors">
                        <Phone size={9} className="text-blue-400" />
                      </button>
                      <button className="w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center hover:bg-violet-500/25 transition-colors">
                        <Mail size={9} className="text-violet-400" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-[10px] text-slate-500">Revenue</p>
                      <p className="text-xs font-bold text-slate-200">{m.revenue > 0 ? formatCurrency(m.revenue) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Deals</p>
                      <p className="text-xs font-bold text-slate-200">{m.deals > 0 ? m.deals : "—"}</p>
                    </div>
                  </div>
                  {m.performance > 0 && (
                    <div>
                      <div className="flex justify-between mb-1 text-[10px]">
                        <span className="text-slate-500">Performance</span>
                        <span className="font-semibold" style={{ color: m.performance >= 100 ? "#10b981" : m.performance >= 95 ? "#3b82f6" : "#f59e0b" }}>
                          {m.performance}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(m.performance, 100)}%` }}
                          transition={{ delay: i * 0.05 + 0.3, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ background: m.performance >= 100 ? "#10b981" : m.performance >= 95 ? "#3b82f6" : "#f59e0b" }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            <button
              onClick={() => setShowModal(true)}
              className="glass-card rounded-xl border border-dashed border-crm-border p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-500/30 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-crm-border flex items-center justify-center">
                <Plus size={18} className="text-slate-600" />
              </div>
              <p className="text-xs text-slate-600">Add Member</p>
            </button>
          </div>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Team Member">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Full Name *</label>
              <input className={inputCls} placeholder="Sarah Chen" value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Email</label>
              <input className={inputCls} placeholder="sarah@company.com" type="email" value={form.email} onChange={set("email")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Role *</label>
              <select className={selectCls} value={form.role} onChange={set("role")}>
                <option value="">Select role...</option>
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Status</label>
              <select className={selectCls} value={form.status} onChange={set("status")}>
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors">Cancel</button>
            <button onClick={addMember} disabled={!form.name.trim() || !form.role} className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40">Add Member</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
