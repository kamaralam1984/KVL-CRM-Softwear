"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Ticket, MessageCircle, BookOpen, BarChart3,
  Search, Plus, Filter, ChevronDown, X, Send, Paperclip,
  Clock, CheckCircle2, AlertCircle, AlertTriangle, Info,
  Star, TrendingUp, Users, Headphones, ArrowUpRight,
  MoreHorizontal, Tag, UserCircle, Phone, Mail,
  ThumbsUp, Zap, FileText, ChevronRight, Circle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type Priority = "Critical" | "High" | "Medium" | "Low";
type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

interface Ticket {
  id: string;
  subject: string;
  customer: string;
  email: string;
  priority: Priority;
  status: TicketStatus;
  assignee: string;
  created: string;
  lastUpdate: string;
  category: string;
  messages: Message[];
  previousTickets: number;
  plan: string;
}

interface Message {
  id: string;
  sender: "customer" | "agent";
  name: string;
  text: string;
  time: string;
}

interface ChatSession {
  id: string;
  customer: string;
  status: "active" | "waiting";
  waitTime?: string;
  lastMsg: string;
  time: string;
}

// ── Demo Data ──────────────────────────────────────────────────────────────
const TICKETS: Ticket[] = [
  {
    id: "TKT-1001",
    subject: "Cannot access WhatsApp integration",
    customer: "Riya Sharma",
    email: "riya@acme.io",
    priority: "Critical",
    status: "Open",
    assignee: "Ananya K.",
    created: "2h ago",
    lastUpdate: "45m ago",
    category: "Integrations",
    previousTickets: 3,
    plan: "Pro",
    messages: [
      { id: "m1", sender: "customer", name: "Riya Sharma", text: "Hi, I'm unable to access the WhatsApp integration. The page just shows a spinner and never loads. This is urgent as we use it daily.", time: "2h ago" },
      { id: "m2", sender: "agent", name: "Ananya K.", text: "Hi Riya, sorry to hear that! I'm looking into this right now. Can you share your browser console errors if any?", time: "1h 50m ago" },
      { id: "m3", sender: "customer", name: "Riya Sharma", text: "Sure, I see: 'Failed to fetch: 403 Forbidden' in the console.", time: "1h 30m ago" },
      { id: "m4", sender: "agent", name: "Ananya K.", text: "Got it — this looks like an API key rotation issue on our end. Escalating to the backend team now. ETA 30 minutes.", time: "1h ago" },
    ],
  },
  {
    id: "TKT-1002",
    subject: "Invoice not generating automatically",
    customer: "Karan Mehta",
    email: "karan@techventures.co",
    priority: "High",
    status: "In Progress",
    assignee: "Dev P.",
    created: "5h ago",
    lastUpdate: "2h ago",
    category: "Finance",
    previousTickets: 1,
    plan: "Starter",
    messages: [
      { id: "m1", sender: "customer", name: "Karan Mehta", text: "Our invoices stopped auto-generating after the last update. We need this fixed ASAP.", time: "5h ago" },
      { id: "m2", sender: "agent", name: "Dev P.", text: "Hi Karan, I've reproduced the issue. It's related to the automation trigger. Working on a hotfix.", time: "3h ago" },
    ],
  },
  {
    id: "TKT-1003",
    subject: "How to set up automation workflow?",
    customer: "Priya Nair",
    email: "priya@bloom.in",
    priority: "Medium",
    status: "Open",
    assignee: "Sonal T.",
    created: "1d ago",
    lastUpdate: "8h ago",
    category: "Automation",
    previousTickets: 0,
    plan: "Pro",
    messages: [
      { id: "m1", sender: "customer", name: "Priya Nair", text: "I'm new to KVl CRM. How do I set up an automation workflow to send follow-up emails?", time: "1d ago" },
      { id: "m2", sender: "agent", name: "Sonal T.", text: "Hi Priya! Great question. Head to Automation > New Workflow. I'll share a video guide shortly.", time: "20h ago" },
    ],
  },
  {
    id: "TKT-1004",
    subject: "Team member cannot login",
    customer: "Arjun Bose",
    email: "arjun@nexaworks.com",
    priority: "High",
    status: "Resolved",
    assignee: "Ananya K.",
    created: "2d ago",
    lastUpdate: "1d ago",
    category: "Access",
    previousTickets: 2,
    plan: "Pro",
    messages: [
      { id: "m1", sender: "customer", name: "Arjun Bose", text: "One of our team members is locked out. Can you reset their access?", time: "2d ago" },
      { id: "m2", sender: "agent", name: "Ananya K.", text: "Done! I've reset their credentials and sent a password reset email.", time: "1d 22h ago" },
      { id: "m3", sender: "customer", name: "Arjun Bose", text: "Works perfectly now. Thanks!", time: "1d ago" },
    ],
  },
  {
    id: "TKT-1005",
    subject: "Export to CSV not working",
    customer: "Meera Joshi",
    email: "meera@clover.in",
    priority: "Low",
    status: "Open",
    assignee: "Raj M.",
    created: "3d ago",
    lastUpdate: "2d ago",
    category: "Export",
    previousTickets: 0,
    plan: "Starter",
    messages: [
      { id: "m1", sender: "customer", name: "Meera Joshi", text: "The CSV export button does nothing when I click it. No download starts.", time: "3d ago" },
      { id: "m2", sender: "agent", name: "Raj M.", text: "Hi Meera, we're aware of this issue with large datasets. A fix is scheduled for the next release.", time: "2d ago" },
    ],
  },
  {
    id: "TKT-1006",
    subject: "Dashboard loading slowly after update",
    customer: "Vikram Singh",
    email: "vikram@globaledge.io",
    priority: "Medium",
    status: "In Progress",
    assignee: "Dev P.",
    created: "4d ago",
    lastUpdate: "3d ago",
    category: "Performance",
    previousTickets: 1,
    plan: "Enterprise",
    messages: [
      { id: "m1", sender: "customer", name: "Vikram Singh", text: "Dashboard takes 8-10 seconds to load since the last update.", time: "4d ago" },
    ],
  },
  {
    id: "TKT-1007",
    subject: "API rate limit exceeded unexpectedly",
    customer: "Neha Kapoor",
    email: "neha@startupx.co",
    priority: "High",
    status: "Open",
    assignee: "Sonal T.",
    created: "1d ago",
    lastUpdate: "6h ago",
    category: "API",
    previousTickets: 4,
    plan: "Pro",
    messages: [
      { id: "m1", sender: "customer", name: "Neha Kapoor", text: "We're hitting rate limits even though we're well below our plan's quota.", time: "1d ago" },
    ],
  },
  {
    id: "TKT-1008",
    subject: "Bulk import contacts failing",
    customer: "Suresh Rao",
    email: "suresh@vendorpro.in",
    priority: "Medium",
    status: "Resolved",
    assignee: "Raj M.",
    created: "5d ago",
    lastUpdate: "4d ago",
    category: "Import",
    previousTickets: 0,
    plan: "Starter",
    messages: [
      { id: "m1", sender: "customer", name: "Suresh Rao", text: "Bulk import errors out at row 500.", time: "5d ago" },
      { id: "m2", sender: "agent", name: "Raj M.", text: "Fixed! There was a 500-row limit bug. Now supports up to 10,000 rows.", time: "4d ago" },
    ],
  },
  {
    id: "TKT-1009",
    subject: "Custom fields not saving",
    customer: "Divya Patel",
    email: "divya@crafthouse.com",
    priority: "Medium",
    status: "Closed",
    assignee: "Ananya K.",
    created: "7d ago",
    lastUpdate: "5d ago",
    category: "Settings",
    previousTickets: 2,
    plan: "Pro",
    messages: [
      { id: "m1", sender: "customer", name: "Divya Patel", text: "Custom fields in the contact form don't persist after saving.", time: "7d ago" },
    ],
  },
  {
    id: "TKT-1010",
    subject: "Email template images broken",
    customer: "Rohit Verma",
    email: "rohit@brandcraft.io",
    priority: "Low",
    status: "Closed",
    assignee: "Sonal T.",
    created: "8d ago",
    lastUpdate: "7d ago",
    category: "Email",
    previousTickets: 1,
    plan: "Pro",
    messages: [
      { id: "m1", sender: "customer", name: "Rohit Verma", text: "Images in email templates show broken links.", time: "8d ago" },
    ],
  },
];

const CHAT_SESSIONS: ChatSession[] = [
  { id: "c1", customer: "Anjali R.", status: "active", lastMsg: "Can you help me set up pipelines?", time: "now" },
  { id: "c2", customer: "Mohan D.", status: "active", lastMsg: "Invoice amount seems wrong...", time: "3m" },
  { id: "c3", customer: "Sunita V.", status: "active", lastMsg: "How do I add team members?", time: "7m" },
  { id: "c4", customer: "Farhan K.", status: "waiting", waitTime: "2m", lastMsg: "Waiting for agent...", time: "2m" },
  { id: "c5", customer: "Deepa N.", status: "waiting", waitTime: "5m", lastMsg: "Waiting for agent...", time: "5m" },
  { id: "c6", customer: "Anil P.", status: "waiting", waitTime: "8m", lastMsg: "Waiting for agent...", time: "8m" },
];

const CANNED_RESPONSES = [
  "Thank you for reaching out! I'll look into this right away.",
  "Could you please share more details or a screenshot?",
  "I'm escalating this to our technical team. ETA: 30 minutes.",
  "This issue has been resolved. Please refresh and try again.",
  "Our team is aware of this and a fix is in the next release.",
];

const KB_CATEGORIES = [
  { name: "Getting Started", count: 12, icon: "🚀" },
  { name: "Features", count: 24, icon: "⚡" },
  { name: "Billing", count: 8, icon: "💳" },
  { name: "Troubleshooting", count: 15, icon: "🔧" },
];

const FEATURED_ARTICLES = [
  "How to set up your first automation workflow",
  "Connecting WhatsApp CRM to your account",
  "Understanding the Sales Pipeline view",
  "Importing bulk contacts via CSV",
  "Setting up team roles and permissions",
];

const AGENTS = [
  { name: "Ananya K.", resolved: 34, avgTime: "1.8h", csat: 4.9, avatar: "AK" },
  { name: "Dev P.",    resolved: 28, avgTime: "2.1h", csat: 4.7, avatar: "DP" },
  { name: "Sonal T.", resolved: 22, avgTime: "2.6h", csat: 4.6, avatar: "ST" },
  { name: "Raj M.",   resolved: 19, avgTime: "3.2h", csat: 4.4, avatar: "RM" },
];

const ACTIVITY = [
  { icon: <AlertCircle size={13} />, color: "#ef4444", text: "TKT-1001 escalated — WhatsApp integration down", time: "45m ago" },
  { icon: <CheckCircle2 size={13} />, color: "#00A86B", text: "TKT-1004 resolved by Ananya K.", time: "1h ago" },
  { icon: <Plus size={13} />, color: "#D4AF37", text: "TKT-1007 opened by Neha Kapoor", time: "6h ago" },
  { icon: <CheckCircle2 size={13} />, color: "#00A86B", text: "TKT-1008 resolved by Raj M.", time: "4h ago" },
  { icon: <AlertTriangle size={13} />, color: "#f97316", text: "TKT-1002 priority upgraded to High", time: "2h ago" },
];

const WEEKLY_VOLUME = [42, 38, 55, 47, 61, 53, 44];
const WEEKLY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TOP_CATEGORIES = [
  { label: "Integrations", pct: 28, color: "#ef4444" },
  { label: "Finance", pct: 22, color: "#f97316" },
  { label: "Access", pct: 18, color: "#D4AF37" },
  { label: "Automation", pct: 16, color: "#00A86B" },
  { label: "Other", pct: 16, color: "#6366f1" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string }> = {
  Critical: { bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.35)" },
  High:     { bg: "rgba(249,115,22,0.15)", text: "#fb923c", border: "rgba(249,115,22,0.35)" },
  Medium:   { bg: "rgba(212,175,55,0.15)", text: "#D4AF37", border: "rgba(212,175,55,0.35)" },
  Low:      { bg: "rgba(0,168,107,0.15)", text: "#00A86B", border: "rgba(0,168,107,0.35)" },
};

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string }> = {
  Open:        { bg: "rgba(99,102,241,0.15)", text: "#818cf8" },
  "In Progress": { bg: "rgba(212,175,55,0.15)", text: "#D4AF37" },
  Resolved:    { bg: "rgba(0,168,107,0.15)", text: "#00A86B" },
  Closed:      { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
};

function PriorityBadge({ p }: { p: Priority }) {
  const c = PRIORITY_COLORS[p];
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {p}
    </span>
  );
}

function StatusBadge({ s }: { s: TicketStatus }) {
  const c = STATUS_COLORS[s];
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}>
      {s}
    </span>
  );
}

// ── Tab: Dashboard ─────────────────────────────────────────────────────────
function DashboardTab() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Open Tickets", value: "24", icon: <Ticket size={18} />, color: "#6366f1" },
          { label: "Resolved Today", value: "18", icon: <CheckCircle2 size={18} />, color: "#00A86B" },
          { label: "Avg Response", value: "2.4h", icon: <Clock size={18} />, color: "#D4AF37" },
          { label: "CSAT Score", value: "4.7/5", icon: <Star size={18} />, color: "#f97316" },
        ].map((s) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 border"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}20`, color: s.color }}>
                {s.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-100">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Priority Breakdown */}
        <div className="rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Priority Breakdown</h3>
          <div className="space-y-2">
            {(["Critical", "High", "Medium", "Low"] as Priority[]).map((p, i) => {
              const counts: Record<Priority, number> = { Critical: 2, High: 7, Medium: 10, Low: 5 };
              const c = PRIORITY_COLORS[p];
              return (
                <div key={p} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                      {p}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-200">{counts[p]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-2 rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {ACTIVITY.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${a.color}20`, color: a.color }}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">{a.text}</p>
                </div>
                <span className="text-[10px] text-slate-600 whitespace-nowrap">{a.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Agent Performance</h3>
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <th className="text-left pb-2">Agent</th>
              <th className="text-right pb-2">Tickets Resolved</th>
              <th className="text-right pb-2">Avg Time</th>
              <th className="text-right pb-2">CSAT</th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((a, i) => (
              <tr key={a.name} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#006B3C,#00843D)" }}>
                      {a.avatar}
                    </div>
                    <span className="text-sm text-slate-200">{a.name}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right text-sm font-semibold text-slate-200">{a.resolved}</td>
                <td className="py-2.5 text-right text-sm text-slate-400">{a.avgTime}</td>
                <td className="py-2.5 text-right">
                  <span className="text-sm font-semibold" style={{ color: "#D4AF37" }}>
                    ★ {a.csat}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Tickets ───────────────────────────────────────────────────────────
function TicketsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [noteTab, setNoteTab] = useState<"thread" | "notes">("thread");
  const [replyText, setReplyText] = useState("");

  const statusTabs = ["All", "Open", "In Progress", "Resolved", "Closed"];

  const filtered = TICKETS.filter((t) => {
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchPriority = priorityFilter === "All" || t.priority === priorityFilter;
    const matchSearch = search === "" || t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  return (
    <div className="flex gap-4 h-full">
      {/* Left: ticket list */}
      <div className={`flex flex-col gap-3 ${selectedTicket ? "w-[55%]" : "w-full"} transition-all duration-300`}>
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusTabs.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background: statusFilter === s ? "#D4AF37" : "rgba(255,255,255,0.05)",
                color: statusFilter === s ? "#080c14" : "#94a3b8",
              }}>
              {s}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border outline-none"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#94a3b8" }}>
              {["All", "Critical", "High", "Medium", "Low"].map((p) => (
                <option key={p} value={p} style={{ background: "#0d1424" }}>{p}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
              <Search size={13} className="text-slate-500" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none w-36" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
                <th className="text-left px-3 py-2.5">#</th>
                <th className="text-left px-3 py-2.5">Subject</th>
                <th className="text-left px-3 py-2.5">Customer</th>
                <th className="text-left px-3 py-2.5">Priority</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">Assignee</th>
                <th className="text-left px-3 py-2.5">Created</th>
                <th className="text-left px-3 py-2.5">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <motion.tr key={t.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setSelectedTicket(t)}
                  className="border-b cursor-pointer transition-colors"
                  style={{
                    borderColor: "rgba(255,255,255,0.04)",
                    background: selectedTicket?.id === t.id ? "rgba(212,175,55,0.06)" : undefined,
                  }}
                  whileHover={{ background: "rgba(255,255,255,0.04)" }}>
                  <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{t.id}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-xs text-slate-200 font-medium max-w-[160px] truncate">{t.subject}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{t.customer}</td>
                  <td className="px-3 py-2.5"><PriorityBadge p={t.priority} /></td>
                  <td className="px-3 py-2.5"><StatusBadge s={t.status} /></td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{t.assignee}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{t.created}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{t.lastUpdate}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-sm">No tickets match your filters.</div>
          )}
        </div>
      </div>

      {/* Right: ticket detail */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            key={selectedTicket.id}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex-1 rounded-xl border flex flex-col overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-start justify-between gap-3"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-500">{selectedTicket.id}</span>
                  <PriorityBadge p={selectedTicket.priority} />
                  <StatusBadge s={selectedTicket.status} />
                </div>
                <p className="text-sm font-semibold text-slate-100">{selectedTicket.subject}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                <X size={15} />
              </button>
            </div>

            {/* Customer info */}
            <div className="px-4 py-2 border-b flex items-center gap-4"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2">
                <UserCircle size={14} className="text-slate-500" />
                <span className="text-xs text-slate-300">{selectedTicket.customer}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-slate-500" />
                <span className="text-xs text-slate-400">{selectedTicket.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag size={13} className="text-slate-500" />
                <span className="text-xs text-slate-400">{selectedTicket.plan} plan</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Ticket size={13} className="text-slate-500" />
                <span className="text-xs text-slate-400">{selectedTicket.previousTickets} prev tickets</span>
              </div>
            </div>

            {/* Thread/Notes tabs */}
            <div className="flex border-b px-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["thread", "notes"] as const).map((t) => (
                <button key={t} onClick={() => setNoteTab(t)}
                  className="text-xs py-2 mr-4 capitalize font-medium transition-colors"
                  style={{
                    color: noteTab === t ? "#D4AF37" : "#64748b",
                    borderBottom: noteTab === t ? "2px solid #D4AF37" : "2px solid transparent",
                  }}>
                  {t === "thread" ? "Conversation" : "Internal Notes"}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {noteTab === "thread" ? selectedTicket.messages.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.sender === "agent" ? "flex-row-reverse" : ""}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: m.sender === "agent" ? "linear-gradient(135deg,#006B3C,#00843D)" : "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className={`max-w-[80%] ${m.sender === "agent" ? "items-end" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-slate-400">{m.name}</span>
                      <span className="text-[10px] text-slate-600">{m.time}</span>
                    </div>
                    <div className="rounded-xl px-3 py-2 text-xs text-slate-200 leading-relaxed"
                      style={{
                        background: m.sender === "agent" ? "rgba(0,168,107,0.12)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${m.sender === "agent" ? "rgba(0,168,107,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                      {m.text}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center text-slate-600 text-xs">No internal notes yet.</div>
              )}
            </div>

            {/* Reply */}
            <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-2">
                {["Assign", "Escalate", "Close", "Add Note"].map((action) => (
                  <button key={action}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#D4AF37")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}>
                    {action}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 text-xs px-3 py-2 rounded-lg outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }} />
                <button className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all"
                  style={{ background: "#D4AF37", color: "#080c14" }}
                  onClick={() => setReplyText("")}>
                  <Send size={12} /> Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Live Chat ──────────────────────────────────────────────────────────
function LiveChatTab() {
  const [activeChat, setActiveChat] = useState<ChatSession>(CHAT_SESSIONS[0]);
  const [msg, setMsg] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const [isTyping] = useState(true);

  const activeSessions = CHAT_SESSIONS.filter((c) => c.status === "active");
  const waitingQueue = CHAT_SESSIONS.filter((c) => c.status === "waiting");

  return (
    <div className="flex gap-4 h-full">
      {/* Session list */}
      <div className="w-64 flex flex-col gap-3 flex-shrink-0">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active ({activeSessions.length})</p>
          <div className="space-y-1.5">
            {activeSessions.map((c) => (
              <button key={c.id} onClick={() => setActiveChat(c)}
                className="w-full text-left rounded-xl px-3 py-2.5 border transition-all"
                style={{
                  background: activeChat.id === c.id ? "rgba(0,168,107,0.1)" : "rgba(255,255,255,0.03)",
                  borderColor: activeChat.id === c.id ? "rgba(0,168,107,0.3)" : "rgba(255,255,255,0.07)",
                }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">{c.customer}</span>
                  <span className="text-[10px] text-slate-500">{c.time}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{c.lastMsg}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Queue ({waitingQueue.length})</p>
          <div className="space-y-1.5">
            {waitingQueue.map((c) => (
              <div key={c.id}
                className="rounded-xl px-3 py-2.5 border"
                style={{ background: "rgba(212,175,55,0.06)", borderColor: "rgba(212,175,55,0.15)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-300">{c.customer}</span>
                  <span className="text-[10px] font-semibold" style={{ color: "#D4AF37" }}>Wait: {c.waitTime}</span>
                </div>
                <button className="text-[11px] font-semibold mt-1" style={{ color: "#00A86B" }}
                  onClick={() => setActiveChat(c)}>
                  Accept Chat →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 rounded-xl border flex flex-col overflow-hidden"
        style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
              {activeChat.customer.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{activeChat.customer}</p>
              <p className="text-[11px]" style={{ color: "#00A86B" }}>● Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
              Transfer
            </button>
            <button className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
              End Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
              {activeChat.customer.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="rounded-xl rounded-tl-sm px-3 py-2 text-xs text-slate-200 max-w-xs"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {activeChat.lastMsg}
              </div>
              <p className="text-[10px] text-slate-600 mt-1">{activeChat.time}</p>
            </div>
          </div>
          {isTyping && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                {activeChat.customer.slice(0, 2).toUpperCase()}
              </div>
              <div className="rounded-xl px-3 py-2 flex gap-1"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
                ))}
              </div>
              <span className="text-[10px] text-slate-600">typing…</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t relative" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {showCanned && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full left-4 right-4 mb-2 rounded-xl border overflow-hidden"
              style={{ background: "#0d1424", borderColor: "rgba(255,255,255,0.1)" }}>
              {CANNED_RESPONSES.map((r, i) => (
                <button key={i} onClick={() => { setMsg(r); setShowCanned(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 border-b transition-colors hover:bg-white/5"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {r}
                </button>
              ))}
            </motion.div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCanned((p) => !p)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1"
              style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
              <Zap size={11} /> Canned
            </button>
            <input
              value={msg} onChange={(e) => setMsg(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-xs px-3 py-2 rounded-lg outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }} />
            <button className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
              style={{ background: "#00A86B", color: "#fff" }}
              onClick={() => setMsg("")}>
              <Send size={12} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Knowledge Base ────────────────────────────────────────────────────
function KnowledgeBaseTab() {
  const [kbSearch, setKbSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
        <Search size={16} className="text-slate-500" />
        <input
          value={kbSearch} onChange={(e) => setKbSearch(e.target.value)}
          placeholder="Search knowledge base articles..."
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none" />
      </div>

      {/* Categories */}
      <div className="grid grid-cols-4 gap-3">
        {KB_CATEGORIES.map((c) => (
          <motion.div key={c.name} whileHover={{ scale: 1.02 }}
            className="rounded-xl p-4 border cursor-pointer transition-all"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className="text-sm font-semibold text-slate-200">{c.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.count} articles</p>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Featured Articles</h3>
        <motion.button whileHover={{ scale: 1.03 }} onClick={() => setCreating((p) => !p)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: "#D4AF37", color: "#080c14" }}>
          <Plus size={13} /> Create Article
        </motion.button>
      </div>

      {/* Create Article editor */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(212,175,55,0.25)" }}>
            <div className="p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Article</p>
              <input
                value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Article title..."
                className="w-full text-sm px-3 py-2 rounded-lg outline-none font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }} />
              <textarea
                value={articleContent} onChange={(e) => setArticleContent(e.target.value)}
                placeholder="Write article content here..."
                rows={6}
                className="w-full text-xs px-3 py-2 rounded-lg outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }} />
              <div className="flex gap-2">
                <button className="text-xs px-4 py-1.5 rounded-lg font-semibold"
                  style={{ background: "#D4AF37", color: "#080c14" }}
                  onClick={() => { setCreating(false); setArticleTitle(""); setArticleContent(""); }}>
                  Publish
                </button>
                <button className="text-xs px-4 py-1.5 rounded-lg font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                  onClick={() => setCreating(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Featured articles list */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
        {FEATURED_ARTICLES.map((a, i) => (
          <motion.div key={i} whileHover={{ background: "rgba(255,255,255,0.04)" }}
            className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <FileText size={14} className="text-slate-500 flex-shrink-0" />
            <span className="text-sm text-slate-300 flex-1">{a}</span>
            <ChevronRight size={13} className="text-slate-600" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Reports ───────────────────────────────────────────────────────────
function ReportsTab() {
  const maxVolume = Math.max(...WEEKLY_VOLUME);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {/* Ticket Volume */}
        <div className="rounded-xl p-4 border"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Ticket Volume — Last 7 Days</h3>
          <div className="flex items-end gap-2 h-28">
            {WEEKLY_VOLUME.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500">{v}</span>
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${(v / maxVolume) * 100}%` }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="w-full rounded-t-md"
                  style={{ background: `linear-gradient(to top, #D4AF37, rgba(212,175,55,0.4))`, minHeight: 4 }} />
                <span className="text-[9px] text-slate-600">{WEEKLY_DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Time Trend */}
        <div className="rounded-xl p-4 border"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Resolution Time Trend (hrs)</h3>
          <div className="flex items-end gap-2 h-28">
            {[3.1, 2.8, 3.4, 2.6, 2.2, 2.5, 2.4].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500">{v}</span>
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${(v / 4) * 100}%` }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="w-full rounded-t-md"
                  style={{ background: "linear-gradient(to top, #00A86B, rgba(0,168,107,0.4))", minHeight: 4 }} />
                <span className="text-[9px] text-slate-600">{WEEKLY_DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Top Issue Categories */}
        <div className="rounded-xl p-4 border"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Issue Categories</h3>
          <div className="space-y-3">
            {TOP_CATEGORIES.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{c.label}</span>
                  <span className="text-xs font-semibold" style={{ color: c.color }}>{c.pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${c.pct}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Scorecard */}
        <div className="rounded-xl p-4 border"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Agent Performance Scorecard</h3>
          <div className="space-y-3">
            {AGENTS.map((a) => (
              <div key={a.name} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#006B3C,#00843D)" }}>
                  {a.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200">{a.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-slate-500">{a.resolved} resolved</span>
                    <span className="text-[10px] text-slate-500">{a.avgTime} avg</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={11} style={{ color: "#D4AF37", fill: "#D4AF37" }} />
                  <span className="text-xs font-bold" style={{ color: "#D4AF37" }}>{a.csat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={14} /> },
  { id: "tickets",   label: "Tickets",   icon: <Ticket size={14} /> },
  { id: "livechat",  label: "Live Chat", icon: <MessageCircle size={14} /> },
  { id: "kb",        label: "Knowledge Base", icon: <BookOpen size={14} /> },
  { id: "reports",   label: "Reports",   icon: <BarChart3 size={14} /> },
];

export default function KVlHelpdesk() {
  const [activeTab, setActiveTab] = useState("tickets");

  return (
    <div className="h-full flex flex-col p-6" style={{ background: "#080c14", color: "#e2e8f0" }}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>
              <Headphones size={16} />
            </div>
            <h1 className="text-lg font-bold text-slate-100">KVl Helpdesk</h1>
          </div>
          <p className="text-xs text-slate-500 pl-10">Customer support center — Zendesk-grade, KVl-powered</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(0,168,107,0.12)", color: "#00A86B", border: "1px solid rgba(0,168,107,0.2)" }}>
            <Circle size={8} style={{ fill: "#00A86B" }} /> Online
          </div>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: "#D4AF37", color: "#080c14" }}>
            <Plus size={13} /> New Ticket
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all relative"
            style={{ color: activeTab === tab.id ? "#D4AF37" : "#64748b" }}>
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "#D4AF37" }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="h-full">
            {activeTab === "dashboard" && <DashboardTab />}
            {activeTab === "tickets"   && <TicketsTab />}
            {activeTab === "livechat"  && <LiveChatTab />}
            {activeTab === "kb"        && <KnowledgeBaseTab />}
            {activeTab === "reports"   && <ReportsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
