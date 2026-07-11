"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, MessageCircle, FileText, Phone, FileCheck, TrendingUp,
  Copy, Send, Sparkles, ChevronDown, Loader2, Check, RefreshCw,
  User, Building2, DollarSign, Calendar, Clock, Users,
  BarChart2, AlertTriangle, ThumbsUp, Minus, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type TabId = "email" | "whatsapp" | "meeting" | "call" | "proposal" | "forecast";

// ─── Constants ───────────────────────────────────────────────────────────────
const GOLD = "#D4AF37";
const EMERALD = "#00A86B";
const BG = "#080c14";

const DEMO_LEADS = [
  { id: "l1", name: "Lisa Zhang", company: "HealthTech AI", deal: "$128K" },
  { id: "l2", name: "Alex Morgan", company: "TechNova Inc.", deal: "$45K" },
  { id: "l3", name: "Ryan O'Brien", company: "RetailPro", deal: "$67K" },
];

const EMAIL_TYPES = ["Follow-up", "Cold Outreach", "Proposal", "Reminder"];

const MEETING_ATTENDEES = [
  "Lisa Zhang + Team (3)",
  "Alex Morgan (1:1)",
  "Ryan O'Brien + Ops (2)",
];

const MEETING_TOPICS = ["Demo", "Pricing", "Objections", "Next Steps", "Technical Review", "Contract"];

const CALL_TYPES = ["Discovery", "Demo", "Negotiation", "Closing"];

const PROPOSAL_MODULES = [
  "CRM Core", "AI Insights", "Email Automation", "WhatsApp Integration",
  "Analytics Dashboard", "Custom Integrations", "Dedicated Support",
];

const FORECAST_PERIODS = ["This Month", "This Quarter", "This Year"];

// ─── Tab config ──────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "email",    label: "Email Writer",       icon: Mail },
  { id: "whatsapp", label: "WhatsApp Reply",      icon: MessageCircle },
  { id: "meeting",  label: "Meeting Notes",       icon: FileText },
  { id: "call",     label: "Call Summary",        icon: Phone },
  { id: "proposal", label: "Proposal Generator",  icon: FileCheck },
  { id: "forecast", label: "Sales Forecast",      icon: TrendingUp },
];

// ─── Shared UI pieces ────────────────────────────────────────────────────────
function GoldButton({
  onClick, loading, children, className = "",
}: {
  onClick: () => void;
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#080c14] transition-all disabled:opacity-60",
        className,
      )}
      style={{
        background: loading
          ? "rgba(212,175,55,0.5)"
          : `linear-gradient(135deg, ${GOLD}, #b8960c)`,
        boxShadow: loading ? "none" : `0 0 18px rgba(212,175,55,0.35)`,
      }}
    >
      {loading ? (
        <><Loader2 size={15} className="animate-spin" /> Generating…</>
      ) : (
        <><Sparkles size={15} /> {children}</>
      )}
    </motion.button>
  );
}

function OutputBox({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-xl border p-4 overflow-hidden"
          style={{
            borderColor: `rgba(212,175,55,0.45)`,
            background: "rgba(212,175,55,0.04)",
            boxShadow: `0 0 20px rgba(212,175,55,0.08)`,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-slate-400 mb-1.5">{children}</p>;
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 border border-white/10 bg-white/[0.05] focus:outline-none focus:border-yellow-500/50 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0f172a]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 border border-white/10 bg-white/[0.05] placeholder-slate-600 focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
    />
  );
}

function Input({
  value, onChange, placeholder, type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 border border-white/10 bg-white/[0.05] placeholder-slate-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
    />
  );
}

// ─── 1. Email Writer ──────────────────────────────────────────────────────────
function EmailWriter() {
  const [leadId, setLeadId] = useState("l1");
  const [emailType, setEmailType] = useState("Follow-up");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const lead = DEMO_LEADS.find((l) => l.id === leadId)!;

  const EMAILS: Record<string, { subject: string; body: string }> = {
    "Follow-up": {
      subject: `Following up on our conversation — ${lead.company}`,
      body: `Hi ${lead.name.split(" ")[0]},\n\nI hope you're having a great week! I wanted to follow up on our recent conversation about how our CRM platform can help ${lead.company} streamline your sales pipeline.\n\nBased on your team's goals, I believe our AI Insights module could help you identify high-value opportunities faster and reduce manual follow-up time by up to 40%.\n\nWould you be open to a 20-minute call this week to explore the specifics? I have availability on Thursday or Friday afternoon.\n\nLooking forward to connecting,\n\nBest regards,\nYour Name`,
    },
    "Cold Outreach": {
      subject: `${lead.company} × [Your Company] — Increase Revenue by 30%`,
      body: `Hi ${lead.name.split(" ")[0]},\n\nI came across ${lead.company} and was impressed by your recent growth in the market. Companies like yours are using our AI-powered CRM to close deals 2× faster.\n\nHere's what we've delivered for similar teams:\n• 35% increase in qualified pipeline\n• 22% reduction in sales cycle length\n• Real-time AI lead scoring\n\nI'd love to show you a 15-minute personalized demo — no pitch, just value.\n\nAre you free next Tuesday or Wednesday?\n\nBest,\nYour Name`,
    },
    Proposal: {
      subject: `Proposal for ${lead.company} — CRM Solution (${lead.deal})`,
      body: `Hi ${lead.name.split(" ")[0]},\n\nThank you for the productive conversations we've had. As promised, I've prepared a tailored proposal for ${lead.company}.\n\n📋 EXECUTIVE SUMMARY\nBased on your requirements, we propose a comprehensive CRM implementation valued at ${lead.deal}, covering AI-powered sales automation, analytics, and onboarding support.\n\n🔑 KEY DELIVERABLES\n• Full CRM deployment within 2 weeks\n• Dedicated onboarding specialist\n• 90-day success guarantee\n• Monthly strategic reviews\n\nI've attached the full proposal document. Shall we schedule a call to walk through it together?\n\nWarm regards,\nYour Name`,
    },
    Reminder: {
      subject: `Quick reminder — ${lead.company} proposal expiring soon`,
      body: `Hi ${lead.name.split(" ")[0]},\n\nJust a friendly reminder that the proposal we sent for ${lead.company} is valid until end of this month.\n\nI know things get busy, so I wanted to make sure it doesn't slip through the cracks. Our team is ready to get started as soon as you give the green light.\n\nIf you have any questions or need adjustments, I'm happy to jump on a quick call.\n\nBest,\nYour Name`,
    },
  };

  function generate() {
    setLoading(true);
    setOutput(null);
    setTimeout(() => {
      setOutput(EMAILS[emailType]);
      setLoading(false);
    }, 1200);
  }

  function copyEmail() {
    if (!output) return;
    navigator.clipboard.writeText(`Subject: ${output.subject}\n\n${output.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Select Lead</Label>
          <Select
            value={leadId}
            onChange={setLeadId}
            options={DEMO_LEADS.map((l) => ({
              value: l.id,
              label: `${l.name} — ${l.company} (${l.deal})`,
            }))}
          />
        </div>
        <div>
          <Label>Email Type</Label>
          <Select
            value={emailType}
            onChange={setEmailType}
            options={EMAIL_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </div>
      </div>
      <GoldButton onClick={generate} loading={loading}>
        Generate Email
      </GoldButton>
      <OutputBox visible={!!output && !loading}>
        {output && (
          <div className="space-y-3">
            <div className="rounded-lg px-3 py-2 bg-white/[0.04] border border-white/[0.07]">
              <p className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider">Subject</p>
              <p className="text-sm font-semibold text-yellow-300">{output.subject}</p>
            </div>
            <div className="rounded-lg px-3 py-2 bg-white/[0.04] border border-white/[0.07]">
              <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Body</p>
              <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{output.body}</pre>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={copyEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/[0.06] transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy Email"}
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                <Send size={12} /> Send Now
              </button>
            </div>
          </div>
        )}
      </OutputBox>
    </div>
  );
}

// ─── 2. WhatsApp Reply ────────────────────────────────────────────────────────
function WhatsAppReply() {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const replies = [
    {
      tone: "Formal",
      color: "text-blue-400 border-blue-500/30 bg-blue-500/5",
      text: "Thank you for reaching out. I'd be happy to arrange a product demonstration at your earliest convenience. Please let me know your preferred date and time, and I will confirm accordingly.",
    },
    {
      tone: "Friendly",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
      text: "Hey! Great to hear from you 😊 Absolutely, let's set up a quick demo — it'll only take 20 mins and I think you'll love what we've built. When works best for you this week?",
    },
    {
      tone: "Follow-up",
      color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
      text: "Hi! Thanks for getting back to me. I just wanted to make sure we don't lose momentum — I've reserved a demo slot for Thursday 3pm. Does that work, or should I find another time?",
    },
  ];

  function generate() {
    setLoading(true);
    setOutput(false);
    setSelected(null);
    setTimeout(() => {
      setOutput(true);
      setLoading(false);
    }, 1200);
  }

  return (
    <div className="space-y-4">
      {/* Fake incoming message */}
      <div className="rounded-xl border border-white/10 p-4 bg-white/[0.03]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
            LZ
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">Lisa Zhang</p>
            <p className="text-[10px] text-slate-500">HealthTech AI · 2m ago</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            WhatsApp
          </div>
        </div>
        <div className="rounded-lg px-3 py-2 text-sm text-slate-300 inline-block"
          style={{ background: "rgba(37,211,102,0.08)", borderLeft: "3px solid #25D366" }}>
          Hi, I saw your message about the CRM demo. Sounds interesting! Can we schedule something for this week? Also, do you have pricing info you can share beforehand?
        </div>
      </div>

      <div>
        <Label>Additional Context (optional)</Label>
        <Textarea
          value={context}
          onChange={setContext}
          placeholder="Add context about this lead or your goals for the conversation…"
          rows={2}
        />
      </div>

      <GoldButton onClick={generate} loading={loading}>
        Generate 3 Reply Options
      </GoldButton>

      <OutputBox visible={output && !loading}>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Choose a reply tone</p>
        <div className="space-y-3">
          {replies.map((r, i) => (
            <motion.button
              key={r.tone}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelected(i)}
              className={cn(
                "w-full text-left rounded-xl border p-3 transition-all",
                r.color,
                selected === i ? "ring-2 ring-yellow-500/50" : "hover:bg-white/[0.04]",
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider">{r.tone}</span>
                {selected === i && <Check size={12} className="text-yellow-400" />}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{r.text}</p>
            </motion.button>
          ))}
        </div>
        {selected !== null && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/[0.06] transition-colors">
              <Copy size={12} /> Copy
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              style={{ borderColor: "#25D366", color: "#25D366" }}>
              <Send size={12} /> Send via WhatsApp
            </button>
          </div>
        )}
      </OutputBox>
    </div>
  );
}

// ─── 3. Meeting Notes ─────────────────────────────────────────────────────────
function MeetingNotes() {
  const [attendees, setAttendees] = useState(MEETING_ATTENDEES[0]);
  const [duration, setDuration] = useState("45");
  const [topics, setTopics] = useState<string[]>(["Demo", "Pricing"]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(false);

  function toggleTopic(t: string) {
    setTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function generate() {
    setLoading(true);
    setOutput(false);
    setTimeout(() => { setOutput(true); setLoading(false); }, 1200);
  }

  const lead = "Lisa Zhang";
  const company = "HealthTech AI";

  const actionItems = [
    `Send pricing deck to ${lead} by EOD tomorrow`,
    `Schedule technical deep-dive with ${company} engineering team`,
    `Prepare ROI analysis based on their current workflow`,
    topics.includes("Objections") ? "Address security compliance concerns in follow-up email" : null,
    topics.includes("Next Steps") ? "Set up 30-day trial account by Friday" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Duration (minutes)</Label>
          <Input value={duration} onChange={setDuration} type="number" placeholder="45" />
        </div>
        <div className="md:col-span-2">
          <Label>Attendees</Label>
          <Select
            value={attendees}
            onChange={setAttendees}
            options={MEETING_ATTENDEES.map((a) => ({ value: a, label: a }))}
          />
        </div>
      </div>
      <div>
        <Label>Topics Discussed</Label>
        <div className="flex flex-wrap gap-2">
          {MEETING_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTopic(t)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                topics.includes(t)
                  ? "border-yellow-500/50 text-yellow-300 bg-yellow-500/10"
                  : "border-white/10 text-slate-500 hover:text-slate-300",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <GoldButton onClick={generate} loading={loading}>
        Generate Meeting Notes
      </GoldButton>
      <OutputBox visible={output && !loading}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-yellow-300">Meeting Summary</h4>
            <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={10} /> {duration} min</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg p-2 bg-white/[0.04] border border-white/[0.06]">
              <p className="text-slate-500 mb-0.5">Date</p>
              <p className="text-slate-200 font-medium">Jun 2, 2026</p>
            </div>
            <div className="rounded-lg p-2 bg-white/[0.04] border border-white/[0.06]">
              <p className="text-slate-500 mb-0.5">Attendees</p>
              <p className="text-slate-200 font-medium">{attendees}</p>
            </div>
            <div className="rounded-lg p-2 bg-white/[0.04] border border-white/[0.06]">
              <p className="text-slate-500 mb-0.5">Topics</p>
              <p className="text-slate-200 font-medium">{topics.join(", ") || "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Key Discussion Points</p>
            <ul className="space-y-1.5">
              {topics.map((t) => (
                <li key={t} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: GOLD }} />
                  {t === "Demo" && "Product demo completed — strong positive reaction to AI Insights module and dashboard."}
                  {t === "Pricing" && `Pricing discussed: ${company} exploring the ${lead.split(" ")[0]}'s team's budget aligns with Growth plan.`}
                  {t === "Objections" && "Objection raised around data security and GDPR compliance — to be addressed in writing."}
                  {t === "Next Steps" && "Agreed on a 30-day pilot starting next week with 5 users."}
                  {t === "Technical Review" && "Technical architecture reviewed — API integration feasibility confirmed."}
                  {t === "Contract" && "Contract terms discussed — legal review expected within 5 business days."}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Action Items</p>
            <ul className="space-y-1.5">
              {actionItems.map((item, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="w-4 h-4 rounded border border-emerald-500/40 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(0,168,107,0.1)" }}>
                    <ArrowRight size={9} className="text-emerald-400" />
                  </div>
                  {item}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </OutputBox>
    </div>
  );
}

// ─── 4. Call Summary ──────────────────────────────────────────────────────────
function CallSummary() {
  const [duration, setDuration] = useState("28");
  const [callType, setCallType] = useState("Discovery");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(false);

  function generate() {
    setLoading(true);
    setOutput(false);
    setTimeout(() => { setOutput(true); setLoading(false); }, 1200);
  }

  const sentiments: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
    Discovery:   { label: "Positive",  color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: ThumbsUp },
    Demo:        { label: "Positive",  color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: ThumbsUp },
    Negotiation: { label: "Neutral",   color: "text-yellow-400",  bg: "bg-yellow-500/15 border-yellow-500/30",   icon: Minus },
    Closing:     { label: "Positive",  color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: ThumbsUp },
  };

  const summaries: Record<string, { points: string[]; objections: string[]; nextAction: string }> = {
    Discovery:   { points: ["Prospect confirmed pain points around lead tracking","Team of 12 sales reps currently using spreadsheets","Decision timeline: Q3 2026","Budget range confirmed at $50–80K"], objections: ["Concerned about migration complexity","Wants to see integration with existing HubSpot instance"], nextAction: "Send technical integration overview + schedule demo within 3 days" },
    Demo:        { points: ["Live demo completed for full product suite","AI Insights resonated strongly with VP of Sales","Analytics dashboard praised for real-time visibility","Competitor comparison requested"], objections: ["Pricing higher than current tool","Needs approval from CFO"], nextAction: "Prepare ROI calculator and CFO-facing business case document" },
    Negotiation: { points: ["Pricing discussion — requested 15% discount","Annual contract preferred over monthly","Onboarding timeline discussed: 2 weeks","References from similar companies requested"], objections: ["Budget constrained for this quarter","Legal review may delay signing"], nextAction: "Submit revised proposal with annual pricing + customer references by EOD" },
    Closing:     { points: ["All stakeholders aligned on go-ahead","Contract terms finalized","Kick-off call scheduled for next Monday","Onboarding team introduced"], objections: ["Minor clause on data portability to be updated"], nextAction: "Update contract clause, send DocuSign by tomorrow 9am" },
  };

  const s = sentiments[callType];
  const d = summaries[callType];
  const SentimentIcon = s.icon;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Call Duration (minutes)</Label>
          <Input value={duration} onChange={setDuration} type="number" placeholder="28" />
        </div>
        <div>
          <Label>Call Type</Label>
          <Select
            value={callType}
            onChange={setCallType}
            options={CALL_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </div>
      </div>
      <GoldButton onClick={generate} loading={loading}>
        Generate Call Summary
      </GoldButton>
      <OutputBox visible={output && !loading}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-yellow-300">{callType} Call Summary</h4>
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-slate-500" />
              <span className="text-xs text-slate-500">{duration} min</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Key Points</p>
            <ul className="space-y-1.5">
              {d.points.map((pt, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1 h-1 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                  {pt}
                </motion.li>
              ))}
            </ul>
          </div>
          {d.objections.length > 0 && (
            <div className="rounded-lg border border-rose-500/20 p-3 bg-rose-500/5">
              <p className="text-[10px] text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle size={10} /> Objections Raised
              </p>
              <ul className="space-y-1">
                {d.objections.map((o, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-rose-500 mt-0.5">•</span>{o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 rounded-lg border p-3 bg-white/[0.03]" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Next Action</p>
              <p className="text-xs text-slate-200 leading-relaxed">{d.nextAction}</p>
            </div>
            <div className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold flex-shrink-0", s.bg, s.color)}>
              <SentimentIcon size={13} />
              {s.label}
            </div>
          </div>
        </div>
      </OutputBox>
    </div>
  );
}

// ─── 5. Proposal Generator ───────────────────────────────────────────────────
function ProposalGenerator() {
  const [company, setCompany] = useState("HealthTech AI");
  const [dealValue, setDealValue] = useState("128000");
  const [modules, setModules] = useState<string[]>(["CRM Core", "AI Insights", "Email Automation"]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(false);

  function toggleModule(m: string) {
    setModules((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  function generate() {
    setLoading(true);
    setOutput(false);
    setTimeout(() => { setOutput(true); setLoading(false); }, 1200);
  }

  const formatted = Number(dealValue).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Company Name</Label>
          <Input value={company} onChange={setCompany} placeholder="HealthTech AI" />
        </div>
        <div>
          <Label>Deal Value (USD)</Label>
          <Input value={dealValue} onChange={setDealValue} type="number" placeholder="128000" />
        </div>
      </div>
      <div>
        <Label>Included Modules</Label>
        <div className="flex flex-wrap gap-2">
          {PROPOSAL_MODULES.map((m) => (
            <button
              key={m}
              onClick={() => toggleModule(m)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                modules.includes(m)
                  ? "border-yellow-500/50 text-yellow-300 bg-yellow-500/10"
                  : "border-white/10 text-slate-500 hover:text-slate-300",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <GoldButton onClick={generate} loading={loading}>
        Generate Proposal
      </GoldButton>
      <OutputBox visible={output && !loading}>
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center pb-3 border-b border-white/[0.07]">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Commercial Proposal</div>
            <h4 className="text-base font-black" style={{ color: GOLD }}>{company}</h4>
            <p className="text-xs text-slate-500 mt-0.5">Prepared Jun 2, 2026 · Valid 30 days</p>
          </div>
          {/* Sections */}
          {[
            {
              title: "Executive Summary",
              content: `We are pleased to present this proposal to ${company} for an AI-powered CRM solution designed to accelerate your sales growth. Based on our discovery sessions, we have tailored a solution that directly addresses your pipeline visibility and automation needs.`,
            },
            {
              title: "Solution Overview",
              content: modules.length
                ? `Your package includes: ${modules.join(", ")}. Each module is fully integrated, with unified reporting and a single sign-on experience for your entire team.`
                : "Please select modules above to include in this section.",
            },
            {
              title: "Pricing",
              content: `Total investment: ${formatted}\n• Annual contract (save 20% vs monthly)\n• Includes onboarding, training & 12-month support\n• ${modules.length} modules as selected above`,
            },
            {
              title: "Next Steps",
              content: "1. Review and sign proposal (DocuSign link)\n2. Kick-off call within 48 hours of signing\n3. Full deployment live within 14 business days\n4. 30-day hypercare support included",
            },
          ].map((sec, i) => (
            <motion.div key={sec.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: GOLD }}>{sec.title}</p>
              <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{sec.content}</pre>
            </motion.div>
          ))}
          <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/[0.06] transition-colors">
              <Copy size={12} /> Copy
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: `${GOLD}50`, color: GOLD }}>
              <Send size={12} /> Send Proposal
            </button>
          </div>
        </div>
      </OutputBox>
    </div>
  );
}

// ─── 6. Sales Forecast ────────────────────────────────────────────────────────
function SalesForecast() {
  const [period, setPeriod] = useState("This Month");
  const [confidence, setConfidence] = useState("75");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(false);

  function generate() {
    setLoading(true);
    setOutput(false);
    setTimeout(() => { setOutput(true); setLoading(false); }, 1200);
  }

  const forecastData: Record<string, {
    revenue: string; pipeline: string; winRate: number; atRisk: string;
    bars: { label: string; value: number; color: string }[];
  }> = {
    "This Month": {
      revenue: "$167,400", pipeline: "$2.4M", winRate: 62, atRisk: "$186K",
      bars: [
        { label: "Qualified",    value: 88, color: "#3b82f6" },
        { label: "Proposal",     value: 65, color: "#8b5cf6" },
        { label: "Negotiation",  value: 45, color: "#f59e0b" },
        { label: "Closing",      value: 28, color: EMERALD },
      ],
    },
    "This Quarter": {
      revenue: "$512,000", pipeline: "$7.1M", winRate: 58, atRisk: "$340K",
      bars: [
        { label: "Qualified",    value: 92, color: "#3b82f6" },
        { label: "Proposal",     value: 71, color: "#8b5cf6" },
        { label: "Negotiation",  value: 52, color: "#f59e0b" },
        { label: "Closing",      value: 38, color: EMERALD },
      ],
    },
    "This Year": {
      revenue: "$1,840,000", pipeline: "$24.3M", winRate: 55, atRisk: "$920K",
      bars: [
        { label: "Qualified",    value: 95, color: "#3b82f6" },
        { label: "Proposal",     value: 78, color: "#8b5cf6" },
        { label: "Negotiation",  value: 61, color: "#f59e0b" },
        { label: "Closing",      value: 44, color: EMERALD },
      ],
    },
  };

  const data = forecastData[period];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Time Period</Label>
          <Select
            value={period}
            onChange={setPeriod}
            options={FORECAST_PERIODS.map((p) => ({ value: p, label: p }))}
          />
        </div>
        <div>
          <Label>Confidence Level (%)</Label>
          <Input value={confidence} onChange={setConfidence} type="number" placeholder="75" />
        </div>
      </div>
      <GoldButton onClick={generate} loading={loading}>
        Generate Forecast
      </GoldButton>
      <OutputBox visible={output && !loading}>
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Predicted Revenue", value: data.revenue, color: GOLD, icon: DollarSign },
              { label: "Pipeline Coverage", value: data.pipeline, color: "#3b82f6", icon: BarChart2 },
              { label: "Win Rate", value: `${data.winRate}%`, color: EMERALD, icon: TrendingUp },
              { label: "At-Risk Deals", value: data.atRisk, color: "#ef4444", icon: AlertTriangle },
            ].map((kpi, i) => {
              const KpiIcon = kpi.icon;
              return (
                <motion.div key={kpi.label} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-white/[0.07] p-3 bg-white/[0.03] text-center">
                  <KpiIcon size={14} className="mx-auto mb-1" style={{ color: kpi.color }} />
                  <p className="text-base font-black" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{kpi.label}</p>
                </motion.div>
              );
            })}
          </div>
          {/* Pipeline stage bars */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Pipeline by Stage ({period})</p>
            <div className="space-y-3">
              {data.bars.map((bar, i) => (
                <div key={bar.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">{bar.label}</span>
                    <span className="text-xs font-bold" style={{ color: bar.color }}>{bar.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.value}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${bar.color}, ${bar.color}99)`,
                        boxShadow: `0 0 8px ${bar.color}60`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Confidence note */}
          <div className="rounded-lg border border-white/[0.07] px-3 py-2 flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs text-slate-500">AI Confidence Level</span>
            <span className="text-sm font-black" style={{ color: GOLD }}>{confidence}%</span>
          </div>
        </div>
      </OutputBox>
    </div>
  );
}

// ─── Tab content map ──────────────────────────────────────────────────────────
const TAB_CONTENT: Record<TabId, React.ElementType> = {
  email:    EmailWriter,
  whatsapp: WhatsAppReply,
  meeting:  MeetingNotes,
  call:     CallSummary,
  proposal: ProposalGenerator,
  forecast: SalesForecast,
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function AIInsights() {
  const [activeTab, setActiveTab] = useState<TabId>("email");
  const ActiveComponent = TAB_CONTENT[activeTab];

  return (
    <div className="p-5 h-full overflow-y-auto space-y-5" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg,rgba(212,175,55,0.08),rgba(0,168,107,0.05))",
          borderColor: `rgba(212,175,55,0.2)`,
        }}>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${GOLD},#b8960c)`, boxShadow: `0 0 20px rgba(212,175,55,0.3)` }}>
          <Sparkles size={20} className="text-[#080c14]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black" style={{ color: GOLD }}>AI Sales Copilot</h2>
          <p className="text-xs text-slate-400">Powered by AI · Generate content in seconds</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Active
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border"
              style={{
                background: isActive
                  ? `linear-gradient(135deg,${GOLD},#b8960c)`
                  : "rgba(255,255,255,0.03)",
                borderColor: isActive ? "transparent" : "rgba(255,255,255,0.07)",
                color: isActive ? "#080c14" : "#94a3b8",
                boxShadow: isActive ? `0 0 14px rgba(212,175,55,0.3)` : "none",
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl border p-5"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            {(() => {
              const tab = TABS.find((t) => t.id === activeTab)!;
              const Icon = tab.icon;
              return (
                <>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `rgba(212,175,55,0.12)`, border: `1px solid rgba(212,175,55,0.2)` }}>
                    <Icon size={14} style={{ color: GOLD }} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200">{tab.label}</h3>
                </>
              );
            })()}
          </div>
          <ActiveComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
