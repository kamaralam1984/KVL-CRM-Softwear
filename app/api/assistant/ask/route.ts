// POST /api/assistant/ask — AI Sales Assistant (Phase 6).
//
// Body:
//   { "question": string, "context"?: { company?: string; services?: string[] } }
// Returns:
//   { "answer": string, "usedAi": boolean }
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <ASSISTANT_API_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { askAssistant, type AssistantContext } from "@/lib/assistant";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.ASSISTANT_API_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null; // open in dev when unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  let question: string | undefined;
  let context: AssistantContext | undefined;

  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question : undefined;
    context = body?.context && typeof body.context === "object" ? body.context : undefined;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!question || !question.trim()) {
    return NextResponse.json(
      { error: "missing 'question' in request body" },
      { status: 400 },
    );
  }

  try {
    const result = await askAssistant(question, context);
    return NextResponse.json(result);
  } catch (err) {
    // askAssistant never throws, but guard anyway so we always return JSON.
    console.error("[assistant] ask route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "assistant failed" },
      { status: 500 },
    );
  }
}
