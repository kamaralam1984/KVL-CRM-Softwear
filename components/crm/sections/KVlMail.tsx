"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox, Star, Send, FileText, AlertTriangle, Trash2,
  Search, Paperclip, Reply, ReplyAll, Forward, Archive,
  ChevronDown, ChevronUp, X, Bold, Italic, Link2,
  Plus, Tag, HardDrive, Check, MailOpen,
} from "lucide-react";

/* ─── Types ─── */
interface Email {
  id: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  date: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  folder: string;
  thread?: ThreadMessage[];
}

interface ThreadMessage {
  id: string;
  from: string;
  fromEmail: string;
  time: string;
  body: string;
  expanded: boolean;
}

/* ─── Demo Data ─── */
const DEMO_EMAILS: Email[] = [
  {
    id: "1",
    from: "Sarah Chen",
    fromEmail: "sarah@techflow.com",
    to: "me@kvlcrm.com",
    subject: "Q3 Partnership Proposal — TechFlow Inc",
    preview: "Hi, I wanted to follow up on our conversation last week about a potential strategic partnership...",
    body: `Hi,

I wanted to follow up on our conversation last week about a potential strategic partnership between TechFlow Inc and your team.

We've put together a comprehensive Q3 proposal that outlines how we can collaborate on the enterprise segment. Our platform currently serves 2,400+ mid-market customers and we believe there's a strong alignment with your CRM offering.

Key highlights of the proposal:
• Revenue share model: 20% on referred enterprise accounts
• Co-marketing budget: $50,000 allocated for joint campaigns
• Integration timeline: 6–8 weeks for full API integration
• Dedicated partner success manager assigned to your account

I've attached the full proposal deck (12 slides) and a draft MOU for your legal team's review. Could we schedule a call this week to walk through the details?

Looking forward to your response.

Best,
Sarah Chen
Director of Partnerships, TechFlow Inc`,
    time: "9:42 AM",
    date: "Today",
    unread: true,
    starred: true,
    hasAttachment: true,
    folder: "inbox",
    thread: [
      {
        id: "t1a",
        from: "You",
        fromEmail: "me@kvlcrm.com",
        time: "Yesterday, 3:15 PM",
        body: "Hi Sarah, thanks for reaching out! A partnership sounds very interesting. Can you send over some initial details about what you have in mind? Happy to review before we get on a call.",
        expanded: false,
      },
      {
        id: "t1b",
        from: "Sarah Chen",
        fromEmail: "sarah@techflow.com",
        time: "Yesterday, 5:02 PM",
        body: "Absolutely! I'll put together our standard partnership brief and send it over tomorrow morning. Really excited about the potential here — our customers have been asking for a CRM integration for months.",
        expanded: false,
      },
    ],
  },
  {
    id: "2",
    from: "Stripe Billing",
    fromEmail: "billing@stripe.com",
    to: "me@kvlcrm.com",
    subject: "Invoice #INV-2847 Payment Confirmed",
    preview: "Your payment of $2,499.00 has been successfully processed. Thank you for your business.",
    body: `Dear Customer,

Your payment has been successfully processed.

Invoice Details:
─────────────────────────────
Invoice #:      INV-2847
Amount:         $2,499.00 USD
Payment Method: Visa ending in 4242
Date:           June 2, 2026
Status:         PAID ✓
─────────────────────────────

A receipt has been sent to your registered email address. You can also download this invoice from your Stripe dashboard.

If you have any questions about this charge, please contact our support team at support@stripe.com or call +1 (888) 555-0198.

Thank you for your business.

The Stripe Team`,
    time: "8:15 AM",
    date: "Today",
    unread: true,
    starred: false,
    hasAttachment: false,
    folder: "inbox",
  },
  {
    id: "3",
    from: "KVl CRM",
    fromEmail: "noreply@kvlcrm.com",
    to: "me@kvlcrm.com",
    subject: "Your weekly sales report is ready",
    preview: "This week's highlights: 24 new leads, 3 deals closed, pipeline value up 18%. View your full report inside.",
    body: `Good morning,

Your weekly sales performance report for the week of May 26 – June 1, 2026 is now ready.

📊 Weekly Highlights
──────────────────────────
New Leads Generated:    24  (+12% vs last week)
Deals Closed:            3  ($47,500 total value)
Pipeline Value:    $284,000  (+18% vs last week)
Avg Response Time:   2.4 hrs  (target: < 4 hrs ✓)
──────────────────────────

🏆 Top Performer
Marcus Williams closed 2 of the 3 deals this week, contributing $31,000 in revenue.

⚠️ Attention Needed
• 7 leads have not been contacted in over 5 days
• Deal "Apex Corp Enterprise" has been in negotiation stage for 14 days

📅 This Week's Goals
• Follow up on 12 warm leads in the pipeline
• Schedule 5 product demos for new inbound leads
• Review and update deal stages in the pipeline

View your full interactive report in the KVl CRM dashboard.

— The KVl CRM Team`,
    time: "7:00 AM",
    date: "Today",
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: "inbox",
  },
  {
    id: "4",
    from: "Priya Sharma",
    fromEmail: "priya@cloudscale.com",
    to: "me@kvlcrm.com",
    subject: "Re: Product Demo Follow-up",
    preview: "Thank you so much for the demo yesterday! The team was really impressed, especially with the pipeline automation features...",
    body: `Hi,

Thank you so much for the demo yesterday! The team was really impressed, especially with the pipeline automation features and the AI-powered lead scoring.

A few follow-up questions from our side:

1. Data Migration — We have about 8 years of customer data in our current CRM (Salesforce). What does the migration process look like, and do you offer white-glove migration support for enterprise accounts?

2. SSO Integration — We use Okta for identity management. Is SAML/SSO integration available on the Business plan, or is it Enterprise only?

3. Custom Reporting — Can we build custom dashboards with data from external sources (e.g., our BI tool, Google Analytics)?

4. SLA — What's the uptime guarantee and what are the support response time SLAs for enterprise customers?

We're planning to make a decision by end of June, so a quick turnaround on these questions would be very helpful.

Best regards,
Priya Sharma
Head of Operations, CloudScale`,
    time: "Jun 1",
    date: "Yesterday",
    unread: true,
    starred: true,
    hasAttachment: false,
    folder: "inbox",
    thread: [
      {
        id: "t4a",
        from: "You",
        fromEmail: "me@kvlcrm.com",
        time: "May 31, 2:00 PM",
        body: "Hi Priya, really excited to show you what KVl CRM can do! I've scheduled the demo for tomorrow at 10 AM. I'll send a calendar invite shortly. Please let me know if the timing works for your team.",
        expanded: false,
      },
    ],
  },
  {
    id: "5",
    from: "KVl System",
    fromEmail: "system@kvlcrm.com",
    to: "me@kvlcrm.com",
    subject: "New lead assigned: Marcus Williams",
    preview: "A new high-priority lead has been assigned to you: Marcus Williams, VP of Engineering at NovaTech Solutions.",
    body: `A new lead has been automatically assigned to you based on your territory rules.

Lead Details:
─────────────────────────────
Name:        Marcus Williams
Title:       VP of Engineering
Company:     NovaTech Solutions
Email:       m.williams@novatech.io
Phone:       +1 (415) 555-0247
Source:      LinkedIn Inbound
Score:       87/100 (High Priority)
Assigned:    June 2, 2026 at 9:30 AM
─────────────────────────────

AI Analysis:
Marcus's company matches your Ideal Customer Profile (ICP). NovaTech has 320 employees and $48M ARR. Their current CRM contract with HubSpot expires in September 2026 — this is a strong buying signal.

Recommended Actions:
1. Send personalized intro email within 2 hours
2. Connect on LinkedIn
3. Schedule discovery call for this week

View full lead profile and activity history in your CRM dashboard.

— KVl CRM Automation`,
    time: "Jun 1",
    date: "Yesterday",
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: "inbox",
  },
  {
    id: "6",
    from: "James Okafor",
    fromEmail: "james@meridiangroup.co",
    to: "me@kvlcrm.com",
    subject: "Contract renewal discussion — Meridian Group",
    preview: "Our current enterprise contract expires July 31. Before we go to market, we wanted to give you the first opportunity to discuss renewal terms...",
    body: `Hi,

Our current enterprise contract with your team expires on July 31, 2026. Before we issue an RFP and go to market, we wanted to give you the first opportunity to discuss renewal terms.

We've been largely satisfied with the platform, but there are a few areas where we'd like to see improvements or pricing adjustments:

• User seat pricing is 15% above market average for our tier
• We need dedicated Slack support (not just ticket-based)
• Custom SLA with 99.9% uptime guarantee required for our compliance team

We have budget approved for renewal, and our team would strongly prefer to stay on KVl CRM given the switching costs involved.

Can we get on a call this week? I'm available Thursday and Friday afternoon EST.

Best,
James Okafor
CTO, Meridian Group`,
    time: "May 30",
    date: "May 30",
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: "inbox",
  },
  {
    id: "7",
    from: "Lena Fischer",
    fromEmail: "lena@axisventures.de",
    to: "me@kvlcrm.com",
    subject: "Introducing Axis Ventures — Series B CRM evaluation",
    preview: "We are a Berlin-based venture studio currently evaluating CRM solutions for our portfolio of 12 companies...",
    body: `Hello,

I'm Lena Fischer, Head of Portfolio Operations at Axis Ventures. We are a Berlin-based venture studio with 12 portfolio companies, currently evaluating CRM solutions across our portfolio.

We're looking for a single platform that can serve companies ranging from 5 to 200 employees, with the ability to centralize reporting at the holding level.

Our evaluation criteria:
• Multi-tenant / multi-workspace support
• Consolidated reporting dashboard for holding company
• Pricing flexibility (per-company vs. enterprise-wide licensing)
• GDPR compliance (data residency in EU preferred)
• API-first architecture for custom integrations

We have a budget of approximately €80,000/year for the right solution. Timeline to decision: 6 weeks.

Would you be able to arrange a call with your enterprise team this week?

Best regards,
Lena Fischer
Axis Ventures GmbH`,
    time: "May 29",
    date: "May 29",
    unread: false,
    starred: false,
    hasAttachment: true,
    folder: "inbox",
  },
  {
    id: "8",
    from: "Dev Notifications",
    fromEmail: "dev@kvlcrm.com",
    to: "me@kvlcrm.com",
    subject: "Scheduled maintenance: June 5, 2:00–4:00 AM UTC",
    preview: "We will be performing scheduled maintenance on Saturday, June 5. Expected downtime: 2 hours.",
    body: `This is an advance notice of scheduled maintenance.

Maintenance Window:
Date:      Saturday, June 5, 2026
Time:      2:00 AM – 4:00 AM UTC
Duration:  ~2 hours (may be shorter)
Impact:    Full platform unavailability

What we're doing:
• Database infrastructure upgrade (PostgreSQL 15 → 16)
• CDN configuration updates for improved global performance
• Security patches for all backend services

No action is required on your part. All data is backed up before maintenance begins. If you need to export data before the window, you have until June 4 at 11:59 PM UTC.

We'll send a confirmation email once maintenance is complete.

— KVl CRM Infrastructure Team`,
    time: "May 28",
    date: "May 28",
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: "inbox",
  },
  {
    id: "9",
    from: "Amir Hassan",
    fromEmail: "amir@peakretail.ae",
    to: "me@kvlcrm.com",
    subject: "Re: Onboarding session recap & next steps",
    preview: "Thanks for the thorough onboarding session! I've shared the recording with the team. We have a few questions...",
    body: `Hi,

Thanks for the thorough onboarding session earlier today! I've shared the recording with the rest of the team.

Quick recap of what we covered:
✓ Lead import and deduplication
✓ Pipeline setup and deal stage configuration
✓ Automation rules for lead nurturing
✓ Reporting dashboard customization

Follow-up questions:
1. Is there a way to bulk-reassign leads from one rep to another when a team member leaves?
2. Can we set up WhatsApp integration without a business API account?
3. The mobile app — iOS only, or is Android available too?

Also, I noticed the onboarding checklist still shows step 3 as incomplete even though we've finished it. Can your team reset that on your end?

Thanks again — the team is really excited to get started!

Best,
Amir Hassan
Operations Manager, Peak Retail`,
    time: "May 27",
    date: "May 27",
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: "inbox",
  },
  {
    id: "10",
    from: "Grace Nakamura",
    fromEmail: "grace@futureworks.jp",
    to: "me@kvlcrm.com",
    subject: "Inquiry: Japanese locale and timezone support",
    preview: "We are a Tokyo-based firm exploring KVl CRM. Before we proceed, we need to confirm a few localization requirements...",
    body: `Hello,

We are FutureWorks K.K., a Tokyo-based technology consulting firm with 85 employees. We are exploring KVl CRM as part of our digital transformation initiative.

Before we proceed to a formal evaluation, I need to confirm a few localization requirements:

1. Japanese language support — Is the interface available in Japanese? Can custom fields, labels, and email templates be configured in Japanese?

2. Timezone handling — Does the CRM correctly handle JST (UTC+9) for all timestamps, reminders, and scheduling features?

3. Data residency — Is there an option for data to be stored in the Asia-Pacific region for compliance with Japan's APPI (Act on Protection of Personal Information)?

4. Localized billing — Can invoices be issued in JPY with Japanese business address details?

If these requirements can be met, I would like to schedule a demo for next week.

Thank you,
Grace Nakamura
IT Strategy, FutureWorks K.K.`,
    time: "May 26",
    date: "May 26",
    unread: false,
    starred: false,
    hasAttachment: false,
    folder: "inbox",
  },
];

const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: Inbox, count: 12 },
  { id: "starred", label: "Starred", icon: Star, count: 0 },
  { id: "sent", label: "Sent", icon: Send, count: 0 },
  { id: "drafts", label: "Drafts", icon: FileText, count: 3 },
  { id: "spam", label: "Spam", icon: AlertTriangle, count: 0 },
  { id: "trash", label: "Trash", icon: Trash2, count: 0 },
];

const LABELS = [
  { id: "work", label: "Work", color: "#D4AF37" },
  { id: "personal", label: "Personal", color: "#00A86B" },
  { id: "important", label: "Important", color: "#EF4444" },
  { id: "followup", label: "Follow-up", color: "#8B5CF6" },
];

type FilterType = "all" | "unread" | "starred" | "attachments";

/* ─── Avatar ─── */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#D4AF37", "#00A86B", "#3B82F6", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4"];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

/* ─── Compose Modal ─── */
function ComposeModal({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(8,12,20,0.8)", backdropFilter: "blur(4px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl rounded-2xl border flex flex-col"
          style={{ background: "#0d1424", borderColor: "rgba(255,255,255,0.08)", maxHeight: "90vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span className="text-sm font-semibold text-slate-200">New Message</span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Fields */}
          <div className="flex-1 overflow-y-auto">
            {[
              { label: "To", value: to, setter: setTo, placeholder: "recipient@example.com" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span className="text-xs text-slate-500 w-12">{f.label}</span>
                <input
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600"
                />
                <button onClick={() => setShowCc(!showCc)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  CC BCC
                </button>
              </div>
            ))}

            <AnimatePresence>
              {showCc && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  {[
                    { label: "CC", value: cc, setter: setCc },
                    { label: "BCC", value: bcc, setter: setBcc },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      <span className="text-xs text-slate-500 w-12">{f.label}</span>
                      <input
                        value={f.value}
                        onChange={(e) => f.setter(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600"
                      />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="text-xs text-slate-500 w-12">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600"
              />
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="w-full px-5 py-4 bg-transparent text-sm text-slate-300 outline-none placeholder-slate-600 resize-none"
              style={{ minHeight: 220 }}
            />

            {/* Formatting bar */}
            <div className="flex items-center gap-1 px-5 pb-3">
              {[
                { icon: Bold, label: "Bold" },
                { icon: Italic, label: "Italic" },
                { icon: Link2, label: "Link" },
                { icon: Paperclip, label: "Attach" },
              ].map(({ icon: Icon, label }) => (
                <button key={label} title={label} className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors">
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#D4AF37,#B8963E)" }}>
                <Send size={14} />
                Send
              </button>
              <button className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors">
                Save Draft
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Email Row ─── */
function EmailRow({
  email,
  selected,
  onClick,
}: {
  email: Email;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      onClick={onClick}
      className="w-full text-left px-4 py-3 relative flex items-start gap-3 transition-colors border-b"
      style={{
        borderColor: "rgba(255,255,255,0.04)",
        borderLeft: selected ? "3px solid #D4AF37" : "3px solid transparent",
        background: selected ? "rgba(212,175,55,0.06)" : undefined,
      }}
    >
      <Avatar name={email.from} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm truncate ${email.unread ? "font-bold text-slate-100" : "font-medium text-slate-300"}`}>
            {email.from}
          </span>
          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
            {email.hasAttachment && <Paperclip size={11} className="text-slate-500" />}
            {email.starred && <Star size={11} style={{ color: "#D4AF37" }} fill="#D4AF37" />}
            <span className="text-[11px] text-slate-500">{email.time}</span>
          </div>
        </div>
        <p className={`text-xs truncate mb-0.5 ${email.unread ? "font-semibold text-slate-200" : "text-slate-400"}`}>
          {email.subject}
        </p>
        <p className="text-[11px] text-slate-600 truncate">{email.preview}</p>
      </div>
      {email.unread && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: "#D4AF37" }} />
      )}
    </motion.button>
  );
}

/* ─── Email Preview ─── */
function EmailPreview({
  email,
  onReply,
}: {
  email: Email;
  onReply: () => void;
}) {
  const [threadExpanded, setThreadExpanded] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState("");

  const toggleThread = (id: string) =>
    setThreadExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const actions = [
    { icon: Reply, label: "Reply", onClick: onReply },
    { icon: ReplyAll, label: "Reply All", onClick: onReply },
    { icon: Forward, label: "Forward", onClick: onReply },
    { icon: Archive, label: "Archive", onClick: () => {} },
    { icon: Trash2, label: "Delete", onClick: () => {} },
    { icon: Star, label: "Star", onClick: () => {} },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Email Header */}
      <div className="px-6 pt-6 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <h2 className="text-lg font-bold text-slate-100 mb-3 leading-snug">{email.subject}</h2>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar name={email.from} size={40} />
            <div>
              <p className="text-sm font-semibold text-slate-200">{email.from}</p>
              <p className="text-xs text-slate-500">{email.fromEmail}</p>
              <p className="text-xs text-slate-600 mt-0.5">To: {email.to} · {email.date}, {email.time}</p>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {actions.map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                title={label}
                onClick={onClick}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-colors"
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Email Body + Thread */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {/* Main body */}
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {email.body}
        </div>

        {/* Thread messages */}
        {email.thread && email.thread.length > 0 && (
          <div className="space-y-3 mt-6">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-[11px] text-slate-600 px-2">{email.thread.length} earlier message{email.thread.length > 1 ? "s" : ""}</span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
            {email.thread.map((msg) => {
              const expanded = threadExpanded[msg.id] ?? false;
              return (
                <div
                  key={msg.id}
                  className="rounded-xl border"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors rounded-xl"
                    onClick={() => toggleThread(msg.id)}
                  >
                    <Avatar name={msg.from} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">{msg.from}</span>
                        <span className="text-[11px] text-slate-600">{msg.time}</span>
                      </div>
                      {!expanded && (
                        <p className="text-[11px] text-slate-500 truncate">{msg.body.slice(0, 80)}…</p>
                      )}
                    </div>
                    {expanded ? <ChevronUp size={13} className="text-slate-600 flex-shrink-0" /> : <ChevronDown size={13} className="text-slate-600 flex-shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 pt-1 text-sm text-slate-400 leading-relaxed">{msg.body}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Box */}
      <div className="flex-shrink-0 px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="rounded-xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply to ${email.from}…`}
            className="w-full px-4 pt-3 pb-2 bg-transparent text-sm text-slate-300 outline-none placeholder-slate-600 resize-none rounded-t-xl"
            rows={3}
          />
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1">
              {[Bold, Italic, Link2, Paperclip].map((Icon, i) => (
                <button key={i} className="p-1.5 rounded text-slate-600 hover:text-slate-400 transition-colors">
                  <Icon size={13} />
                </button>
              ))}
            </div>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#D4AF37,#B8963E)" }}
            >
              <Send size={12} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function KVlMail() {
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string>("1");
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [composing, setComposing] = useState(false);

  const selectedEmail = DEMO_EMAILS.find((e) => e.id === selectedEmailId) ?? null;

  const filteredEmails = DEMO_EMAILS.filter((e) => {
    if (activeFolder === "starred") return e.starred;
    if (activeFolder !== "inbox") return false;
    if (filter === "unread") return e.unread;
    if (filter === "starred") return e.starred;
    if (filter === "attachments") return e.hasAttachment;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.from.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const FILTER_CHIPS: { id: FilterType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "starred", label: "Starred" },
    { id: "attachments", label: "Attachments" },
  ];

  const storagePercent = (4.2 / 15) * 100;

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: "#080c14" }}>
      {/* ── Left Sidebar ── */}
      <div
        className="flex-shrink-0 flex flex-col border-r"
        style={{ width: 180, background: "rgba(13,20,36,0.95)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        {/* Compose */}
        <div className="px-3 pt-4 pb-3">
          <button
            onClick={() => setComposing(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#D4AF37,#B8963E)", boxShadow: "0 4px 16px rgba(212,175,55,0.3)" }}
          >
            <Plus size={15} />
            Compose
          </button>
        </div>

        {/* Folders */}
        <nav className="flex-1 px-2 overflow-y-auto">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-2 mb-1.5">Folders</p>
          {FOLDERS.map(({ id, label, icon: Icon, count }) => {
            const active = activeFolder === id;
            return (
              <button
                key={id}
                onClick={() => setActiveFolder(id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 transition-colors text-left"
                style={{
                  background: active ? "rgba(212,175,55,0.1)" : undefined,
                  color: active ? "#D4AF37" : "#94a3b8",
                }}
              >
                <Icon size={14} className="flex-shrink-0" style={{ color: active ? "#D4AF37" : undefined }} />
                <span className="flex-1 text-xs font-medium truncate">{label}</span>
                {count > 0 && id === "inbox" && (
                  <span className="text-[10px] font-bold px-1.5 rounded-full" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>
                    {count}
                  </span>
                )}
                {id === "drafts" && (
                  <span className="text-[10px] font-bold px-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "#64748b" }}>
                    3
                  </span>
                )}
              </button>
            );
          })}

          {/* Labels */}
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-2 mt-4 mb-1.5">Labels</p>
          {LABELS.map(({ id, label, color }) => (
            <button
              key={id}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 transition-colors hover:bg-white/[0.04]"
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-slate-400">{label}</span>
            </button>
          ))}
        </nav>

        {/* Storage bar */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <HardDrive size={11} className="text-slate-600" />
            <span className="text-[10px] text-slate-600">4.2 GB of 15 GB used</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${storagePercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#00A86B,#D4AF37)" }}
            />
          </div>
        </div>
      </div>

      {/* ── Middle Email List ── */}
      <div
        className="flex-shrink-0 flex flex-col border-r"
        style={{ width: 320, borderColor: "rgba(255,255,255,0.06)", background: "rgba(10,15,26,0.9)" }}
      >
        {/* Search */}
        <div className="px-3 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Search size={13} className="text-slate-500 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search mail…"
              className="flex-1 bg-transparent text-xs text-slate-300 outline-none placeholder-slate-600"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 px-3 pb-2 flex-shrink-0 overflow-x-auto">
          {FILTER_CHIPS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
              style={{
                background: filter === id ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
                color: filter === id ? "#D4AF37" : "#64748b",
                border: filter === id ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {filteredEmails.map((email, i) => (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
              >
                <EmailRow
                  email={email}
                  selected={selectedEmailId === email.id}
                  onClick={() => setSelectedEmailId(email.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredEmails.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <MailOpen size={32} className="text-slate-700 mb-3" />
              <p className="text-sm text-slate-600">No emails found</p>
            </div>
          )}

          {/* Load more */}
          {filteredEmails.length > 0 && (
            <button className="w-full py-3 text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-1.5">
              <ChevronDown size={13} />
              Load more
            </button>
          )}
        </div>
      </div>

      {/* ── Right Email Preview ── */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ background: "#080c14" }}>
        {selectedEmail ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedEmail.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <EmailPreview email={selectedEmail} onReply={() => setComposing(true)} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}
            >
              <Inbox size={28} style={{ color: "#D4AF37" }} />
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">Select an email to read</p>
            <p className="text-slate-600 text-xs">Choose from the list on the left</p>
          </div>
        )}
      </div>

      {/* ── Compose Modal ── */}
      {composing && <ComposeModal onClose={() => setComposing(false)} />}
    </div>
  );
}
