// POST /api/outreach/generate — generate AI outreach copy for one lead.
//
// Body:
//   { "channel": OutreachChannel, "context": OutreachContext }
//       → single OutreachContent
//   { "channels": OutreachChannel[], "context": OutreachContext }
//       → OutreachContent[] (parallel)
//   { "context": OutreachContext }
//       → OutreachContent[] for all six channels
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <LEADGEN_CRON_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { generateOutreach, generateAllChannels } from "@/lib/outreach/generate";
import type {
  OutreachChannel,
  OutreachContext,
} from "@/lib/outreach/types";

// AI calls can take a moment — give the route room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const VALID_CHANNELS: OutreachChannel[] = [
  "email",
  "whatsapp",
  "sms",
  "linkedin",
  "follow_up",
  "proposal_intro",
];

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.LEADGEN_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null; // open in dev when unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

function isChannel(v: unknown): v is OutreachChannel {
  return typeof v === "string" && VALID_CHANNELS.includes(v as OutreachChannel);
}

export async function POST(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  let payload: {
    channel?: unknown;
    channels?: unknown;
    context?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400 },
    );
  }

  const { channel, channels, context } = payload;

  if (
    !context ||
    typeof context !== "object" ||
    !(context as OutreachContext).lead ||
    !(context as OutreachContext).lead.company
  ) {
    return NextResponse.json(
      { error: "missing 'context' with a 'lead' (company required)" },
      { status: 400 },
    );
  }
  const ctx = context as OutreachContext;

  try {
    // Multi-channel: explicit array, or default-all when neither is given.
    if (channels !== undefined || channel === undefined) {
      let list: OutreachChannel[] | undefined;
      if (channels !== undefined) {
        if (!Array.isArray(channels) || !channels.every(isChannel)) {
          return NextResponse.json(
            { error: "'channels' must be an array of valid channels" },
            { status: 400 },
          );
        }
        if (channels.length === 0) {
          return NextResponse.json(
            { error: "'channels' must not be empty" },
            { status: 400 },
          );
        }
        list = channels;
      }
      const results = await generateAllChannels(ctx, list);
      return NextResponse.json(results);
    }

    // Single channel.
    if (!isChannel(channel)) {
      return NextResponse.json(
        { error: `invalid 'channel'; expected one of ${VALID_CHANNELS.join(", ")}` },
        { status: 400 },
      );
    }
    const result = await generateOutreach(channel, ctx);
    return NextResponse.json(result);
  } catch (err) {
    // generateOutreach never throws, but guard anyway so we always return JSON.
    console.error("[outreach] generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "generation failed" },
      { status: 500 },
    );
  }
}
