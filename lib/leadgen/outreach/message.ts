// AI writes personalized outreach copy for each lead, tailored per channel.
// Falls back to a clean template if no ANTHROPIC_API_KEY / the call fails.

import Anthropic from "@anthropic-ai/sdk";
import type { ScoredLead } from "../types";
import type { OutreachChannel, OutreachMessage, SenderProfile } from "./types";

export async function generateMessage(
  lead: ScoredLead,
  channels: OutreachChannel[],
  sender: SenderProfile,
): Promise<OutreachMessage> {
  const ai = await tryAi(lead, channels, sender);
  if (ai) return ai;
  return templateMessage(lead, channels, sender);
}

async function tryAi(
  lead: ScoredLead,
  channels: OutreachChannel[],
  sender: SenderProfile,
): Promise<OutreachMessage | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system:
        "You write short, warm, non-spammy B2B cold outreach. Personalize to the lead's business. No fake claims. Keep email under 90 words, whatsapp/sms under 40 words, always include a soft CTA. Reply ONLY with JSON matching the requested channels: {email:{subject,body},whatsapp:{body},sms:{body},call:{talkingPoints}}. Only include requested keys.",
      messages: [
        {
          role: "user",
          content: `Sender: ${sender.senderName} from ${sender.senderCompany}.
Offer: ${sender.offer}
${sender.calendarLink ? `Booking link: ${sender.calendarLink}` : ""}
Lead: ${lead.company} (${lead.tags.join(", ") || "business"}), score ${lead.score}.
Channels needed: ${channels.join(", ")}.`,
        },
      ],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    return JSON.parse(json) as OutreachMessage;
  } catch (err) {
    console.error("[outreach] AI message failed, using template:", err);
    return null;
  }
}

function templateMessage(
  lead: ScoredLead,
  channels: OutreachChannel[],
  s: SenderProfile,
): OutreachMessage {
  const cta = s.calendarLink ? `Book a quick chat: ${s.calendarLink}` : "Open to a quick chat?";
  const out: OutreachMessage = {};
  if (channels.includes("email"))
    out.email = {
      subject: `Quick idea for ${lead.company}`,
      body: `Hi ${lead.company} team,\n\n${s.offer} — I think it could help ${lead.company}. ${cta}\n\nBest,\n${s.senderName}\n${s.senderCompany}`,
    };
  if (channels.includes("whatsapp"))
    out.whatsapp = { body: `Hi! ${s.senderName} from ${s.senderCompany}. ${s.offer} for ${lead.company}. ${cta}` };
  if (channels.includes("sms"))
    out.sms = { body: `${s.senderCompany}: ${s.offer}. ${cta} Reply STOP to opt out.` };
  if (channels.includes("call"))
    out.call = { talkingPoints: `Intro ${s.senderCompany}. Pitch: ${s.offer}. Ask about ${lead.company}'s current setup. Goal: book a demo.` };
  return out;
}
