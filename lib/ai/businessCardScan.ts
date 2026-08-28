// Phase 32 — AI Business-Card Scanner. Reuses the already-installed
// @anthropic-ai/sdk's vision input (Claude accepts an image directly) — no
// separate OCR dependency needed. Same Anthropic-optional pattern as every
// other AI feature here: no ANTHROPIC_API_KEY → null, caller shows a manual
// entry form instead.

import Anthropic from "@anthropic-ai/sdk";

export interface ScannedCard {
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
}

export async function scanBusinessCard(base64Image: string, mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg"): Promise<ScannedCard | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system:
        "Extract contact details from this business card photo. Return ONLY a JSON object " +
        '(no prose, no code fences): {"name": "", "company": "", "title": "", "phone": "", "email": ""}. ' +
        "Use an empty string for any field you can't read. Never invent data that isn't visible on the card.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
            { type: "text", text: "Extract this business card's contact details." },
          ],
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<ScannedCard>;
    return {
      name: parsed.name ?? "", company: parsed.company ?? "", title: parsed.title ?? "",
      phone: parsed.phone ?? "", email: parsed.email ?? "",
    };
  } catch (err) {
    console.error("[ai] scanBusinessCard failed:", err);
    return null;
  }
}
