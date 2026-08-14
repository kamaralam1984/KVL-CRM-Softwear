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
import {
  generateEmailDraft,
  generateWhatsAppReplies,
  generateMeetingNotes,
  generateCallSummary,
  generateProposalDraft,
  generateSalesForecast,
  type EmailDraft,
  type WhatsAppReplyOption,
  type MeetingNotesResult,
  type CallSummaryResult,
  type ProposalSection,
  type SalesForecastResult,
} from "@/lib/actions/aiInsights";

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

// Turns a display string like "$128K" into a raw number (128000) so it can be
// passed to the server actions as real numeric context.
function parseDealString(s: string): number {
  const m = s.replace(/[$,]/g, "").match(/^([\d.]+)\s*([KMB]?)$/i);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  const suffix = m[2].toUpperCase();
  const mult = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1;
  return num * mult;
}

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
  const [output, setOutput] = useState<EmailDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const lead = DEMO_LEADS.find((l) => l.id === leadId)!;

  async function generate() {
    setLoading(true);
    setOutput(null);
    try {
      const result = await generateEmailDraft({
        leadName: lead.name,
        company: lead.company,
        dealValue: String(parseDealString(lead.deal)),
        emailType,
      });
      setOutput(result);
    } finally {
      setLoading(false);
    }
  }

  function copyEmail() {
    if (!output) return;
    navigator.clipboard.writeText(`Subject: ${output.subject}\n\n${output.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendEmail() {
    if (!output) return;
    setSent(true);
    setTimeout(() => setSent(false), 2000);
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
              <button
                onClick={sendEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                {sent ? <Check size={12} /> : <Send size={12} />}
                {sent ? "Sent!" : "Send Now"}
              </button>
            </div>
          </div>
        )}
      </OutputBox>
    </div>
  );
}

const WHATSAPP_TONE_COLORS: Record<string, string> = {
  Formal: "text-blue-400 border-blue-500/30 bg-blue-500/5",
  Friendly: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  "Follow-up": "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
};
const WHATSAPP_CONTACT = DEMO_LEADS[0]; // Lisa Zhang — HealthTech AI, matches the sample inbound message below
const WHATSAPP_INCOMING_MESSAGE =
  "Hi, I saw your message about the CRM demo. Sounds interesting! Can we schedule something for this week? Also, do you have pricing info you can share beforehand?";

// ─── 2. WhatsApp Reply ────────────────────────────────────────────────────────
function WhatsAppReply() {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(false);
  const [replies, setReplies] = useState<WhatsAppReplyOption[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  async function generate() {
    setLoading(true);
    setOutput(false);
    setSelected(null);
    try {
      const result = await generateWhatsAppReplies({
        contactName: WHATSAPP_CONTACT.name,
        company: WHATSAPP_CONTACT.company,
        incomingMessage: WHATSAPP_INCOMING_MESSAGE,
        context: context || undefined,
      });
      setReplies(result);
      setOutput(true);
    } finally {
      setLoading(false);
    }
  }

  function copyReply() {
    if (selected === null) return;
    navigator.clipboard.writeText(replies[selected].text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendReply() {
    if (selected === null) return;
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Sample incoming message — fixed demo scenario, passed as real input to the reply generator below */}
      <div className="rounded-xl border border-white/10 p-4 bg-white/[0.03]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
            {WHATSAPP_CONTACT.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">{WHATSAPP_CONTACT.name}</p>
            <p className="text-[10px] text-slate-500">{WHATSAPP_CONTACT.company} · 2m ago</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            WhatsApp
          </div>
        </div>
        <div className="rounded-lg px-3 py-2 text-sm text-slate-300 inline-block"
          style={{ background: "rgba(37,211,102,0.08)", borderLeft: "3px solid #25D366" }}>
          {WHATSAPP_INCOMING_MESSAGE}
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
                WHATSAPP_TONE_COLORS[r.tone] ?? "text-slate-300 border-white/10 bg-white/[0.03]",
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
            <button
              onClick={copyReply}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/[0.06] transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={sendReply}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              style={{ borderColor: "#25D366", color: "#25D366" }}
            >
              <Send size={12} /> {sent ? "Sent!" : "Send via WhatsApp"}
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

  const [notes, setNotes] = useState<MeetingNotesResult | null>(null);

  function toggleTopic(t: string) {
    setTopics((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function generate() {
    setLoading(true);
    setOutput(false);
    setNotes(null);
    try {
      const result = await generateMeetingNotes({ attendees, duration, topics });
      setNotes(result);
      setOutput(true);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
      <OutputBox visible={output && !loading && !!notes}>
        {notes && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-yellow-300">Meeting Summary</h4>
              <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={10} /> {duration} min</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg p-2 bg-white/[0.04] border border-white/[0.06]">
                <p className="text-slate-500 mb-0.5">Date</p>
                <p className="text-slate-200 font-medium">{today}</p>
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
                    {notes.keyPoints[t] ?? `${t} discussed.`}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Action Items</p>
              <ul className="space-y-1.5">
                {notes.actionItems.map((item, i) => (
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
        )}
      </OutputBox>
    </div>
  );
}

const CALL_SENTIMENT_META: Record<
  CallSummaryResult["sentiment"],
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  positive: { label: "Positive", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: ThumbsUp },
  neutral: { label: "Neutral", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", icon: Minus },
  negative: { label: "Negative", color: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30", icon: AlertTriangle },
};

// ─── 4. Call Summary ──────────────────────────────────────────────────────────
function CallSummary() {
  const [duration, setDuration] = useState("28");
  const [callType, setCallType] = useState("Discovery");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(false);

  const [summary, setSummary] = useState<CallSummaryResult | null>(null);

  async function generate() {
    setLoading(true);
    setOutput(false);
    setSummary(null);
    try {
      const result = await generateCallSummary({ duration, callType });
      setSummary(result);
      setOutput(true);
    } finally {
      setLoading(false);
    }
  }

  const s = summary ? CALL_SENTIMENT_META[summary.sentiment] : null;
  const SentimentIcon = s?.icon;

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
      <OutputBox visible={output && !loading && !!summary}>
        {summary && s && SentimentIcon && (
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
                {summary.points.map((pt, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="w-1 h-1 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                    {pt}
                  </motion.li>
                ))}
              </ul>
            </div>
            {summary.objections.length > 0 && (
              <div className="rounded-lg border border-rose-500/20 p-3 bg-rose-500/5">
                <p className="text-[10px] text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle size={10} /> Objections Raised
                </p>
                <ul className="space-y-1">
                  {summary.objections.map((o, i) => (
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
                <p className="text-xs text-slate-200 leading-relaxed">{summary.nextAction}</p>
              </div>
              <div className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold flex-shrink-0", s.bg, s.color)}>
                <SentimentIcon size={13} />
                {s.label}
              </div>
            </div>
          </div>
        )}
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
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const [sections, setSections] = useState<ProposalSection[]>([]);

  function toggleModule(m: string) {
    setModules((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  async function generate() {
    setLoading(true);
    setOutput(false);
    try {
      const result = await generateProposalDraft({ company, dealValue, modules });
      setSections(result.sections);
      setOutput(true);
    } finally {
      setLoading(false);
    }
  }

  function copyProposal() {
    const text = `${company} — Commercial Proposal\n\n${sections.map((s) => `${s.title}\n${s.content}`).join("\n\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendProposal() {
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

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
      <OutputBox visible={output && !loading && sections.length > 0}>
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center pb-3 border-b border-white/[0.07]">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Commercial Proposal</div>
            <h4 className="text-base font-black" style={{ color: GOLD }}>{company}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Prepared {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Valid 30 days
            </p>
          </div>
          {/* Sections */}
          {sections.map((sec, i) => (
            <motion.div key={sec.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: GOLD }}>{sec.title}</p>
              <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{sec.content}</pre>
            </motion.div>
          ))}
          <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
            <button
              onClick={copyProposal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/[0.06] transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={sendProposal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: `${GOLD}50`, color: GOLD }}
            >
              <Send size={12} /> {sent ? "Sent!" : "Send Proposal"}
            </button>
          </div>
        </div>
      </OutputBox>
    </div>
  );
}

const FORECAST_BAR_COLORS: Record<string, string> = {
  Qualified: "#3b82f6",
  Proposal: "#8b5cf6",
  Negotiation: "#f59e0b",
  Closing: EMERALD,
};

// ─── 6. Sales Forecast ────────────────────────────────────────────────────────
function SalesForecast() {
  const [period, setPeriod] = useState("This Month");
  const [confidence, setConfidence] = useState("75");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(false);

  const [data, setData] = useState<SalesForecastResult | null>(null);

  async function generate() {
    setLoading(true);
    setOutput(false);
    setData(null);
    try {
      const result = await generateSalesForecast({ period, confidence });
      setData(result);
      setOutput(true);
    } finally {
      setLoading(false);
    }
  }

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
      <OutputBox visible={output && !loading && !!data}>
        {data && (
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
                {data.bars.map((bar, i) => {
                  const color = FORECAST_BAR_COLORS[bar.label] ?? "#94a3b8";
                  return (
                    <div key={bar.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{bar.label}</span>
                        <span className="text-xs font-bold" style={{ color }}>{bar.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${bar.value}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${color}, ${color}99)`,
                            boxShadow: `0 0 8px ${color}60`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Confidence note */}
            <div className="rounded-lg border border-white/[0.07] px-3 py-2 flex items-center justify-between bg-white/[0.02]">
              <span className="text-xs text-slate-500">AI Confidence Level</span>
              <span className="text-sm font-black" style={{ color: GOLD }}>{confidence}%</span>
            </div>
          </div>
        )}
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
