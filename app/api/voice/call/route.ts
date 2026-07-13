// POST /api/voice/call — Phase 11 Voice AI calling endpoint.
//
// Body (discriminated by "action"):
//   { "action": "call", "to": string, "script"?, "leadCompany"?, "provider"? }
//       → initiates (or mocks) an outbound call. Returns CallResult.
//   { "action": "analyze", "transcript": string }
//       → analyzes a call transcript. Returns CallAnalysis.
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <VOICE_API_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { initiateCall, analyzeCall } from "@/lib/voice";
import type { CallProvider } from "@/lib/voice";

// A real provider call can involve network setup; give it room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.VOICE_API_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null; // open in dev when unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

const VALID_PROVIDERS: CallProvider[] = ["openai_realtime", "elevenlabs", "twilio"];

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown> | undefined;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const action = body?.action;

  try {
    if (action === "call") {
      const to = typeof body.to === "string" ? body.to.trim() : "";
      if (!to) {
        return NextResponse.json(
          { error: "missing 'to' phone number for action 'call'" },
          { status: 400 },
        );
      }
      const provider =
        typeof body.provider === "string" && VALID_PROVIDERS.includes(body.provider as CallProvider)
          ? (body.provider as CallProvider)
          : undefined;

      const result = await initiateCall({
        to,
        script: typeof body.script === "string" ? body.script : undefined,
        leadCompany: typeof body.leadCompany === "string" ? body.leadCompany : undefined,
        provider,
      });
      return NextResponse.json(result);
    }

    if (action === "analyze") {
      const transcript = typeof body.transcript === "string" ? body.transcript : "";
      if (!transcript.trim()) {
        return NextResponse.json(
          { error: "missing 'transcript' for action 'analyze'" },
          { status: 400 },
        );
      }
      const analysis = await analyzeCall(transcript);
      return NextResponse.json(analysis);
    }

    return NextResponse.json(
      { error: "invalid 'action' — expected 'call' or 'analyze'" },
      { status: 400 },
    );
  } catch (err) {
    // Underlying helpers never throw, but guard so we always return JSON.
    console.error("[voice] route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "voice request failed" },
      { status: 500 },
    );
  }
}
