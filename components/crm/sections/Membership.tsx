"use client";
// Phase 29 — Membership & Courses. New section (previously didn't exist).
// Admin manages tiers + drip content here; app/member/[tierId] is the
// customer-facing gated viewer.

import { useState, useEffect } from "react";
import { Crown, Plus, BookOpen, ExternalLink } from "lucide-react";
import {
  getMembershipTiers, createMembershipTier, getCourseContentForTier, addCourseContent,
  type MembershipTier, type CourseContentItem,
} from "@/lib/actions/membership";
import { getAccessToken } from "@/lib/security/clientSession";

const GOLD = "#D4AF37";

export default function Membership() {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [selected, setSelected] = useState<MembershipTier | null>(null);
  const [content, setContent] = useState<CourseContentItem[]>([]);
  const [showTierForm, setShowTierForm] = useState(false);
  const [tierForm, setTierForm] = useState({ name: "", price: "499", interval: "monthly" as "monthly" | "yearly" | "one_time" });
  const [showContentForm, setShowContentForm] = useState(false);
  const [contentForm, setContentForm] = useState({ title: "", contentUrl: "", dripDay: "0" });

  useEffect(() => {
    getMembershipTiers(undefined, getAccessToken()).then((rows) => { setTiers(rows); setSelected(rows[0] ?? null); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    getCourseContentForTier(selected.id).then(setContent).catch(() => {});
  }, [selected]);

  const createTier = async () => {
    if (!tierForm.name.trim()) return;
    const tier = await createMembershipTier({ name: tierForm.name, priceRupees: Number(tierForm.price) || 0, interval: tierForm.interval }, getAccessToken());
    if (tier) {
      setTiers((prev) => [...prev, tier]);
      setSelected(tier);
      setTierForm({ name: "", price: "499", interval: "monthly" });
      setShowTierForm(false);
    }
  };

  const addContent = async () => {
    if (!selected || !contentForm.title.trim()) return;
    const res = await addCourseContent({
      tierId: selected.id, title: contentForm.title, contentType: "video", contentUrl: contentForm.contentUrl, dripDay: Number(contentForm.dripDay) || 0,
    }, getAccessToken());
    if (res.ok) {
      const rows = await getCourseContentForTier(selected.id);
      setContent(rows);
      setContentForm({ title: "", contentUrl: "", dripDay: "0" });
      setShowContentForm(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD + "20", border: `1px solid ${GOLD}33` }}>
            <Crown size={16} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Membership</h1>
            <p className="text-[10px] text-slate-500">Tiers, subscriptions, and drip course content</p>
          </div>
        </div>
        <button onClick={() => setShowTierForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black" style={{ background: `linear-gradient(135deg,${GOLD},#F5C842)` }}>
          <Plus size={13} /> New Tier
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {showTierForm && (
          <div className="glass-card rounded-2xl border border-crm-border p-4 mb-4 flex items-end gap-3 flex-wrap">
            <input placeholder="Tier name" value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
            <input placeholder="Price (₹)" type="number" value={tierForm.price} onChange={(e) => setTierForm((f) => ({ ...f, price: e.target.value }))}
              className="w-28 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
            <select value={tierForm.interval} onChange={(e) => setTierForm((f) => ({ ...f, interval: e.target.value as typeof tierForm.interval }))}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-time</option>
            </select>
            <button onClick={createTier} className="px-4 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Create</button>
          </div>
        )}

        {tiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-slate-600">
            <Crown size={28} className="mb-2 opacity-40" />
            <p className="text-xs">No membership tiers yet — create one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              {tiers.map((t) => (
                <button key={t.id} onClick={() => setSelected(t)}
                  className="w-full text-left rounded-xl p-3 border transition-all"
                  style={{ background: selected?.id === t.id ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.02)", borderColor: selected?.id === t.id ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.06)" }}>
                  <p className="text-xs font-bold text-slate-200">{t.name}</p>
                  <p className="text-[10px] text-slate-500">₹{t.price}{t.billing_interval !== "one_time" ? `/${t.billing_interval === "yearly" ? "yr" : "mo"}` : ""}</p>
                </button>
              ))}
            </div>

            <div className="col-span-3 glass-card rounded-2xl border border-crm-border p-4">
              {selected && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-200">{selected.name} — Content</p>
                    <div className="flex items-center gap-2">
                      <a href={`/member/${selected.id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 flex items-center gap-1 hover:text-slate-300">
                        Preview <ExternalLink size={10} />
                      </a>
                      <button onClick={() => setShowContentForm(true)} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(212,175,55,0.12)", color: GOLD }}>
                        <Plus size={11} className="inline mr-1" /> Add Content
                      </button>
                    </div>
                  </div>

                  {showContentForm && (
                    <div className="rounded-xl border border-crm-border p-3 mb-3 flex items-end gap-2 flex-wrap">
                      <input placeholder="Lesson title" value={contentForm.title} onChange={(e) => setContentForm((f) => ({ ...f, title: e.target.value }))}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none flex-1 min-w-[140px]" />
                      <input placeholder="URL" value={contentForm.contentUrl} onChange={(e) => setContentForm((f) => ({ ...f, contentUrl: e.target.value }))}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none flex-1 min-w-[140px]" />
                      <input placeholder="Drip day" type="number" value={contentForm.dripDay} onChange={(e) => setContentForm((f) => ({ ...f, dripDay: e.target.value }))}
                        className="w-20 px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
                      <button onClick={addContent} className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Add</button>
                    </div>
                  )}

                  {content.length === 0 ? (
                    <p className="text-xs text-slate-600">No content yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {content.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                          <BookOpen size={12} className="text-slate-500" />
                          {c.title}
                          {c.drip_day > 0 && <span className="text-[10px] text-slate-600 ml-auto">Day {c.drip_day}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
