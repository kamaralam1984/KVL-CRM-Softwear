// Post-call transcript analysis. When ANTHROPIC_API_KEY is set, Claude produces
// a summary, sentiment, and action items. Otherwise a deterministic heuristic
// runs (keyword sentiment + naive action-item extraction). analyzeCall NEVER
// throws — any AI failure falls back to the heuristic so the pipeline is safe.

import Anthropic from "@anthropic-ai/sdk";
import type { CallAnalysis, CallSentiment } from "./types";

const POSITIVE_WORDS = [
  "interested", "great", "yes", "love", "perfect", "definitely", "excited",
  "happy", "sounds good", "let's do", "sign up", "buy", "agree", "wonderful",
];
const NEGATIVE_WORDS = [
  "not interested", "no thanks", "expensive", "too much", "unhappy", "cancel",
  "problem", "issue", "disappointed", "never", "stop calling", "remove me",
  "bad", "frustrated", "angry",
];
const ACTION_CUES = [
  "follow up", "send", "email", "call back", "schedule", "demo", "quote",
  "proposal", "next week", "tomorrow", "reach out", "book", "meeting",
];

export async function analyzeCall(transcript: string): Promise<CallAnalysis> {
  const text = (transcript ?? "").trim();
  if (!text) {
    return {
      transcript: "",
      summary: "No transcript was provided.",
      sentiment: "neutral",
      actionItems: [],
      usedAi: false,
    };
  }

  const ai = await askAi(text);
  if (ai) return ai;

  return heuristicAnalyze(text);
}

async function askAi(transcript: string): Promise<CallAnalysis | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system:
        "You are a sales-call analyst. Given a call transcript, summarize the " +
        "conversation in 1-3 sentences, classify overall customer sentiment, and " +
        "list concrete follow-up action items. Reply ONLY with a JSON object: " +
        '{"summary": string, "sentiment": "positive"|"neutral"|"negative", ' +
        '"actionItems": string[]}. No prose, no markdown.',
      messages: [{ role: "user", content: `Transcript:\n${transcript}` }],
    });

    const out = msg.content.find((b) => b.type === "text")?.text ?? "";
    const json = out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as {
      summary?: string;
      sentiment?: string;
      actionItems?: unknown;
    };

    const sentiment: CallSentiment =
      parsed.sentiment === "positive" || parsed.sentiment === "negative"
        ? parsed.sentiment
        : "neutral";

    return {
      transcript,
      summary: parsed.summary?.trim() || "Summary unavailable.",
      sentiment,
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems.map((a) => String(a)).filter(Boolean)
        : [],
      usedAi: true,
    };
  } catch (err) {
    console.error("[voice] AI analysis failed, using heuristic:", err);
    return null;
  }
}

// Deterministic fallback — no network required.
function heuristicAnalyze(transcript: string): CallAnalysis {
  const lower = transcript.toLowerCase();

  let score = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) score -= 1;
  const sentiment: CallSentiment = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";

  const sentences = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const actionItems = sentences
    .filter((s) => ACTION_CUES.some((c) => s.toLowerCase().includes(c)))
    .slice(0, 5);

  const summary =
    sentences.slice(0, 2).join(" ") || "Call transcript received; no summary generated.";

  return { transcript, summary, sentiment, actionItems, usedAi: false };
}
