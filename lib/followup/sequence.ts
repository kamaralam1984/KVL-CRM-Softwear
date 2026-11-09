// Follow-up Engine — pure logic (no I/O), so it's directly unit-testable.
// Defines the 90-day "never let a lead go cold" cadence, message templating,
// quiet-hours scheduling (IST) and inbound-reply classification.

export type FollowUpChannel = "whatsapp" | "email" | "call";

export interface SequenceStep {
  /** Hours after enrollment (cumulative from start, not from previous step). */
  atHours: number;
  channel: FollowUpChannel;
  /** Email subject (email steps only). */
  subject?: string;
  /** Message body / call script. Supports {{firstName}} {{company}} {{brand}} {{owner}}. */
  body: string;
}

export interface SequenceDef {
  key: string;
  name: string;
  durationDays: number;
  steps: SequenceStep[];
}

export type EnrollmentStatus =
  | "active"          // drip running
  | "replied_waiting" // client replied; drip paused, waiting for a human reply
  | "payment_ready"   // client signalled intent to pay → stop drip, human closes
  | "won"             // paid / deal closed
  | "completed"       // 90 days elapsed
  | "stopped"         // opt-out or manual stop
  | "paused";         // manually paused

export const TERMINAL_STATUSES: EnrollmentStatus[] = ["payment_ready", "won", "completed", "stopped"];

export const DEFAULT_SEQUENCE_KEY = "kvl-90-day-closer";
export const HUMAN_REPLY_SLA_HOURS = 24;
export const MAX_AI_NUDGES_PER_REPLY = 2;
/** After a human replies, the drip resumes this many hours later. */
export const RESUME_AFTER_HUMAN_REPLY_HOURS = 72;

const H = 1;
const D = 24;

export const DEFAULT_SEQUENCE: SequenceDef = {
  key: DEFAULT_SEQUENCE_KEY,
  name: "90-Day Closer (WhatsApp + Email + Call)",
  durationDays: 90,
  steps: [
    // ── Week 1: fast, high-touch ──
    { atHours: 0, channel: "whatsapp", body: "Hi {{firstName}}, thanks for your interest in {{brand}}! I'm {{owner}} — happy to help {{company}}. What's the main goal you want to achieve right now?" },
    { atHours: 0, channel: "email", subject: "Welcome to {{brand}}, {{firstName}}", body: "Hi {{firstName}},\n\nThanks for reaching out. We help businesses like {{company}} get more clients with a proper CRM + automation setup.\n\nReply to this email with your biggest challenge and I'll send a tailored plan.\n\n— {{owner}}, {{brand}}" },
    { atHours: 2 * H, channel: "call", body: "Intro call to {{firstName}} ({{company}}): understand needs, budget, timeline, decision maker. Goal: book a demo." },
    { atHours: 1 * D, channel: "whatsapp", body: "Hi {{firstName}}, quick follow-up from {{brand}}. Would a 15-min demo this week work for {{company}}? Just reply with a time that suits you." },
    { atHours: 2 * D, channel: "email", subject: "How businesses like {{company}} grow with us", body: "Hi {{firstName}},\n\nHere's how similar businesses cut manual follow-ups and closed more deals with {{brand}}.\n\nWant me to show you the same setup for {{company}}? Reply \"demo\" and I'll share slots.\n\n— {{owner}}" },
    { atHours: 3 * D, channel: "call", body: "Follow-up call to {{firstName}}: did they see our messages? Offer demo, handle objections." },
    { atHours: 5 * D, channel: "whatsapp", body: "Hi {{firstName}}, just checking in — any questions about {{brand}} I can answer for {{company}}?" },
    { atHours: 7 * D, channel: "email", subject: "Your proposal & pricing — {{brand}}", body: "Hi {{firstName}},\n\nI can put together a clear proposal and pricing for {{company}} — no obligation. Shall I send it over?\n\n— {{owner}}" },
    // ── Weeks 2–4: steady nurture ──
    { atHours: 10 * D, channel: "whatsapp", body: "Hi {{firstName}}, {{owner}} from {{brand}} here. Is now still a good time to look at this for {{company}}, or should I check back later?" },
    { atHours: 14 * D, channel: "call", body: "2-week check-in call to {{firstName}}: any blockers? Offer a limited-time onboarding slot." },
    { atHours: 14 * D, channel: "email", subject: "Still thinking it over, {{firstName}}?", body: "Hi {{firstName}},\n\nTotally fine to take your time. If budget, timing or a team decision is the hold-up, tell me and I'll help find a way that works for {{company}}.\n\n— {{owner}}" },
    { atHours: 21 * D, channel: "whatsapp", body: "Hi {{firstName}}, we just helped another business get started in under a week. Happy to do the same for {{company}} — want the details?" },
    { atHours: 28 * D, channel: "email", subject: "A quick idea for {{company}}", body: "Hi {{firstName}},\n\nOne small change that usually gives quick wins: automating your lead follow-ups. I can show you in 10 minutes how it'd work for {{company}}.\n\n— {{owner}}" },
    { atHours: 35 * D, channel: "call", body: "Month-1 call to {{firstName}}: re-qualify, check timeline, ask what would make them ready to start." },
    // ── Months 2–3: low-frequency, stay top-of-mind ──
    { atHours: 45 * D, channel: "whatsapp", body: "Hi {{firstName}}, hope things are going well at {{company}}! Whenever you're ready to get started with {{brand}}, I'm just a message away." },
    { atHours: 60 * D, channel: "email", subject: "New at {{brand}} — thought of {{company}}", body: "Hi {{firstName}},\n\nWe've added new features recently that fit businesses like {{company}}. Want a quick walkthrough?\n\n— {{owner}}" },
    { atHours: 60 * D, channel: "call", body: "Month-2 call to {{firstName}}: share new features, ask if priorities changed, push for decision." },
    { atHours: 75 * D, channel: "whatsapp", body: "Hi {{firstName}}, {{owner}} here. Is it still on your radar to improve {{company}}'s lead follow-up? Happy to help any time." },
    { atHours: 90 * D, channel: "email", subject: "Closing the loop, {{firstName}}", body: "Hi {{firstName}},\n\nI don't want to be a bother, so this is my last scheduled note. If things change for {{company}}, just reply and we'll pick up right where we left off.\n\n— {{owner}}, {{brand}}" },
    { atHours: 90 * D, channel: "call", body: "FINAL touch (day 90) for {{firstName}}: decide — keep nurturing manually, or close as lost." },
  ],
};

// ── Templating ───────────────────────────────────────────────────────────────

export interface TemplateCtx {
  firstName: string;
  company: string;
  brand: string;
  owner: string;
}

export function renderTemplate(tpl: string, ctx: TemplateCtx): string {
  return tpl.replace(/\{\{(firstName|company|brand|owner)\}\}/g, (_, k: keyof TemplateCtx) => ctx[k] || "");
}

export function buildCtx(lead: { name?: string | null; company?: string | null; owner?: string | null }, brand: string): TemplateCtx {
  const name = (lead.name ?? "").trim();
  return {
    firstName: name.split(/\s+/)[0] || "there",
    company: (lead.company ?? "").trim() || "your business",
    brand,
    owner: (lead.owner ?? "").trim() || "the team",
  };
}

// ── Scheduling (IST quiet hours) ─────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 3_600_000;
export const QUIET_START_HOUR = 21; // 9 PM IST
export const QUIET_END_HOUR = 9;    // 9 AM IST
export const SEND_HOUR = 10;        // where deferred messages land

/** Never message clients 9 PM–9 AM IST. Returns `at` if allowed, else next 10:00 IST. */
export function adjustForQuietHours(at: Date): Date {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const hour = ist.getUTCHours();
  if (hour >= QUIET_END_HOUR && hour < QUIET_START_HOUR) return at;
  const next = new Date(ist);
  if (hour >= QUIET_START_HOUR) next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(SEND_HOUR, 0, 0, 0);
  return new Date(next.getTime() - IST_OFFSET_MS);
}

export function stepDueAt(startedAt: Date, step: SequenceStep): Date {
  return adjustForQuietHours(new Date(startedAt.getTime() + step.atHours * 3_600_000));
}

// ── Inbound reply classification ─────────────────────────────────────────────

export type InboundIntent = "optout" | "payment_intent" | "normal";

const OPTOUT = /\b(stop|unsubscribe|do not (contact|message|call)|don'?t (contact|message|call)|not interested|remove me|mat bhejo|mat karo|band karo|nahi chahiye|nhi chahiye)\b/i;
const PAYMENT = /\b(pay|payment|payment link|invoice|upi|bank details|account details|send (the )?(link|invoice|details)|ready to (start|buy|proceed|join)|let'?s (start|go|proceed)|i('| a)?m in|confirm|book it|how (do|can) i pay|kaise pay|paise|payment kar|link bhejo|start kar(te|na))\b/i;

/** Order matters: an opt-out always wins over payment intent. */
export function classifyInbound(text: string): InboundIntent {
  if (OPTOUT.test(text)) return "optout";
  if (PAYMENT.test(text)) return "payment_intent";
  return "normal";
}

// ── 24h human-reply SLA ──────────────────────────────────────────────────────

/** True when client replied > SLA hours ago and no human answered since. */
export function needsAiNudge(
  e: { last_inbound_at: string | null; last_human_reply_at: string | null; last_ai_nudge_at: string | null; ai_nudge_count: number },
  now: Date,
): boolean {
  if (!e.last_inbound_at) return false;
  const inboundMs = new Date(e.last_inbound_at).getTime();
  if (e.last_human_reply_at && new Date(e.last_human_reply_at).getTime() >= inboundMs) return false;
  if (e.ai_nudge_count >= MAX_AI_NUDGES_PER_REPLY) return false;
  const anchor = Math.max(inboundMs, e.last_ai_nudge_at ? new Date(e.last_ai_nudge_at).getTime() : 0);
  return now.getTime() - anchor >= HUMAN_REPLY_SLA_HOURS * 3_600_000;
}

export function fallbackNudge(ctx: TemplateCtx, attempt: number): { subject: string; body: string } {
  if (attempt <= 0) {
    return {
      subject: `Following up on your message, ${ctx.firstName}`,
      body: `Hi ${ctx.firstName}, thanks for replying! Our team is preparing a proper answer for you and will be in touch shortly. If it's urgent, just let us know a good time to call. — ${ctx.brand}`,
    };
  }
  return {
    subject: `Still here for you, ${ctx.firstName}`,
    body: `Hi ${ctx.firstName}, sorry for the wait — we haven't forgotten you. ${ctx.owner} will reach out personally very soon. Reply with a convenient time and we'll call you. — ${ctx.brand}`,
  };
}
