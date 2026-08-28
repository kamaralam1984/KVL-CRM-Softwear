"use client";
// Phase 30 — Affiliate Manager. New section. Commission PAYOUT is explicitly
// out of scope (needs Razorpay Route, a separate partner-approved product) —
// this ships tracking/ledger only, with a manual "Mark Paid" action, not
// faked automatic bank transfers.

import { useState, useEffect } from "react";
import { Users2, Plus, Copy, Check, DollarSign } from "lucide-react";
import {
  getAffiliates, createAffiliate, getCommissionsForAffiliate, markCommissionPaidManually,
  type Affiliate, type AffiliateCommission,
} from "@/lib/actions/affiliates";
import { getAccessToken } from "@/lib/security/clientSession";

const GOLD = "#D4AF37";
const EMERALD = "#00A86B";

export default function Affiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selected, setSelected] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getAffiliates(getAccessToken()).then((rows) => { setAffiliates(rows); setSelected(rows[0] ?? null); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    getCommissionsForAffiliate(selected.id, getAccessToken()).then(setCommissions).catch(() => {});
  }, [selected]);

  const create = async () => {
    if (!form.name.trim()) return;
    const aff = await createAffiliate(form.name, form.email, 0.1, getAccessToken());
    if (aff) { setAffiliates((prev) => [aff, ...prev]); setSelected(aff); setForm({ name: "", email: "" }); setShowForm(false); }
  };

  const copyLink = (code: string) => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/?utm_source=${code}&utm_medium=affiliate`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const markPaid = async (id: string) => {
    const res = await markCommissionPaidManually(id, getAccessToken());
    if (res.ok) setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, status: "paid_out" } : c)));
  };

  const totalOwed = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD + "20", border: `1px solid ${GOLD}33` }}>
            <Users2 size={16} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Affiliates</h1>
            <p className="text-[10px] text-slate-500">Referral tracking + commission ledger</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black" style={{ background: `linear-gradient(135deg,${GOLD},#F5C842)` }}>
          <Plus size={13} /> New Affiliate
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {showForm && (
          <div className="glass-card rounded-2xl border border-crm-border p-4 mb-4 flex items-end gap-3">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
            <button onClick={create} className="px-4 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Create</button>
          </div>
        )}

        {affiliates.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-slate-600">
            <Users2 size={28} className="mb-2 opacity-40" />
            <p className="text-xs">No affiliates yet — add one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              {affiliates.map((a) => (
                <button key={a.id} onClick={() => setSelected(a)}
                  className="w-full text-left rounded-xl p-3 border transition-all"
                  style={{ background: selected?.id === a.id ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)", borderColor: selected?.id === a.id ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.06)" }}>
                  <p className="text-xs font-bold text-slate-200">{a.name}</p>
                  <p className="text-[10px] text-slate-500">{Math.round(a.commission_rate * 100)}% commission</p>
                </button>
              ))}
            </div>

            <div className="col-span-3 space-y-3">
              {selected && (
                <>
                  <div className="glass-card rounded-2xl border border-crm-border p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Referral Link</p>
                      <p className="text-xs font-mono text-slate-300">?utm_source={selected.referral_code}&amp;utm_medium=affiliate</p>
                    </div>
                    <button onClick={() => copyLink(selected.referral_code)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(212,175,55,0.12)", color: GOLD }}>
                      {copied === selected.referral_code ? <Check size={12} /> : <Copy size={12} />} {copied === selected.referral_code ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  <div className="glass-card rounded-2xl border border-crm-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-200">Commissions</p>
                      <span className="text-xs font-black" style={{ color: EMERALD }}><DollarSign size={12} className="inline" /> {totalOwed.toFixed(2)} pending</span>
                    </div>
                    {commissions.length === 0 ? (
                      <p className="text-xs text-slate-600">No commissions yet — they&apos;re created automatically when a referred customer completes an order.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {commissions.map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                            <span className="text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                            <span className="font-semibold text-slate-200">${c.amount.toFixed(2)}</span>
                            {c.status === "pending" ? (
                              <button onClick={() => markPaid(c.id)} className="text-[10px] font-semibold px-2 py-1 rounded-md" style={{ background: "rgba(0,168,107,0.12)", color: EMERALD }}>
                                Mark Paid
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400">Paid</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
                      Payout is manual — actually transferring money needs Razorpay Route (a separate, partner-approved product with its own KYC per payee). &quot;Mark Paid&quot; records that you paid the affiliate yourself.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
