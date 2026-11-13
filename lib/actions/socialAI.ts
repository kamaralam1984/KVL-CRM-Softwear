"use server";
// Social Planner → AI content generator. Uses Claude when ANTHROPIC_API_KEY is set; otherwise falls
// back to clearly-labelled templates built from the topic. Login required, rate limited, never throws.

import Anthropic from "@anthropic-ai/sdk";
import { assertCanStrict } from "@/lib/security/requireAction";
import { rateLimit } from "@/lib/security/rateLimit";
import { PLATFORM_LIMITS, PLATFORM_LABEL, type SocialPlatform } from "@/lib/social/validate";

export type SocialVariation = { content: string; hashtags: string[] };
export type SocialAIResult =
  | { ok: true; variations: SocialVariation[]; usedAi: boolean }
  | { ok: false; error: string };

const TONES = ["Professional", "Casual", "Witty", "Inspirational"] as const;

function clamp(text: string, limit: number): string {
  const t = text.trim();
  if (t.length <= limit) return t;
  const cut = t.slice(0, limit - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), limit - 40))}…`;
}
const tagify = (topic: string) => "#" + topic.replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").slice(0, 3).map((w) => w[0]?.toUpperCase() + w.slice(1)).join("");

function templates(topic: string, tone: string, platform: SocialPlatform): SocialVariation[] {
  const T = topic.trim();
  const tag = tagify(T);
  const sets: Record<string, string[]> = {
    Professional: [
      `${T}: three things we've learned that make the biggest difference — and how you can apply them this week.`,
      `Thinking about ${T}? Start with a clear goal, measure what matters, and review weekly. Small, consistent steps win.`,
      `Why ${T} deserves a place on your roadmap this quarter — a short guide for busy teams.`,
    ],
    Casual: [
      `Quick one about ${T} 👋 — here's what's been working for us. Want the full breakdown? Drop a comment!`,
      `Honestly, ${T} is simpler than most people think. Here's how we'd start if we began again today.`,
      `${T} — what's your biggest question? Tell us below and we'll answer the best ones.`,
    ],
    Witty: [
      `${T}: because "we'll figure it out later" is not a strategy. 😄 Here's a better plan.`,
      `Nobody ever said "I wish I'd thought less about ${T}." Here's how to get it right.`,
      `${T} walks into a meeting… and actually gets results. Here's how.`,
    ],
    Inspirational: [
      `Every big result starts small. This week, take one step on ${T} — and keep going. ✨`,
      `${T} isn't about perfection, it's about progress. Start today, improve tomorrow.`,
      `The best time to start on ${T} was yesterday. The second best time is now.`,
    ],
  };
  const list = sets[tone] ?? sets.Professional;
  const limit = PLATFORM_LIMITS[platform];
  return list.map((c) => {
    const hashtags = platform === "twitter" ? [tag] : [tag, "#Business", "#Growth"];
    return { content: clamp(`${c}${platform === "linkedin" || platform === "instagram" ? `\n\n${hashtags.join(" ")}` : ""}`, limit), hashtags };
  });
}

export async function generateSocialContent(
  input: { topic: string; tone: string; platform: SocialPlatform },
  accessToken?: string,
): Promise<SocialAIResult> {
  if (!(await assertCanStrict(accessToken, "social", "create"))) return { ok: false, error: "Sign in to use the AI generator." };
  const topic = String(input.topic ?? "").trim().slice(0, 300);
  if (topic.length < 3) return { ok: false, error: "Type a topic or a rough idea first (at least 3 characters)." };
  const tone = (TONES as readonly string[]).includes(input.tone) ? input.tone : "Professional";
  const platform = input.platform in PLATFORM_LIMITS ? input.platform : "linkedin";
  if (!rateLimit("social-ai", 20, 60_000).allowed) return { ok: false, error: "Too many requests — wait a minute and try again." };

  const limit = PLATFORM_LIMITS[platform];
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const msg = await new Anthropic().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system:
          `You write ${tone.toLowerCase()} social media posts for ${PLATFORM_LABEL[platform]} for a business. ` +
          `Write exactly 3 different posts about the user's topic. Each post must be under ${limit - 20} characters INCLUDING hashtags, ` +
          "sound human (no clichés, no made-up statistics, no fake client names), and end with a soft call to action. " +
          'Reply ONLY with JSON: {"variations":[{"content":"...","hashtags":["#a","#b"]}, ...]}. No markdown, no commentary.',
        messages: [{ role: "user", content: `Topic: ${topic}` }],
      });
      const text = msg.content.find((b) => b.type === "text")?.text ?? "";
      const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { variations?: { content?: string; hashtags?: string[] }[] };
      const variations = (parsed.variations ?? [])
        .filter((v) => v.content && v.content.trim())
        .slice(0, 3)
        .map((v) => ({ content: clamp(String(v.content), limit), hashtags: (v.hashtags ?? []).map(String).slice(0, 6) }));
      if (variations.length) return { ok: true, variations, usedAi: true };
    } catch (err) {
      console.error("[social-ai] generation failed, using templates:", err);
    }
  }
  return { ok: true, variations: templates(topic, tone, platform), usedAi: false };
}
