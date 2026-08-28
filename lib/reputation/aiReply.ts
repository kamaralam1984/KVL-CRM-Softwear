// Phase 26 — Reputation Management. AI-drafted review replies, mirroring
// lib/scoring/ai.ts's Anthropic-optional pattern exactly: no ANTHROPIC_API_KEY
// → null, caller falls back to a template. Draft only — a human always
// approves/edits before it's posted (lib/actions/reviews.ts), matching every
// other AI-drafting feature already in this CRM.

import Anthropic from "@anthropic-ai/sdk";

export async function draftReviewReply(params: {
  authorName: string;
  rating: number;
  reviewText: string;
  businessName?: string;
}): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system:
        "You write short, warm, professional replies to customer reviews for a small business. " +
        "2-4 sentences. Thank the reviewer by first name if given. For 4-5 star reviews, express genuine " +
        "gratitude. For 1-3 star reviews, acknowledge the concern, apologize briefly, and invite them to " +
        "reach out directly to resolve it — never argue or get defensive. Return ONLY the reply text, no quotes, no preamble.",
      messages: [
        {
          role: "user",
          content:
            `Business: ${params.businessName || "our business"}\n` +
            `Reviewer: ${params.authorName || "a customer"}\n` +
            `Rating: ${params.rating}/5\n` +
            `Review: ${params.reviewText || "(no text)"}`,
        },
      ],
    });
    const text = msg.content.find((b) => b.type === "text")?.text?.trim();
    return text || null;
  } catch (err) {
    console.error("[reputation] draftReviewReply failed:", err);
    return null;
  }
}

// Non-AI fallback so the "Draft Reply" button always produces something.
export function templateReviewReply(params: { authorName: string; rating: number }): string {
  const name = params.authorName?.trim() || "there";
  if (params.rating >= 4) {
    return `Hi ${name}, thank you so much for the kind words — we really appreciate you taking the time to share this!`;
  }
  return `Hi ${name}, thank you for your feedback. We're sorry to hear about your experience — please reach out to us directly so we can make this right.`;
}
