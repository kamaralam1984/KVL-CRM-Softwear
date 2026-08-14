// AI Sales Copilot — server actions backing the 6 tools in AIInsights.tsx.
//
// Same pattern as lib/advisor/index.ts: real CRM context is pulled through the
// existing fail-soft server actions (getLeads/getDeals), Claude is called only
// when ANTHROPIC_API_KEY is set (wrapped in try/catch, strict JSON reply,
// returns null on any failure), and a pure heuristic function template-fills a
// genuinely useful, data-driven response otherwise. None of these functions
// ever throw.

"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getLeads } from "@/lib/actions/leads";
import { getDeals } from "@/lib/actions/deals";

const MODEL = "claude-sonnet-4-6";

async function askClaude<T>(
  system: string,
  userContent: string,
  maxTokens = 900,
): Promise<T | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch (err) {
    console.error("[aiInsights] Claude call failed, using heuristic:", err);
    return null;
  }
}

async function findLeadByName(name: string) {
  try {
    const leads = await getLeads();
    const norm = name.trim().toLowerCase();
    return leads.find((l) => String(l.name).trim().toLowerCase() === norm) ?? null;
  } catch {
    return null;
  }
}

const usdFull = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usdAbbrev = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
};

// ─── 1. Email Writer ──────────────────────────────────────────────────────────

export type EmailDraft = { subject: string; body: string };

export async function generateEmailDraft(input: {
  leadName: string;
  company: string;
  dealValue: string;
  emailType: string;
}): Promise<EmailDraft> {
  const lead = await findLeadByName(input.leadName);
  const context = {
    leadName: input.leadName,
    company: input.company,
    dealValue: input.dealValue,
    emailType: input.emailType,
    stage: lead ? String(lead.stage) : undefined,
    score: lead ? Number(lead.score) : undefined,
    owner: lead ? String(lead.owner) : undefined,
    tags: lead ? lead.tags : undefined,
  };

  const ai = await askClaude<EmailDraft>(
    "You are a top B2B sales rep writing a real outbound email inside a CRM tool. " +
      "Given the lead and deal context and the requested email type, write a subject line and full email body. " +
      "Be specific, reference the company name and deal value naturally, and match tone to the email type " +
      "(Follow-up: warm and consultative; Cold Outreach: attention-grabbing with concrete value props; " +
      "Proposal: structured with an executive summary and key deliverables; Reminder: brief, friendly urgency). " +
      'Reply ONLY with a JSON object {"subject": string, "body": string}. No prose, no markdown fences.',
    `Context:\n${JSON.stringify(context, null, 2)}`,
  );
  if (ai?.subject && ai?.body) return ai;
  return heuristicEmail(context);
}

function heuristicEmail(input: {
  leadName: string;
  company: string;
  dealValue: string;
  emailType: string;
  stage?: string;
}): EmailDraft {
  const firstName = input.leadName.split(" ")[0];
  const dealNum = Number(input.dealValue);
  const deal = dealNum > 0 ? usdFull(dealNum) : "";
  const stageLine = input.stage ? ` — currently at the ${input.stage} stage` : "";

  switch (input.emailType) {
    case "Cold Outreach":
      return {
        subject: `${input.company} × Your CRM — Increase Revenue by 30%`,
        body: `Hi ${firstName},\n\nI came across ${input.company} and was impressed by your recent growth. Companies like yours are using our AI-powered CRM to close deals 2x faster.\n\nHere's what we've delivered for similar teams:\n• 35% increase in qualified pipeline\n• 22% reduction in sales cycle length\n• Real-time AI lead scoring\n\nI'd love to show you a 15-minute personalized demo — no pitch, just value.\n\nAre you free next Tuesday or Wednesday?\n\nBest,\nYour Name`,
      };
    case "Proposal":
      return {
        subject: `Proposal for ${input.company} — CRM Solution${deal ? ` (${deal})` : ""}`,
        body: `Hi ${firstName},\n\nThank you for the productive conversations we've had${stageLine}. As promised, I've prepared a tailored proposal for ${input.company}.\n\nEXECUTIVE SUMMARY\nBased on your requirements, we propose a comprehensive CRM implementation${deal ? ` valued at ${deal}` : ""}, covering AI-powered sales automation, analytics, and onboarding support.\n\nKEY DELIVERABLES\n• Full CRM deployment within 2 weeks\n• Dedicated onboarding specialist\n• 90-day success guarantee\n• Monthly strategic reviews\n\nI've attached the full proposal document. Shall we schedule a call to walk through it together?\n\nWarm regards,\nYour Name`,
      };
    case "Reminder":
      return {
        subject: `Quick reminder — ${input.company} proposal expiring soon`,
        body: `Hi ${firstName},\n\nJust a friendly reminder that the proposal we sent for ${input.company} is valid until end of this month.\n\nI know things get busy, so I wanted to make sure it doesn't slip through the cracks. Our team is ready to get started as soon as you give the green light.\n\nIf you have any questions or need adjustments, I'm happy to jump on a quick call.\n\nBest,\nYour Name`,
      };
    case "Follow-up":
    default:
      return {
        subject: `Following up on our conversation — ${input.company}`,
        body: `Hi ${firstName},\n\nI hope you're having a great week! I wanted to follow up on our recent conversation about how our CRM platform can help ${input.company} streamline your sales pipeline${stageLine}.\n\nBased on your team's goals, I believe our AI Insights module could help you identify high-value opportunities faster and reduce manual follow-up time by up to 40%.\n\nWould you be open to a 20-minute call this week to explore the specifics? I have availability on Thursday or Friday afternoon.\n\nLooking forward to connecting,\n\nBest regards,\nYour Name`,
      };
  }
}

// ─── 2. WhatsApp Reply ────────────────────────────────────────────────────────

export type WhatsAppReplyOption = { tone: string; text: string };

export async function generateWhatsAppReplies(input: {
  contactName: string;
  company: string;
  incomingMessage: string;
  context?: string;
}): Promise<WhatsAppReplyOption[]> {
  const lead = await findLeadByName(input.contactName);
  const ctx = {
    contactName: input.contactName,
    company: input.company,
    incomingMessage: input.incomingMessage,
    userContext: input.context || undefined,
    dealStage: lead ? String(lead.stage) : undefined,
    dealValue: lead ? Number(lead.value) : undefined,
  };

  const ai = await askClaude<{ replies: WhatsAppReplyOption[] }>(
    "You are a sales rep replying to a WhatsApp message from a lead inside a CRM. " +
      "Given the incoming message and any extra context, write exactly 3 reply options, one each in tone " +
      '"Formal", "Friendly", and "Follow-up". Keep each reply under 400 characters, natural, and specific to the message. ' +
      'Reply ONLY with a JSON object {"replies": [{"tone": string, "text": string}, ...]}. No prose, no markdown fences.',
    `Context:\n${JSON.stringify(ctx, null, 2)}`,
  );
  if (ai?.replies && Array.isArray(ai.replies) && ai.replies.length === 3) return ai.replies;
  return heuristicWhatsAppReplies(ctx);
}

function heuristicWhatsAppReplies(ctx: {
  contactName: string;
  company: string;
  userContext?: string;
}): WhatsAppReplyOption[] {
  const firstName = ctx.contactName.split(" ")[0];
  return [
    {
      tone: "Formal",
      text: `Thank you for reaching out, ${firstName}. I'd be happy to arrange a product demonstration for ${ctx.company} at your earliest convenience. Please let me know your preferred date and time, and I will confirm accordingly.${ctx.userContext ? ` ${ctx.userContext}` : ""}`,
    },
    {
      tone: "Friendly",
      text: `Hey ${firstName}! Great to hear from you 😊 Absolutely, let's set up a quick demo for ${ctx.company} — it'll only take 20 mins and I think you'll love what we've built. When works best for you this week?`,
    },
    {
      tone: "Follow-up",
      text: `Hi ${firstName}! Thanks for getting back to me. I just wanted to make sure we don't lose momentum on ${ctx.company}'s evaluation — I've reserved a demo slot for Thursday 3pm. Does that work, or should I find another time?`,
    },
  ];
}

// ─── 3. Meeting Notes ─────────────────────────────────────────────────────────

export type MeetingNotesResult = {
  keyPoints: Record<string, string>;
  actionItems: string[];
};

export async function generateMeetingNotes(input: {
  attendees: string;
  duration: string;
  topics: string[];
}): Promise<MeetingNotesResult> {
  const leadName = input.attendees.match(/^[^+(]+/)?.[0]?.trim() ?? input.attendees;
  const lead = await findLeadByName(leadName);
  const ctx = {
    attendees: input.attendees,
    duration: input.duration,
    topics: input.topics,
    leadName,
    company: lead ? String(lead.company) : undefined,
    stage: lead ? String(lead.stage) : undefined,
    dealValue: lead ? Number(lead.value) : undefined,
  };

  const ai = await askClaude<MeetingNotesResult>(
    "You are a sales rep summarizing a CRM meeting. Given attendees, duration, discussed topics, and any known deal " +
      "context, write one realistic discussion-point sentence PER topic (keyed by the exact topic string given) and " +
      "2-4 concrete action items with owners/deadlines. " +
      'Reply ONLY with a JSON object {"keyPoints": {"<topic>": string, ...}, "actionItems": string[]}. No prose, no markdown fences.',
    `Context:\n${JSON.stringify(ctx, null, 2)}`,
  );
  if (ai?.keyPoints && Array.isArray(ai.actionItems)) return ai;
  return heuristicMeetingNotes(ctx);
}

function heuristicMeetingNotes(ctx: {
  leadName: string;
  company?: string;
  topics: string[];
  dealValue?: number;
}): MeetingNotesResult {
  const company = ctx.company ?? "the client";
  const firstName = ctx.leadName.split(" ")[0];
  const pointTemplates: Record<string, string> = {
    Demo: `Product demo completed for ${company} — strong positive reaction to the AI Insights module and dashboard.`,
    Pricing: `Pricing discussed: ${company}'s budget appears to align with our recommended plan${ctx.dealValue ? ` (~${usdFull(ctx.dealValue)} deal)` : ""}.`,
    Objections: `Objection raised around data security and compliance — to be addressed in a follow-up email.`,
    "Next Steps": `Agreed on next steps with ${firstName} — a pilot/trial to start within the next two weeks.`,
    "Technical Review": `Technical architecture reviewed with ${company}'s team — integration feasibility confirmed.`,
    Contract: `Contract terms discussed with ${company} — legal review expected within 5 business days.`,
  };
  const keyPoints: Record<string, string> = {};
  for (const t of ctx.topics) {
    keyPoints[t] = pointTemplates[t] ?? `${t} discussed with ${company}.`;
  }
  const actionItems = [
    `Send pricing deck to ${firstName} by EOD tomorrow`,
    `Schedule technical deep-dive with ${company}'s engineering team`,
    `Prepare ROI analysis based on ${company}'s current workflow`,
    ctx.topics.includes("Objections") ? "Address security/compliance concerns in a follow-up email" : null,
    ctx.topics.includes("Next Steps") ? "Set up a 30-day trial account by Friday" : null,
  ].filter((x): x is string => !!x);
  return { keyPoints, actionItems };
}

// ─── 4. Call Summary ──────────────────────────────────────────────────────────

export type CallSummaryResult = {
  points: string[];
  objections: string[];
  nextAction: string;
  sentiment: "positive" | "neutral" | "negative";
};

// Call types don't map 1:1 onto deal stages, but they're close enough to pull
// a real, relevant deal for context instead of inventing one.
const CALL_STAGE_MAP: Record<string, string> = {
  Discovery: "Discovery",
  Demo: "Proposal",
  Negotiation: "Negotiation",
  Closing: "Closed Won",
};

export async function generateCallSummary(input: {
  duration: string;
  callType: string;
}): Promise<CallSummaryResult> {
  let dealContext:
    | { name: string; company: string; value: number; daysInStage: number; probability: number }
    | undefined;
  try {
    const deals = await getDeals();
    const stage = CALL_STAGE_MAP[input.callType] ?? input.callType;
    const matches = deals
      .filter((d) => String(d.stage) === stage)
      .sort((a, b) => Number(b.value) - Number(a.value));
    if (matches[0]) {
      const d = matches[0];
      dealContext = {
        name: String(d.name),
        company: String(d.company),
        value: Number(d.value),
        daysInStage: Number(d.daysInStage),
        probability: Number(d.probability),
      };
    }
  } catch {
    // no deal context available — templates below handle the undefined case
  }

  const ctx = { duration: input.duration, callType: input.callType, deal: dealContext };

  const ai = await askClaude<CallSummaryResult>(
    "You are a sales rep logging a call summary in a CRM. Given the call type, duration, and (if present) the real " +
      "deal this call likely relates to, write 3-4 realistic key discussion points, 0-3 objections raised, one " +
      'concrete next action, and an overall sentiment ("positive", "neutral", or "negative"). Reference the real ' +
      "deal/company name if given, don't invent unrelated companies. " +
      'Reply ONLY with a JSON object {"points": string[], "objections": string[], "nextAction": string, "sentiment": "positive"|"neutral"|"negative"}. No prose, no markdown fences.',
    `Context:\n${JSON.stringify(ctx, null, 2)}`,
  );
  if (ai?.points && ai?.nextAction && ai?.sentiment) return ai;
  return heuristicCallSummary(ctx);
}

function heuristicCallSummary(ctx: {
  duration: string;
  callType: string;
  deal?: { name: string; company: string; value: number; daysInStage: number; probability: number };
}): CallSummaryResult {
  const company = ctx.deal?.company ?? "the prospect";
  const dealName = ctx.deal?.name;
  const valueStr = ctx.deal ? usdFull(ctx.deal.value) : undefined;

  const templates: Record<string, CallSummaryResult> = {
    Discovery: {
      points: [
        `Discussed ${company}'s current pain points around lead tracking${dealName ? ` on the ${dealName} deal` : ""}`,
        "Reviewed team size and current tooling",
        valueStr ? `Deal sized at approximately ${valueStr}` : "Budget range still being scoped",
        `Call ran ${ctx.duration} minutes — good engagement throughout`,
      ],
      objections: ["Concerned about migration complexity", "Wants to see integration with existing tools"],
      nextAction: `Send technical integration overview to ${company} and schedule a demo within 3 days`,
      sentiment: "positive",
    },
    Demo: {
      points: [
        `Live demo walked through with ${company}`,
        "AI Insights module resonated strongly",
        "Analytics dashboard praised for real-time visibility",
        `Call ran ${ctx.duration} minutes`,
      ],
      objections: ["Pricing higher than current tool", "Needs internal approval"],
      nextAction: `Prepare an ROI calculator and business case document for ${company}`,
      sentiment: "positive",
    },
    Negotiation: {
      points: [
        `Pricing discussion with ${company}${valueStr ? ` — deal currently valued at ${valueStr}` : ""}`,
        "Annual contract preferred over monthly",
        ctx.deal ? `Deal has been ${ctx.deal.daysInStage} days in this stage` : "Timeline discussed",
        `Call ran ${ctx.duration} minutes`,
      ],
      objections: ["Budget constrained for this quarter", "Legal review may delay signing"],
      nextAction: `Submit a revised proposal referencing ${company} by end of day`,
      sentiment: "neutral",
    },
    Closing: {
      points: [
        `Stakeholders at ${company} aligned on moving forward`,
        "Contract terms reviewed",
        "Kick-off timeline discussed",
        `Call ran ${ctx.duration} minutes`,
      ],
      objections: ["Minor clause on data portability to be updated"],
      nextAction: `Finalize contract clauses and send for signature to ${company}`,
      sentiment: "positive",
    },
  };

  return templates[ctx.callType] ?? templates.Discovery;
}

// ─── 5. Proposal Generator ────────────────────────────────────────────────────

export type ProposalSection = { title: string; content: string };

export async function generateProposalDraft(input: {
  company: string;
  dealValue: string;
  modules: string[];
}): Promise<{ sections: ProposalSection[] }> {
  const leads = await getLeads().catch(() => []);
  const lead = leads.find(
    (l) => String(l.company).trim().toLowerCase() === input.company.trim().toLowerCase(),
  );
  const ctx = {
    company: input.company,
    dealValue: input.dealValue,
    modules: input.modules,
    leadName: lead ? String(lead.name) : undefined,
    stage: lead ? String(lead.stage) : undefined,
  };

  const ai = await askClaude<{ sections: ProposalSection[] }>(
    "You are a sales rep drafting a short commercial proposal inside a CRM. Given the company, deal value, selected " +
      "modules, and (if known) the lead contact and deal stage, write exactly 4 sections in order: " +
      '"Executive Summary", "Solution Overview", "Pricing", "Next Steps". ' +
      'Reply ONLY with a JSON object {"sections": [{"title": string, "content": string}, ...]}. No prose, no markdown fences.',
    `Context:\n${JSON.stringify(ctx, null, 2)}`,
  );
  if (ai?.sections && Array.isArray(ai.sections) && ai.sections.length > 0) return ai;
  return { sections: heuristicProposalSections(ctx) };
}

function heuristicProposalSections(ctx: {
  company: string;
  dealValue: string;
  modules: string[];
  leadName?: string;
  stage?: string;
}): ProposalSection[] {
  const formatted = Number(ctx.dealValue || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const contactLine = ctx.leadName ? ` Prepared for ${ctx.leadName}.` : "";

  return [
    {
      title: "Executive Summary",
      content: `We are pleased to present this proposal to ${ctx.company} for an AI-powered CRM solution designed to accelerate your sales growth.${contactLine} Based on our discovery sessions, we have tailored a solution that directly addresses your pipeline visibility and automation needs.`,
    },
    {
      title: "Solution Overview",
      content: ctx.modules.length
        ? `Your package includes: ${ctx.modules.join(", ")}. Each module is fully integrated, with unified reporting and a single sign-on experience for your entire team.`
        : "Please select modules above to include in this section.",
    },
    {
      title: "Pricing",
      content: `Total investment: ${formatted}\n• Annual contract (save 20% vs monthly)\n• Includes onboarding, training & 12-month support\n• ${ctx.modules.length} module${ctx.modules.length === 1 ? "" : "s"} as selected above`,
    },
    {
      title: "Next Steps",
      content: `1. Review and sign proposal (DocuSign link)\n2. Kick-off call within 48 hours of signing\n3. Full deployment live within 14 business days\n4. 30-day hypercare support included${ctx.stage ? `\n\nCurrent deal stage: ${ctx.stage}` : ""}`,
    },
  ];
}

// ─── 6. Sales Forecast ────────────────────────────────────────────────────────

export type SalesForecastResult = {
  revenue: string;
  pipeline: string;
  winRate: number;
  atRisk: string;
  bars: { label: string; value: number }[];
};

const FORECAST_PERIOD_MULTIPLIER: Record<string, number> = {
  "This Month": 1,
  "This Quarter": 3,
  "This Year": 12,
};

export async function generateSalesForecast(input: {
  period: string;
  confidence: string;
}): Promise<SalesForecastResult> {
  const deals = await getDeals().catch(() => []);
  const isWon = (s: string) => /won/i.test(s);
  const isLost = (s: string) => /lost/i.test(s);
  const openDeals = deals.filter((d) => !isWon(String(d.stage)) && !isLost(String(d.stage)));
  const wonDeals = deals.filter((d) => isWon(String(d.stage)));
  const lostDeals = deals.filter((d) => isLost(String(d.stage)));

  const pipelineValue = openDeals.reduce((t, d) => t + Number(d.value), 0);
  const weightedForecast = openDeals.reduce(
    (t, d) => t + Number(d.value) * (Number(d.probability) / 100),
    0,
  );
  const closedCount = wonDeals.length + lostDeals.length;
  const winRate =
    closedCount > 0
      ? Math.round((wonDeals.length / closedCount) * 100)
      : wonDeals.length + openDeals.length > 0
        ? Math.round((wonDeals.length / (wonDeals.length + openDeals.length)) * 100)
        : 0;

  const staleThresholdDays = 7;
  const atRiskDeals = openDeals.filter((d) => Number(d.daysInStage) >= staleThresholdDays);
  const atRiskValue = atRiskDeals.reduce((t, d) => t + Number(d.value), 0);

  const stageAvgProb = (stage: string) => {
    const list = deals.filter((d) => String(d.stage) === stage);
    return list.length
      ? Math.round(list.reduce((t, d) => t + Number(d.probability), 0) / list.length)
      : 0;
  };
  const bars = [
    { label: "Qualified", value: stageAvgProb("Qualified") },
    { label: "Proposal", value: stageAvgProb("Proposal") },
    { label: "Negotiation", value: stageAvgProb("Negotiation") },
    {
      label: "Closing",
      value: openDeals.length ? Math.round(Math.max(...openDeals.map((d) => Number(d.probability)))) : 0,
    },
  ];

  const multiplier = FORECAST_PERIOD_MULTIPLIER[input.period] ?? 1;
  const predictedRevenue = weightedForecast * multiplier;

  const metrics = {
    period: input.period,
    confidence: input.confidence,
    pipelineValue,
    weightedForecast,
    predictedRevenue,
    winRate,
    atRiskValue,
    bars,
  };

  const ai = await askClaude<SalesForecastResult>(
    "You are a CRM sales-forecasting assistant. Given real computed pipeline metrics (from actual open/won/lost " +
      "deals), format a forecast for the requested period. The numbers you return MUST stay consistent with and " +
      "derived from the given metrics — do not invent unrelated figures. revenue = formatted predicted revenue " +
      '(e.g. "$167,400"), pipeline = formatted open pipeline value (e.g. "$2.4M"), winRate = integer percent, ' +
      'atRisk = formatted at-risk value (e.g. "$186K"), bars = the given bars array unchanged or lightly rounded. ' +
      'Reply ONLY with a JSON object {"revenue": string, "pipeline": string, "winRate": number, "atRisk": string, "bars": [{"label": string, "value": number}]}. No prose, no markdown fences.',
    `Real computed metrics:\n${JSON.stringify(metrics, null, 2)}`,
  );
  if (ai?.revenue && ai?.pipeline && Array.isArray(ai.bars) && ai.bars.length > 0) return ai;

  return {
    revenue: usdFull(predictedRevenue),
    pipeline: usdAbbrev(pipelineValue),
    winRate,
    atRisk: usdAbbrev(atRiskValue),
    bars,
  };
}
