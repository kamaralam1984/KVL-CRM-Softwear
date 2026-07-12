"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, MoreHorizontal, TrendingUp, Clock } from "lucide-react";
import { deals as initialDeals } from "@/lib/data";
import { getDeals as fetchDeals, createDeal } from "@/lib/actions/deals";
import { cn, formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/modal";

const stages = [
  { id: "Discovery", label: "New Lead", color: "#06b6d4", bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400" },
  { id: "Qualified", label: "Contacted", color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  { id: "Proposal", label: "Proposal Sent", color: "#8b5cf6", bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
  { id: "Negotiation", label: "Negotiation", color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
  { id: "Closed Won", label: "Closed Won", color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
];

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type DealForm = { name: string; company: string; value: string; owner: string; probability: string };
const emptyForm: DealForm = { name: "", company: "", value: "", owner: "", probability: "50" };

export default function Pipeline() {
  const [dealList, setDealList] = useState(initialDeals);
  const [modalStage, setModalStage] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm);

  // Load from Supabase on mount; falls back to seed data in demo mode
  useEffect(() => {
    fetchDeals().then((rows) => { if (rows?.length) setDealList(rows); }).catch(() => {});
  }, []);

  const set = (k: keyof DealForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const getDeals = (stageId: string) => dealList.filter((d) => d.stage === stageId);
  const getTotal = (stageId: string) => getDeals(stageId).reduce((s, d) => s + d.value, 0);
  const totalPipeline = dealList.reduce((s, d) => s + d.value, 0);

  const openModal = (stageId: string) => {
    setModalStage(stageId);
    setForm({ ...emptyForm, probability: stageId === "Closed Won" ? "100" : stageId === "Negotiation" ? "75" : stageId === "Proposal" ? "60" : stageId === "Qualified" ? "40" : "20" });
  };

  const addDeal = () => {
    if (!form.name.trim() || !form.company.trim() || !modalStage) return;
    const avatar = form.company.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
    const newDeal = {
      id: Date.now(),
      name: form.name,
      company: form.company,
      value: parseInt(form.value) || 0,
      probability: parseInt(form.probability) || 50,
      stage: modalStage,
      owner: form.owner || "Unassigned",
      daysInStage: 0,
      avatar,
    };
    setDealList((prev) => [...prev, newDeal]);
    // Persist to Supabase when configured; demo mode throws → ignored (optimistic add stays)
    const { id: _id, ...dealData } = newDeal;
    createDeal(dealData).catch(() => {});
    setModalStage(null);
    setForm(emptyForm);
  };

  const stageName = stages.find((s) => s.id === modalStage)?.label || "";

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-xl border border-crm-border p-4">
            <p className="text-xs text-slate-500 mb-1">Total Pipeline</p>
            <p className="text-xl font-bold text-slate-100">{formatCurrency(totalPipeline)}</p>
            <div className="flex items-center gap-1 mt-1 text-emerald-400 text-xs">
              <TrendingUp size={11} /> <span>+22% vs last month</span>
            </div>
          </div>
          <div className="glass-card rounded-xl border border-crm-border p-4">
            <p className="text-xs text-slate-500 mb-1">Active Deals</p>
            <p className="text-xl font-bold text-slate-100">{dealList.length}</p>
            <p className="text-xs text-slate-600 mt-1">Across all stages</p>
          </div>
          <div className="glass-card rounded-xl border border-crm-border p-4">
            <p className="text-xs text-slate-500 mb-1">Avg Deal Size</p>
            <p className="text-xl font-bold text-slate-100">{formatCurrency(Math.round(totalPipeline / dealList.length))}</p>
            <p className="text-xs text-slate-600 mt-1">Per opportunity</p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: "480px" }}>
          {stages.map((stage) => {
            const stageDeals = getDeals(stage.id);
            const total = getTotal(stage.id);
            return (
              <div key={stage.id} className="flex-shrink-0 w-60 flex flex-col gap-2">
                <div className={cn("rounded-xl border p-3", stage.bg, stage.border)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-semibold", stage.text)}>{stage.label}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: stage.color + "30", color: stage.color }}>
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-200">{formatCurrency(total)}</p>
                </div>

                <div className="flex flex-col gap-2">
                  {stageDeals.map((deal, i) => (
                    <motion.div
                      key={deal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card rounded-xl border border-crm-border p-3 cursor-pointer hover:border-blue-500/30 hover:bg-white/[0.06] transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {deal.avatar}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-200 leading-tight">{deal.name}</p>
                            <p className="text-[10px] text-slate-500">{deal.company}</p>
                          </div>
                        </div>
                        <MoreHorizontal size={13} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>

                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-200">{formatCurrency(deal.value)}</span>
                        <span className="text-slate-500">{deal.owner.split(" ")[0]}</span>
                      </div>

                      {deal.probability < 100 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-500">Win probability</span>
                            <span className="text-[10px] font-semibold" style={{ color: stage.color }}>{deal.probability}%</span>
                          </div>
                          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${deal.probability}%`, background: stage.color }} />
                          </div>
                        </div>
                      )}

                      {deal.probability === 100 && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Closed Won
                        </div>
                      )}

                      {deal.daysInStage > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-600">
                          <Clock size={9} />
                          {deal.daysInStage}d in stage
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="rounded-xl border border-dashed border-crm-border/60 py-6 text-center text-[11px] text-slate-600">
                      No deals
                    </div>
                  )}

                  <button
                    onClick={() => openModal(stage.id)}
                    className={cn("w-full py-2 rounded-xl border border-dashed text-xs flex items-center justify-center gap-1 transition-all hover:bg-white/[0.06]", stage.border, "text-slate-600 hover:text-slate-300")}
                  >
                    <Plus size={12} /> Add Deal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={!!modalStage} onClose={() => setModalStage(null)} title={`Add Deal — ${stageName}`}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Deal Name *</label>
              <input className={inputCls} placeholder="Enterprise License" value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Company *</label>
              <input className={inputCls} placeholder="Acme Corp" value={form.company} onChange={set("company")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Value ($)</label>
              <input className={inputCls} placeholder="75000" type="number" value={form.value} onChange={set("value")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Owner</label>
              <input className={inputCls} placeholder="Sarah Chen" value={form.owner} onChange={set("owner")} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Win Probability (%)</label>
            <input className={inputCls} type="number" min="0" max="100" value={form.probability} onChange={set("probability")} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setModalStage(null)} className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors">Cancel</button>
            <button onClick={addDeal} disabled={!form.name.trim() || !form.company.trim()} className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40">Add to Pipeline</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
