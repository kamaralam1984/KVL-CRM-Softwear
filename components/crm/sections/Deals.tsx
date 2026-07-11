"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, TrendingUp, MoreHorizontal } from "lucide-react";
import { deals as initialDeals } from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";
import Modal from "@/components/ui/modal";

const stageColors: Record<string, { text: string; bg: string; border: string }> = {
  Discovery: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  Qualified: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  Proposal: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  Negotiation: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  "Closed Won": { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type DealForm = { name: string; company: string; value: string; stage: string; owner: string; probability: string };
const emptyForm: DealForm = { name: "", company: "", value: "", stage: "Discovery", owner: "", probability: "50" };

export default function Deals() {
  const [dealList, setDealList] = useState(initialDeals);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DealForm>(emptyForm);

  const set = (k: keyof DealForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const addDeal = () => {
    if (!form.name.trim() || !form.company.trim()) return;
    const avatar = form.company.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
    setDealList((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: form.name,
        company: form.company,
        value: parseInt(form.value) || 0,
        probability: parseInt(form.probability) || 50,
        stage: form.stage,
        owner: form.owner || "Unassigned",
        daysInStage: 0,
        avatar,
      },
    ]);
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Deals", value: dealList.length, color: "text-blue-400" },
            { label: "Pipeline Value", value: formatCurrency(dealList.reduce((s, d) => s + d.value, 0)), color: "text-violet-400" },
            { label: "Closed Won", value: dealList.filter((d) => d.stage === "Closed Won").length, color: "text-emerald-400" },
            { label: "Avg Size", value: formatCurrency(Math.round(dealList.reduce((s, d) => s + d.value, 0) / dealList.length)), color: "text-cyan-400" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl border border-crm-border p-3 text-center">
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">All Deals</h3>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs"
          >
            <Plus size={12} /> Add Deal
          </button>
        </div>

        <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
          <div className="grid grid-cols-6 gap-3 px-4 py-2.5 border-b border-crm-border text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-2">Deal / Company</div>
            <div className="text-center">Value</div>
            <div className="text-center">Stage</div>
            <div className="text-center">Probability</div>
            <div className="text-center">Owner</div>
          </div>
          {dealList.map((deal, i) => {
            const sc = stageColors[deal.stage] || stageColors.Discovery;
            return (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="grid grid-cols-6 gap-3 px-4 py-3 border-b border-crm-border/50 last:border-0 table-row items-center hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {deal.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">{deal.name}</p>
                    <p className="text-[10px] text-slate-500">{deal.company}</p>
                  </div>
                </div>
                <div className="text-center text-sm font-bold text-slate-100">{formatCurrency(deal.value)}</div>
                <div className="flex justify-center">
                  <span className={cn("badge border", sc.bg, sc.text, sc.border)}>{deal.stage}</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${deal.probability}%`, background: deal.probability >= 75 ? "#10b981" : deal.probability >= 50 ? "#3b82f6" : "#f59e0b" }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">{deal.probability}%</span>
                </div>
                <div className="text-center text-xs text-slate-400">{deal.owner.split(" ")[0]}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Deal">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Stage</label>
              <select className={selectCls} value={form.stage} onChange={set("stage")}>
                {["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Probability (%)</label>
              <input className={inputCls} placeholder="50" type="number" min="0" max="100" value={form.probability} onChange={set("probability")} />
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
              onClick={addDeal}
              disabled={!form.name.trim() || !form.company.trim()}
              className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40"
            >
              Add Deal
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
