"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock, Download, Plus } from "lucide-react";
import { invoices as initialInvoices } from "@/lib/data";
import { getInvoices, createInvoice } from "@/lib/actions/invoices";
import { cn, formatCurrency } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";
import Modal from "@/components/ui/modal";

const statusStyles: Record<string, { bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  paid: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: CheckCircle2 },
  pending: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: Clock },
  overdue: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", icon: AlertCircle },
};

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type InvForm = { client: string; amount: string; status: string; due: string };
const emptyForm: InvForm = { client: "", amount: "", status: "pending", due: "" };

export default function Finance() {
  const [invoiceList, setInvoiceList] = useState(initialInvoices);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<InvForm>(emptyForm);

  // Load from Supabase on mount; falls back to seed data in demo mode
  useEffect(() => {
    getInvoices().then((rows) => { if (rows?.length) setInvoiceList(rows); }).catch(() => {});
  }, []);

  const set = (k: keyof InvForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const totalPaid = invoiceList.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoiceList.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoiceList.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const addInvoice = () => {
    if (!form.client.trim() || !form.amount) return;
    const num = invoiceList.length + 1;
    const newInvoice = {
      id: `INV-${String(num).padStart(3, "0")}`,
      client: form.client,
      amount: parseInt(form.amount) || 0,
      status: form.status as "paid" | "pending" | "overdue",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      due: form.due || "TBD",
    };
    setInvoiceList((prev) => [...prev, newInvoice]);
    // Persist to Supabase when configured; demo mode throws → ignored (optimistic add stays)
    createInvoice(newInvoice).catch(() => {});
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Invoiced", value: formatCurrency(invoiceList.reduce((s, i) => s + i.amount, 0)), icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
            { label: "Collected", value: formatCurrency(totalPaid), icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Pending", value: formatCurrency(totalPending), icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            { label: "Overdue", value: formatCurrency(totalOverdue), icon: AlertCircle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={cn("glass-card rounded-xl border p-4", s.border)}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2", s.bg)}>
                  <Icon size={16} className={s.color} />
                </div>
                <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Invoices</h3>
          <div className="flex gap-2">
            <button
              onClick={() => downloadCSV("invoices.csv", invoiceList.map(inv => ({
                "Invoice ID": inv.id, Client: inv.client, Amount: inv.amount,
                Status: inv.status, Date: inv.date, "Due Date": inv.due,
              })))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04]"
            >
              <Download size={12} /> Export CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs"
            >
              <Plus size={12} /> New Invoice
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
          <div className="grid grid-cols-5 gap-3 px-4 py-2.5 border-b border-crm-border text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            <div>Invoice ID</div>
            <div>Client</div>
            <div className="text-center">Amount</div>
            <div className="text-center">Status</div>
            <div className="text-center">Due Date</div>
          </div>
          {invoiceList.map((inv, i) => {
            const st = statusStyles[inv.status];
            const Icon = st.icon;
            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-crm-border/50 last:border-0 items-center hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="text-xs font-mono text-slate-400">{inv.id}</div>
                <div className="text-xs font-medium text-slate-200">{inv.client}</div>
                <div className="text-center text-sm font-bold text-slate-100">{formatCurrency(inv.amount)}</div>
                <div className="flex justify-center">
                  <span className={cn("badge border flex items-center gap-1", st.bg, st.text, st.border)}>
                    <Icon size={9} /> {inv.status}
                  </span>
                </div>
                <div className="text-center text-xs text-slate-500">{inv.due}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "MRR", value: "$94,250", sub: "Monthly Recurring Revenue", trend: "+12.4%" },
            { label: "ARR", value: "$1.13M", sub: "Annual Recurring Revenue", trend: "+28.5%" },
            { label: "Churn Rate", value: "2.1%", sub: "Monthly churn", trend: "-0.4%" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl border border-crm-border p-4">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-slate-100">{s.value}</p>
              <p className="text-[10px] text-slate-600 mb-1">{s.sub}</p>
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp size={10} /> {s.trend}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Invoice">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Client Name *</label>
            <input className={inputCls} placeholder="TechNova Inc" value={form.client} onChange={set("client")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Amount ($) *</label>
              <input className={inputCls} placeholder="25000" type="number" value={form.amount} onChange={set("amount")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Due Date</label>
              <input className={inputCls} placeholder="Jan 15, 2026" value={form.due} onChange={set("due")} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Status</label>
            <select className={selectCls} value={form.status} onChange={set("status")}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors">Cancel</button>
            <button onClick={addInvoice} disabled={!form.client.trim() || !form.amount} className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40">Create Invoice</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
