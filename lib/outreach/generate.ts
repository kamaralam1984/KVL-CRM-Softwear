// Generates channel-appropriate outreach copy for a single lead.
//
// If ANTHROPIC_API_KEY is set, Claude writes personalized copy tuned to the
// channel's constraints, using the lead's company/industry and (when supplied)
// the opportunity headline/services as pitch material. If the key is missing or
// the call fails, a clean per-channel template is used instead. Never throws.

import Anthropic from "@anthropic-ai/sdk";
import type {
  OutreachChannel,
  OutreachContent,
  OutreachContext,
} from "./types";

const ALL_CHANNELS: OutreachChannel[] = [
  "email",
  "whatsapp",
  "sms",
  "linkedin",
  "follow_up",
  "proposal_intro",
];

// Per-channel guidance handed to the model.
const CHANNEL_BRIEF: Record<OutreachChannel, string> = {
  email:
    "A cold email. Provide a compelling subject and a body under 120 words. Warm, specific, one soft CTA.",
  whatsapp:
    "A WhatsApp message under 40 words. Friendly, concise, one soft CTA. No subject.",
  sms: "An SMS under 40 words. Plain text, one soft CTA, include 'Reply STOP to opt out.'. No subject.",
  linkedin:
    "A LinkedIn connection request / DM note under 300 characters. Professional, no fluff, no hard sell. No subject.",
  follow_up:
    "A gentle follow-up nudge that references the previous message without guilt-tripping. Under 90 words. No subject.",
  proposal_intro:
    "A 2-3 sentence intro to a proposal that cites the specific services being recommended. Professional and confident. No subject.",
};

export async function generateOutreach(
  channel: OutreachChannel,
  ctx: OutreachContext,
): Promise<OutreachContent> {
  const ai = await tryAi(channel, ctx);
  if (ai) return ai;
  return template(channel, ctx);
}

export async function generateAllChannels(
  ctx: OutreachContext,
  channels: OutreachChannel[] = ALL_CHANNELS,
): Promise<OutreachContent[]> {
  return Promise.all(channels.map((c) => generateOutreach(c, ctx)));
}

// --- AI path ---------------------------------------------------------------

async function tryAi(
  channel: OutreachChannel,
  ctx: OutreachContext,
): Promise<OutreachContent | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic();
    const wantsSubject = channel === "email";
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system:
        "You write warm, non-spammy, personalized B2B outreach. No fake claims, no clichés. " +
        `Task: ${CHANNEL_BRIEF[channel]} ` +
        `Reply ONLY with JSON: ${
          wantsSubject ? '{"subject":"...","body":"..."}' : '{"body":"..."}'
        }. No markdown, no commentary.`,
      messages: [
        { role: "user", content: buildPrompt(channel, ctx) },
      ],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as { subject?: string; body?: string };
    if (!parsed.body || !parsed.body.trim()) return null;
    return {
      channel,
      ...(wantsSubject && parsed.subject
        ? { subject: parsed.subject.trim() }
        : {}),
      body: parsed.body.trim(),
      usedAi: true,
    };
  } catch (err) {
    console.error("[outreach] AI generation failed, using template:", err);
    return null;
  }
}

function buildPrompt(channel: OutreachChannel, ctx: OutreachContext): string {
  const { lead, opportunity: opp } = ctx;
  const sender = ctx.senderName ?? "the sender";
  const company = ctx.senderCompany ?? "our company";
  const lines: string[] = [
    `Sender: ${sender} from ${company}.`,
    `Lead: ${lead.company}${lead.industry ? ` (${lead.industry})` : ""}.`,
  ];
  if (lead.location) lines.push(`Location: ${lead.location}.`);
  if (ctx.offer) lines.push(`Offer: ${ctx.offer}.`);
  if (opp?.headline) lines.push(`Opportunity: ${opp.headline}.`);
  if (opp?.services?.length) {
    lines.push(
      `Recommended services: ${opp.services
        .map((s) => s.name)
        .join(", ")}.`,
    );
  }
  if (ctx.calendarLink) lines.push(`Booking link: ${ctx.calendarLink}.`);
  if (channel === "follow_up" && ctx.previousMessage) {
    lines.push(`Previous message we sent:\n${ctx.previousMessage}`);
  }
  lines.push(`Channel: ${channel}.`);
  return lines.join("\n");
}

// --- Template fallback -----------------------------------------------------

function template(
  channel: OutreachChannel,
  ctx: OutreachContext,
): OutreachContent {
  const { lead, opportunity: opp } = ctx;
  const sender = ctx.senderName ?? "the team";
  const company = ctx.senderCompany ?? "our team";
  const offer = ctx.offer ?? opp?.headline ?? "a few ideas to help your business grow";
  const cta = ctx.calendarLink
    ? `Book a quick chat: ${ctx.calendarLink}`
    : "Open to a quick chat?";
  const services = opp?.services?.map((s) => s.name).join(", ");

  switch (channel) {
    case "email":
      return {
        channel,
        subject: `Quick idea for ${lead.company}`,
        body: `Hi ${lead.company} team,\n\n${offer} — I think it could help ${lead.company}${
          services ? `, especially around ${services}` : ""
        }. ${cta}\n\nBest,\n${sender}\n${company}`,
        usedAi: false,
      };
    case "whatsapp":
      return {
        channel,
        body: `Hi! ${sender} from ${company}. ${offer} for ${lead.company}. ${cta}`,
        usedAi: false,
      };
    case "sms":
      return {
        channel,
        body: `${company}: ${offer} for ${lead.company}. ${cta} Reply STOP to opt out.`,
        usedAi: false,
      };
    case "linkedin":
      return {
        channel,
        body: `Hi — I came across ${lead.company}${
          lead.industry ? ` in ${lead.industry}` : ""
        } and had a few ideas${
          services ? ` around ${services}` : ""
        }. Would love to connect. — ${sender}, ${company}`.slice(0, 300),
        usedAi: false,
      };
    case "follow_up":
      return {
        channel,
        body: `Hi ${lead.company} team,\n\nJust following up on my last note${
          ctx.previousMessage ? " about " + offer : ""
        }. No pressure at all — happy to share more whenever it's useful. ${cta}\n\nBest,\n${sender}`,
        usedAi: false,
      };
    case "proposal_intro":
      return {
        channel,
        body: `Thank you for the opportunity to work with ${lead.company}. Based on our review${
          opp?.headline ? ` — ${opp.headline}` : ""
        }, we've put together a proposal${
          services ? ` covering ${services}` : ""
        }. The following pages outline our recommended approach and the value it delivers.`,
        usedAi: false,
      };
    default:
      return { channel, body: offer, usedAi: false };
  }
}
