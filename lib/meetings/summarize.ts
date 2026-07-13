// Turn a meeting transcript into a structured summary. If ANTHROPIC_API_KEY is
// set, Claude extracts summary/keyPoints/actionItems(with owners)/sentiment/
// crmUpdates. Otherwise a deterministic heuristic does a best-effort pass so the
// pipeline never breaks. Mirrors lib/leadgen/score.ts's Anthropic-optional
// pattern. Never throws.

import Anthropic from "@anthropic-ai/sdk";
import type { ActionItem, MeetingInput, MeetingSummary } from "./types";

type AiResult = {
  summary?: string;
  keyPoints?: string[];
  actionItems?: ActionItem[];
  sentiment?: string;
  crmUpdates?: string[];
};

export async function summarizeMeeting(input: MeetingInput): Promise<MeetingSummary> {
  const transcript = (input?.transcript ?? "").trim();
  const title = deriveTitle(input);

  if (!transcript) {
    return {
      title,
      summary: "",
      keyPoints: [],
      actionItems: [],
      sentiment: "neutral",
      crmUpdates: [],
      usedAi: false,
    };
  }

  const ai = await askAi(input, transcript);
  if (ai) {
    return {
      title,
      summary: ai.summary?.trim() || heuristicSummary(transcript),
      keyPoints: ai.keyPoints?.length ? ai.keyPoints : heuristicKeyPoints(transcript),
      actionItems: ai.actionItems?.length ? ai.actionItems : heuristicActionItems(transcript),
      sentiment: ai.sentiment?.trim() || heuristicSentiment(transcript),
      crmUpdates: ai.crmUpdates ?? [],
      usedAi: true,
    };
  }

  // Heuristic fallback.
  return {
    title,
    summary: heuristicSummary(transcript),
    keyPoints: heuristicKeyPoints(transcript),
    actionItems: heuristicActionItems(transcript),
    sentiment: heuristicSentiment(transcript),
    crmUpdates: heuristicCrmUpdates(input, transcript),
    usedAi: false,
  };
}

function deriveTitle(input: MeetingInput): string {
  if (input?.title?.trim()) return input.title.trim();
  const who = input?.company?.trim();
  const when = input?.date?.trim();
  const parts = ["Meeting"];
  if (who) parts.push(`with ${who}`);
  if (when) parts.push(`(${when})`);
  return parts.join(" ");
}

async function askAi(input: MeetingInput, transcript: string): Promise<AiResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic();
    const context = [
      input.title ? `Title: ${input.title}` : "",
      input.company ? `Company: ${input.company}` : "",
      input.attendees?.length ? `Attendees: ${input.attendees.join(", ")}` : "",
      input.date ? `Date: ${input.date}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system:
        "You are a sales meeting analyst. From the transcript, produce a concise summary, " +
        "3-6 key points, action items (each with an owner if the transcript names one), an " +
        "overall sentiment (positive|neutral|negative), and suggested CRM updates (e.g. move " +
        "deal stage, log next step, update contact). Reply ONLY with a JSON object: " +
        '{"summary": string, "keyPoints": string[], "actionItems": [{"text": string, "owner"?: string}], ' +
        '"sentiment": string, "crmUpdates": string[]}. No prose, no markdown.',
      messages: [
        {
          role: "user",
          content: `${context ? context + "\n\n" : ""}Transcript:\n${transcript}`,
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    return JSON.parse(json) as AiResult;
  } catch (err) {
    console.error("[meetings] AI summarize failed, using heuristic:", err);
    return null;
  }
}

// --- Heuristic helpers (deterministic, no network) ---

function splitSentences(transcript: string): string[] {
  return transcript
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function heuristicSummary(transcript: string): string {
  const sentences = splitSentences(transcript);
  return sentences.slice(0, 3).join(" ") || transcript.slice(0, 280);
}

function heuristicKeyPoints(transcript: string): string[] {
  return splitSentences(transcript).slice(0, 5);
}

const ACTION_KEYWORDS = [
  "will ",
  "action",
  "follow up",
  "follow-up",
  "todo",
  "to-do",
  "next step",
  "let's ",
  "lets ",
  "i'll ",
  "we'll ",
  "need to",
  "should ",
  "assign",
];

function heuristicActionItems(transcript: string): ActionItem[] {
  const items: ActionItem[] = [];
  for (const sentence of splitSentences(transcript)) {
    const lower = sentence.toLowerCase();
    if (ACTION_KEYWORDS.some((k) => lower.includes(k))) {
      items.push({ text: sentence, owner: guessOwner(sentence) });
      if (items.length >= 10) break;
    }
  }
  return items;
}

// Best-effort owner guess: a capitalized name immediately before "will"/"to".
function guessOwner(sentence: string): string | undefined {
  const m = sentence.match(/\b([A-Z][a-z]+)\s+(?:will|to|should|is going to)\b/);
  return m?.[1];
}

function heuristicSentiment(transcript: string): string {
  const lower = transcript.toLowerCase();
  const pos = ["great", "excited", "happy", "love", "agree", "yes", "perfect", "interested"];
  const neg = ["concern", "problem", "issue", "not sure", "disappointed", "no ", "delay", "worried"];
  const score =
    pos.filter((w) => lower.includes(w)).length - neg.filter((w) => lower.includes(w)).length;
  if (score > 1) return "positive";
  if (score < -1) return "negative";
  return "neutral";
}

function heuristicCrmUpdates(input: MeetingInput, transcript: string): string[] {
  const updates: string[] = [];
  const who = input?.company?.trim();
  updates.push(`Log meeting note${who ? ` for ${who}` : ""}.`);
  const lower = transcript.toLowerCase();
  if (lower.includes("demo")) updates.push("Record that a product demo was discussed.");
  if (lower.includes("proposal") || lower.includes("quote") || lower.includes("pricing"))
    updates.push("Follow up with pricing/proposal.");
  if (lower.includes("contract") || lower.includes("sign"))
    updates.push("Advance deal stage toward contract.");
  return updates;
}
