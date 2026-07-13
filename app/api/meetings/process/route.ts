// POST /api/meetings/process — run the Meeting Intelligence pipeline.
//
// Body:
//   { "input": MeetingInput }   → returns a MeetingSummary
//
// Optional: ?createTasks=true (or { "createTasks": true } in the body) turns each
// extracted action item into a CRM task (fire-and-forget; errors are swallowed).
//
// Optional shared-secret guard (only enforced if the env var is set):
//   header:  Authorization: Bearer <MEETINGS_CRON_SECRET | CRON_SECRET>

import { NextRequest, NextResponse } from "next/server";
import { processMeeting } from "@/lib/meetings";
import type { MeetingInput, MeetingSummary } from "@/lib/meetings";
import { createTask } from "@/lib/actions/tasks";

// Summarization may call an LLM — give it room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.MEETINGS_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null; // open in dev when unset
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

// Fire-and-forget: create a CRM task per action item. Never throws.
function spawnTasks(summary: MeetingSummary, input: MeetingInput): void {
  for (const item of summary.actionItems) {
    if (!item?.text?.trim()) continue;
    Promise.resolve(
      createTask({
        title: item.text.trim(),
        priority: "medium",
        due: input.date?.trim() || "Soon",
        assignee: item.owner?.trim() || "Unassigned",
        status: "pending",
        tags: ["Meeting", "Action Item"],
        company: input.company?.trim() || "Internal",
      }),
    ).catch((err) => {
      console.error("[meetings] failed to create task from action item:", err);
    });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  let input: MeetingInput | undefined;
  let createTasksFlag = false;

  // Query flag: ?createTasks=true
  if (req.nextUrl.searchParams.get("createTasks") === "true") {
    createTasksFlag = true;
  }

  try {
    const body = await req.json();
    if (body?.input && typeof body.input === "object") {
      input = body.input as MeetingInput;
    }
    if (body?.createTasks === true) {
      createTasksFlag = true;
    }
  } catch {
    // no/invalid JSON body → input stays undefined
  }

  if (!input || typeof input.transcript !== "string" || !input.transcript.trim()) {
    return NextResponse.json(
      { error: "missing 'input.transcript' in request body" },
      { status: 400 },
    );
  }

  try {
    const summary = await processMeeting(input);
    if (createTasksFlag) spawnTasks(summary, input);
    return NextResponse.json(summary);
  } catch (err) {
    // processMeeting never throws, but guard anyway so we always return JSON.
    console.error("[meetings] process error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "processing failed" },
      { status: 500 },
    );
  }
}
