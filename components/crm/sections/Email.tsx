"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Send, Eye, MousePointer, Plus, TrendingUp } from "lucide-react";
import { emailCampaigns as initialCampaigns } from "@/lib/data";
import { getEmailCampaigns, createEmailCampaign } from "@/lib/actions/emailCampaigns";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/modal";

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  sent: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  scheduled: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  draft: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
};

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type CampForm = { name: string; status: string; date: string };
const emptyForm: CampForm = { name: "", status: "draft", date: "" };

const templates = ["Welcome Email", "Follow-up Series", "Deal Closed", "Re-engagement", "Product Update", "Event Invite"];

export default function Email() {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showModal, setShowModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [form, setForm] = useState<CampForm>(emptyForm);

  // Load from Supabase on mount; falls back to seed data in demo mode
  useEffect(() => {
    getEmailCampaigns().then((rows) => { if (rows?.length) setCampaigns(rows); }).catch(() => {});
  }, []);

  const set = (k: keyof CampForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const addCampaign = () => {
    if (!form.name.trim()) return;
    const newCampaign = {
      id: Date.now(),
      name: form.name,
      status: form.status as "sent" | "scheduled" | "draft",
      sent: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      openRate: 0,
      clickRate: 0,
      date: form.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
    setCampaigns((prev) => [...prev, newCampaign]);
    // Persist to Supabase when configured; demo mode throws → ignored (optimistic add stays)
    const { id: _id, ...campaignData } = newCampaign;
    createEmailCampaign(campaignData).catch(() => {});
    setShowModal(false);
    setForm(emptyForm);
  };

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Campaigns Sent", value: String(campaigns.filter((c) => c.status === "sent").length), icon: Mail, color: "text-blue-400", sub: "This month" },
            { label: "Avg Open Rate", value: "49.1%", icon: Eye, color: "text-emerald-400", sub: "+8% vs last" },
            { label: "Avg Click Rate", value: "12.2%", icon: MousePointer, color: "text-violet-400", sub: "+3% vs last" },
            { label: "Subscribers", value: "14,842", icon: TrendingUp, color: "text-cyan-400", sub: "+124 this week" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="glass-card rounded-xl border border-crm-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className={s.color} />
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{s.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Campaigns</h3>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs"
          >
            <Plus size={12} /> New Campaign
          </button>
        </div>

        <div className="glass-card rounded-2xl border border-crm-border overflow-hidden">
          <div className="grid grid-cols-7 gap-3 px-4 py-2.5 border-b border-crm-border text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-2">Campaign</div>
            <div className="text-center">Status</div>
            <div className="text-center">Sent</div>
            <div className="text-center">Open Rate</div>
            <div className="text-center">Click Rate</div>
            <div className="text-center">Date</div>
          </div>
          {campaigns.map((c, i) => {
            const st = statusStyles[c.status];
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                className="grid grid-cols-7 gap-3 px-4 py-3 border-b border-crm-border/50 last:border-0 table-row hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Mail size={12} className="text-violet-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-200 truncate">{c.name}</p>
                </div>
                <div className="flex items-center justify-center">
                  <span className={cn("badge border", st.bg, st.text, st.border)}>{c.status}</span>
                </div>
                <div className="flex items-center justify-center text-xs text-slate-300">
                  {c.sent > 0 ? c.sent.toLocaleString() : "—"}
                </div>
                <div className="flex items-center justify-center">
                  {c.openRate > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(c.openRate, 100)}%` }} />
                      </div>
                      <span className="text-xs text-emerald-400 font-medium">{c.openRate.toFixed(1)}%</span>
                    </div>
                  ) : <span className="text-xs text-slate-600">—</span>}
                </div>
                <div className="flex items-center justify-center">
                  {c.clickRate > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(c.clickRate * 5, 100)}%` }} />
                      </div>
                      <span className="text-xs text-blue-400 font-medium">{c.clickRate.toFixed(1)}%</span>
                    </div>
                  ) : <span className="text-xs text-slate-600">—</span>}
                </div>
                <div className="flex items-center justify-center text-xs text-slate-500">{c.date}</div>
              </motion.div>
            );
          })}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Quick Templates</h3>
          <div className="grid grid-cols-3 gap-3">
            {templates.map((name) => (
              <button
                key={name}
                onClick={() => setPreviewTemplate(name)}
                className="glass-card rounded-xl border border-crm-border p-3 text-left hover:border-blue-500/30 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center mb-2">
                  <Mail size={14} className="text-white" />
                </div>
                <p className="text-xs font-medium text-slate-300 group-hover:text-slate-100 transition-colors">{name}</p>
                <p className="text-[10px] text-blue-500 mt-0.5">Click to use</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* New Campaign Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Campaign">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Campaign Name *</label>
            <input className={inputCls} placeholder="Q1 Outreach Campaign" value={form.name} onChange={set("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Status</label>
              <select className={selectCls} value={form.status} onChange={set("status")}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="sent">Sent</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Date</label>
              <input className={inputCls} placeholder="Jan 10" value={form.date} onChange={set("date")} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors">Cancel</button>
            <button onClick={addCampaign} disabled={!form.name.trim()} className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40">
              <Send size={11} className="inline mr-1" /> Create Campaign
            </button>
          </div>
        </div>
      </Modal>

      {/* Template Preview Modal */}
      <Modal open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={`Template: ${previewTemplate}`}>
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-crm-border text-xs text-slate-400 leading-relaxed">
            <p className="text-slate-300 font-medium mb-2">Subject: {previewTemplate} — FreedomWithAI</p>
            <p>Hi {"{first_name}"},</p>
            <br />
            <p>This is a preview of your <span className="text-blue-400">{previewTemplate}</span> template. Customize the content to match your brand voice and messaging.</p>
            <br />
            <p>Best regards,<br /><span className="text-slate-300">The FreedomWithAI Team</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPreviewTemplate(null)} className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors">Close</button>
            <button
              onClick={() => { setPreviewTemplate(null); setForm((p) => ({ ...p, name: previewTemplate || "" })); setShowModal(true); }}
              className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs"
            >
              Use Template
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
