// Phase 12 — Meeting Intelligence pipeline entry point.
//
// processMeeting() is the single call the API route uses: it summarizes a
// meeting transcript into a structured MeetingSummary. The caller may then
// turn `actionItems` into CRM tasks (see the route's createTasks flag).

export * from "./types";
export { transcribe } from "./transcribe";
export type { TranscribeResult } from "./transcribe";
export { summarizeMeeting } from "./summarize";

import type { MeetingInput, MeetingSummary } from "./types";
import { summarizeMeeting } from "./summarize";

export async function processMeeting(input: MeetingInput): Promise<MeetingSummary> {
  return summarizeMeeting(input);
}
