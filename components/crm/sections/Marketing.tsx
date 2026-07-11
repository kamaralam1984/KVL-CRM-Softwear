"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Mail, MessageSquare, Smartphone, BarChart2,
  Plus, Eye, Edit2, Send, TrendingUp, Users, DollarSign,
  Zap, CheckCircle, Clock, FileText, ChevronDown, Target,
  Activity, ArrowUp, Award, FlaskConical,
} from "lucide-react";

// ─── shared styles ──────────────────────────────────────────────────────────
const GOLD = "#D4AF37";
const EMERALD = "#00A86B";
const BG = "#080c14";
const SURFACE = "#0d1424";
const BORDER = "rgba(255,255,255,0.07)";

const card = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
};

const badge = (color: string) => ({
  background: `${color}22`,
  color,
  border: `1px solid ${color}44`,
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 600,
  display: "inline-block",
});

// ─── mock data ───────────────────────────────────────────────────────────────
const campaigns = [
  { id: 1, name: "Summer Sale Blast",      type: "Email",    status: "Sent",      sent: 12400, openRate: 38.2, clickRate: 9.4,  revenue: 24800 },
  { id: 2, name: "Re-engagement Flow",     type: "Email",    status: "Active",    sent: 3200,  openRate: 41.7, clickRate: 12.1, revenue: 9600  },
  { id: 3, name: "Flash Deal – 24h",       type: "WhatsApp", status: "Scheduled", sent: 0,     openRate: 0,    clickRate: 0,    revenue: 0     },
  { id: 4, name: "Product Launch Teaser",  type: "Email",    status: "Draft",     sent: 0,     openRate: 0,    clickRate: 0,    revenue: 0     },
  { id: 5, name: "Cart Abandonment",       type: "Email",    status: "Active",    sent: 8900,  openRate: 45.3, clickRate: 18.7, revenue: 31200 },
  { id: 6, name: "Weekend Promo",          type: "SMS",      status: "Sent",      sent: 5100,  openRate: 62.0, clickRate: 14.3, revenue: 15300 },
];

const forms = [
  { id: 1, name: "Lead Capture",    submissions: 1284, conversion: 34.2 },
  { id: 2, name: "Contact Us",      submissions: 672,  conversion: 28.9 },
  { id: 3, name: "Newsletter",      submissions: 4391, conversion: 61.4 },
  { id: 4, name: "Demo Request",    submissions: 319,  conversion: 19.7 },
];

const abTests = [
  {
    id: 1, name: "Subject Line Test – Summer Sale",
    variantA: { label: "Save 40% Today!", openRate: 36.1 },
    variantB: { label: "Limited Offer: 40% Off",  openRate: 41.8 },
    winner: "B", status: "Running",
  },
  {
    id: 2, name: "CTA Button Colour",
    variantA: { label: "Green CTA", openRate: 28.4 },
    variantB: { label: "Gold CTA",  openRate: 33.7 },
    winner: "B", status: "Running",
  },
  {
    id: 3, name: "Send Time Optimisation",
    variantA: { label: "9 AM send",  openRate: 39.2 },
    variantB: { label: "6 PM send",  openRate: 37.5 },
    winner: "A", status: "Completed",
  },
];

const smsCampaigns = [
  { id: 1, name: "Flash Sale Alert",     recipients: 4200, delivery: 97.3, response: 12.4 },
  { id: 2, name: "Appointment Reminder", recipients: 1800, delivery: 99.1, response: 34.6 },
  { id: 3, name: "Loyalty Points Update",recipients: 6700, delivery: 96.8, response: 8.9  },
];

const pushCampaigns = [
  { id: 1, name: "New Product Drop",  recipients: 9400, delivery: 88.2, response: 6.7 },
  { id: 2, name: "Price Drop Alert",  recipients: 3100, delivery: 91.5, response: 14.3 },
];

const channelRevenue = [
  { channel: "Email",    revenue: 84600, color: GOLD     },
  { channel: "WhatsApp", revenue: 52300, color: EMERALD  },
  { channel: "SMS",      revenue: 31200, color: "#7C3AED" },
  { channel: "Organic",  revenue: 68900, color: "#0EA5E9" },
];

const funnelSteps = [
  { label: "Impressions", value: 248000, pct: 100 },
  { label: "Clicks",      value: 31200,  pct: 12.6 },
  { label: "Leads",       value: 6840,   pct: 2.8  },
  { label: "Customers",   value: 1124,   pct: 0.45 },
];

const statusColor: Record<string, string> = {
  Draft: "#64748b", Scheduled: "#0EA5E9", Sent: EMERALD, Active: GOLD,
};

const tabs = ["Campaigns", "Forms & Landing Pages", "A/B Testing", "SMS & Push", "Analytics"] as const;
type Tab = typeof tabs[number];

const typeFilters = ["All", "Email", "WhatsApp", "SMS"] as const;

// ─── helpers ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div style={{ ...card, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{value}</p>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{label}</p>
      </div>
    </div>
  );
}

// ─── CAMPAIGNS tab ──────────────────────────────────────────────────────────
function CampaignsTab() {
  const [filter, setFilter] = useState<"All" | "Email" | "WhatsApp" | "SMS">("All");

  const filtered = filter === "All" ? campaigns : campaigns.filter(c => c.type === filter);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const avgOpen = (campaigns.filter(c => c.openRate > 0).reduce((s, c) => s + c.openRate, 0) / campaigns.filter(c => c.openRate > 0).length).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard label="Total Campaigns"     value={campaigns.length} icon={Megaphone}   color={GOLD}     />
        <StatCard label="Avg Open Rate"       value={`${avgOpen}%`}    icon={TrendingUp}   color={EMERALD}  />
        <StatCard label="Revenue Generated"   value={`$${(totalRevenue/1000).toFixed(1)}k`} icon={DollarSign} color="#7C3AED" />
        <StatCard label="Active Automations"  value={4}                icon={Zap}          color="#0EA5E9"  />
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 4 }}>
          {typeFilters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                background: filter === f ? GOLD : "transparent", color: filter === f ? "#000" : "#94a3b8", transition: "all .15s" }}>
              {f}
            </button>
          ))}
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: GOLD, color: "#000", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
          <Plus size={14} /> Create Campaign
        </button>
      </div>

      {/* table */}
      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Campaign", "Type", "Status", "Sent", "Open Rate", "Click Rate", "Revenue"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <motion.tr key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{c.name}</td>
                <td style={{ padding: "12px 16px" }}><span style={badge("#94a3b8")}>{c.type}</span></td>
                <td style={{ padding: "12px 16px" }}><span style={badge(statusColor[c.status] ?? "#64748b")}>{c.status}</span></td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "#94a3b8" }}>{c.sent > 0 ? c.sent.toLocaleString() : "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: c.openRate > 0 ? EMERALD : "#475569", fontWeight: 600 }}>{c.openRate > 0 ? `${c.openRate}%` : "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: c.clickRate > 0 ? GOLD : "#475569", fontWeight: 600 }}>{c.clickRate > 0 ? `${c.clickRate}%` : "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: c.revenue > 0 ? "#a78bfa" : "#475569", fontWeight: 600 }}>{c.revenue > 0 ? `$${c.revenue.toLocaleString()}` : "—"}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FORMS tab ───────────────────────────────────────────────────────────────
function FormsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: GOLD, color: "#000", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
          <Plus size={14} /> Create Form
        </button>
      </div>

      {/* form grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {forms.map((f, i) => (
          <motion.div key={f.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
            style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={16} style={{ color: GOLD }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{f.name}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{f.submissions.toLocaleString()}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>Submissions</p>
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: EMERALD }}>{f.conversion}%</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>Conversion Rate</p>
              </div>
            </div>

            {/* fake form preview */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 12, marginBottom: 14, border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Form Preview</p>
              {["Full Name", "Email Address", f.name === "Demo Request" ? "Company" : "Phone"].map(field => (
                <div key={field} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 10px", marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: "#475569" }}>{field}</p>
                </div>
              ))}
              <div style={{ background: GOLD, borderRadius: 6, padding: "7px 14px", textAlign: "center", marginTop: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#000" }}>Submit</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 7, background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontSize: 12, fontWeight: 600, border: `1px solid ${BORDER}`, cursor: "pointer" }}>
                <Eye size={12} /> View
              </button>
              <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 7, background: `${GOLD}22`, color: GOLD, fontSize: 12, fontWeight: 600, border: `1px solid ${GOLD}44`, cursor: "pointer" }}>
                <Edit2 size={12} /> Edit
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── A/B TESTING tab ─────────────────────────────────────────────────────────
function ABTestingTab() {
  const maxRate = Math.max(...abTests.flatMap(t => [t.variantA.openRate, t.variantB.openRate]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        <StatCard label="Tests Running"      value={abTests.filter(t => t.status === "Running").length}   icon={FlaskConical} color={GOLD}    />
        <StatCard label="Avg Improvement"    value="14.6%"                                                icon={ArrowUp}      color={EMERALD} />
        <StatCard label="Winning Variants"   value={abTests.filter(t => t.status === "Completed").length} icon={Award}        color="#7C3AED" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: GOLD, color: "#000", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
          <Plus size={14} /> Create New Test
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {abTests.map((test, i) => (
          <motion.div key={test.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{test.name}</p>
                <span style={badge(test.status === "Running" ? GOLD : EMERALD)}>{test.status}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${EMERALD}22`, border: `1px solid ${EMERALD}44`, borderRadius: 8, padding: "6px 12px" }}>
                <CheckCircle size={13} style={{ color: EMERALD }} />
                <p style={{ fontSize: 12, fontWeight: 700, color: EMERALD }}>Variant {test.winner} Winning</p>
              </div>
            </div>

            {(["A", "B"] as const).map(v => {
              const variant = v === "A" ? test.variantA : test.variantB;
              const isWinner = test.winner === v;
              const pct = (variant.openRate / maxRate) * 100;
              return (
                <div key={v} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...badge(isWinner ? EMERALD : "#64748b"), fontSize: 10 }}>Variant {v}</span>
                      <p style={{ fontSize: 13, color: "#94a3b8" }}>{variant.label}</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isWinner ? EMERALD : "#64748b" }}>{variant.openRate}%</p>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 + 0.2 }}
                      style={{ height: "100%", borderRadius: 4, background: isWinner ? EMERALD : "#334155" }} />
                  </div>
                </div>
              );
            })}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── SMS & PUSH tab ──────────────────────────────────────────────────────────
function SMSPushTab() {
  const [smsText, setSmsText] = useState("");
  const [audience, setAudience] = useState("All Contacts");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* SMS composer */}
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <MessageSquare size={15} style={{ color: GOLD }} /> SMS Composer
          </p>

          {/* audience */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Audience</p>
            <div style={{ position: "relative" }}>
              <select value={audience} onChange={e => setAudience(e.target.value)}
                style={{ width: "100%", padding: "8px 32px 8px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#e2e8f0", fontSize: 13, appearance: "none", cursor: "pointer" }}>
                {["All Contacts", "New Leads", "Active Customers", "VIP Segment", "Churned Users"].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
            </div>
          </div>

          {/* message */}
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Message</p>
            <textarea value={smsText} onChange={e => setSmsText(e.target.value.slice(0, 160))} rows={4} placeholder="Type your SMS message…"
              style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#e2e8f0", fontSize: 13, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: smsText.length > 140 ? "#ef4444" : "#64748b" }}>{smsText.length}/160 characters</p>
            <div style={{ width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${(smsText.length / 160) * 100}%`, height: "100%", background: smsText.length > 140 ? "#ef4444" : GOLD, transition: "width .1s, background .1s", borderRadius: 2 }} />
            </div>
          </div>
          <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 8, background: GOLD, color: "#000", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
            <Send size={13} /> Send SMS Blast
          </button>
        </div>

        {/* Push composer */}
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone size={15} style={{ color: EMERALD }} /> Push Notification
          </p>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Title</p>
            <input placeholder="Notification title…" style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Body</p>
            <textarea rows={4} placeholder="Notification body…"
              style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#e2e8f0", fontSize: 13, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 8, background: EMERALD, color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
            <Send size={13} /> Send Push Notification
          </button>
        </div>
      </div>

      {/* SMS campaigns */}
      <div style={{ ...card, padding: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>SMS Campaigns</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Campaign", "Recipients", "Delivery Rate", "Response Rate"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {smsCampaigns.map((c, i) => (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{c.name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8" }}>{c.recipients.toLocaleString()}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: EMERALD, fontWeight: 600 }}>{c.delivery}%</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: GOLD, fontWeight: 600 }}>{c.response}%</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Push campaigns */}
      <div style={{ ...card, padding: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>Push Notification Campaigns</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Campaign", "Recipients", "Delivery Rate", "Response Rate"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pushCampaigns.map((c, i) => (
              <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{c.name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "#94a3b8" }}>{c.recipients.toLocaleString()}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: EMERALD, fontWeight: 600 }}>{c.delivery}%</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: GOLD, fontWeight: 600 }}>{c.response}%</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ANALYTICS tab ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const maxRev = Math.max(...channelRevenue.map(c => c.revenue));
  const totalSpend = 28400;
  const totalRevenue = channelRevenue.reduce((s, c) => s + c.revenue, 0);
  const roas = (totalRevenue / totalSpend).toFixed(2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* bar chart */}
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 18 }}>Revenue by Channel</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {channelRevenue.map((ch, i) => (
              <div key={ch.channel}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>{ch.channel}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ch.color }}>${ch.revenue.toLocaleString()}</p>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(ch.revenue / maxRev) * 100}%` }}
                    transition={{ duration: 0.9, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                    style={{ height: "100%", borderRadius: 5, background: ch.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* funnel */}
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 18 }}>Conversion Funnel</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {funnelSteps.map((step, i) => {
              const w = `${step.pct === 100 ? 100 : Math.max(step.pct * 4, 8)}%`;
              const colors = [GOLD, "#0EA5E9", "#7C3AED", EMERALD];
              return (
                <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: "100%", maxWidth: w, height: 32, borderRadius: 6, background: `${colors[i]}22`, border: `1px solid ${colors[i]}44`, display: "flex", alignItems: "center", paddingLeft: 10, transition: "max-width .5s" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: colors[i], whiteSpace: "nowrap" }}>{step.label}</p>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", flexShrink: 0 }}>{step.value.toLocaleString()} <span style={{ color: colors[i] }}>({step.pct}%)</span></p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* top campaigns + ROI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* top campaigns */}
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>Top Performing Campaigns</p>
          {campaigns.filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? `1px solid ${BORDER}` : undefined }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>{i + 1}</p>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{c.name}</p>
                <p style={{ fontSize: 11, color: "#64748b" }}>{c.type} · {c.openRate}% open rate</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: EMERALD, flexShrink: 0 }}>${c.revenue.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* ROI calculator */}
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Target size={15} style={{ color: GOLD }} /> ROI Calculator
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Total Spend",    value: `$${totalSpend.toLocaleString()}`,    color: "#ef4444" },
              { label: "Total Revenue",  value: `$${totalRevenue.toLocaleString()}`,  color: EMERALD   },
              { label: "Net Profit",     value: `$${(totalRevenue - totalSpend).toLocaleString()}`, color: "#a78bfa" },
              { label: "ROAS",           value: `${roas}x`,                           color: GOLD      },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 13, color: "#94a3b8" }}>{row.label}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: row.color }}>{row.value}</p>
              </div>
            ))}
            <div style={{ marginTop: 4, padding: "12px 14px", borderRadius: 8, background: `${GOLD}11`, border: `1px solid ${GOLD}33` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Activity size={13} style={{ color: GOLD }} />
                <p style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>For every $1 spent, you earn ${roas} back</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Marketing() {
  const [activeTab, setActiveTab] = useState<Tab>("Campaigns");

  const tabIcons: Record<Tab, React.ElementType> = {
    "Campaigns":             Megaphone,
    "Forms & Landing Pages": FileText,
    "A/B Testing":           FlaskConical,
    "SMS & Push":            Smartphone,
    "Analytics":             BarChart2,
  };

  return (
    <div style={{ minHeight: "100%", background: BG, padding: "24px 28px", fontFamily: "inherit" }}>
      {/* header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Megaphone size={20} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>Marketing Hub</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Campaigns, automation, and growth analytics</p>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {tabs.map(tab => {
          const Icon = tabIcons[tab];
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all .15s",
                background: isActive ? GOLD : "transparent", color: isActive ? "#000" : "#94a3b8" }}>
              <Icon size={13} />
              {tab}
            </button>
          );
        })}
      </div>

      {/* tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {activeTab === "Campaigns"             && <CampaignsTab />}
          {activeTab === "Forms & Landing Pages" && <FormsTab />}
          {activeTab === "A/B Testing"           && <ABTestingTab />}
          {activeTab === "SMS & Push"            && <SMSPushTab />}
          {activeTab === "Analytics"             && <AnalyticsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
