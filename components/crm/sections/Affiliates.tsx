"use client";
// Phase 30 — Affiliate Manager. New section.
// Phase 36 — real payout via Razorpay Route (RazorpayX): once an affiliate
// has a saved UPI VPA fund account AND the merchant has RazorpayX
// configured, "Pay Commission" tries the real payout first and only falls
// back to the manual "mark paid" record when either is missing — a single
// smart handler rather than the client needing to know server config ahead
// of time.

import { useState, useEffect } from "react";
import { Users2, Plus, Copy, Check, DollarSign, Wallet } from "lucide-react";
import {
  getAffiliates, createAffiliate, getCommissionsForAffiliate, markCommissionPaidManually,
  saveAffiliatePayoutDetails, payCommissionViaRazorpayX,
  type Affiliate, type AffiliateCommission,
} from "@/lib/actions/affiliates";
import { getAccessToken } from "@/lib/security/clientSession";

const GOLD = "#D4AF37";
const EMERALD = "#00A86B";

export default function Affiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [selected, setSelected] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [copied, setCopied] = useState<string | null>(null);
  const [vpaInput, setVpaInput] = useState("");
  const [vpaSaved, setVpaSaved] = useState<null | "ok" | "failed">(null);
  const [payoutMsg, setPayoutMsg] = useState<Record<string, string>>({});

  const selectAffiliate = (a: Affiliate | null) => {
    setSelected(a);
    setVpaInput(a?.payout_vpa ?? "");
    setVpaSaved(null);
  };

  useEffect(() => {
    getAffiliates(getAccessToken()).then((rows) => { setAffiliates(rows); selectAffiliate(rows[0] ?? null); }).catch(() => {}).finally(() => setLoadingAffiliates(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    getCommissionsForAffiliate(selected.id, getAccessToken()).then(setCommissions).catch(() => {});
  }, [selected]);

  const create = async () => {
    if (!form.name.trim()) return;
    const aff = await createAffiliate(form.name, form.email, 0.1, getAccessToken());
    if (aff) { setAffiliates((prev) => [aff, ...prev]); selectAffiliate(aff); setForm({ name: "", email: "" }); setShowForm(false); }
  };

  const copyLink = (code: string) => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/?utm_source=${code}&utm_medium=affiliate`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const savePayoutDetails = async () => {
    if (!selected || !vpaInput.trim()) return;
    const res = await saveAffiliatePayoutDetails(selected.id, vpaInput.trim(), getAccessToken());
    setVpaSaved(res.ok ? "ok" : "failed");
    if (res.ok) {
      setAffiliates((prev) => prev.map((a) => (a.id === selected.id ? { ...a, payout_vpa: vpaInput.trim() } : a)));
      setSelected((prev) => (prev ? { ...prev, payout_vpa: vpaInput.trim() } : prev));
    }
  };

  // Tries the real RazorpayX payout first; falls back to the manual ledger
  // mark whenever RazorpayX isn't configured or this affiliate has no saved
  // fund account yet — never leaves a commission un-actionable.
  const markPaid = async (id: string) => {
    const auto = await payCommissionViaRazorpayX(id, getAccessToken());
    if (auto.ok) {
      setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, status: "paid_out" } : c)));
      setPayoutMsg((prev) => ({ ...prev, [id]: auto.mock ? "Paid (mock — re-save payout details to enable a real transfer)" : "Paid via RazorpayX" }));
      return;
    }
    const res = await markCommissionPaidManually(id, getAccessToken());
    if (res.ok) {
      setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, status: "paid_out" } : c)));
      setPayoutMsg((prev) => ({ ...prev, [id]: "Marked paid manually" }));
    }
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

        {loadingAffiliates ? (
          <div className="flex items-center justify-center py-20 text-xs text-slate-600">Loading affiliates…</div>
        ) : affiliates.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-slate-600">
            <Users2 size={28} className="mb-2 opacity-40" />
            <p className="text-xs">No affiliates yet — add one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              {affiliates.map((a) => (
                <button key={a.id} onClick={() => selectAffiliate(a)}
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
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet size={13} style={{ color: GOLD }} />
                      <p className="text-xs font-bold text-slate-200">Payout Details (UPI)</p>
                      {selected.razorpayx_fund_account_id && <span className="text-[9px] text-emerald-400 font-semibold">Fund account saved</span>}
                    </div>
                    <div className="flex items-end gap-2">
                      <input placeholder="affiliate@upi" value={vpaInput} onChange={(e) => { setVpaInput(e.target.value); setVpaSaved(null); }}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
                      <button onClick={savePayoutDetails} className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>
                        {vpaSaved === "ok" ? "Saved ✓" : vpaSaved === "failed" ? "Failed — retry" : "Save"}
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-600 mt-2">Sets up a RazorpayX fund account so &quot;Pay Commission&quot; below can transfer real money once RazorpayX is configured.</p>
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
                                Pay Commission
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400">{payoutMsg[c.id] ?? (c.razorpayx_payout_id ? "Paid via RazorpayX" : "Paid")}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
                      &quot;Pay Commission&quot; sends a real UPI payout via RazorpayX when it&apos;s configured and this affiliate has saved payout details above — otherwise it falls back to recording that you paid manually. Real automated payout still needs your own Razorpay Route product approval + per-payee KYC (external, not something this app can complete for you).
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
