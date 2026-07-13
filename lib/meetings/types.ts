// Shared types for Phase 12 — Meeting Intelligence.
//
// A meeting comes in as a transcript (plus optional metadata). The pipeline
// summarizes it, extracts key points + action items, gauges sentiment, and
// suggests CRM updates. Everything downstream keys off these two shapes.

// Raw input to the meeting pipeline. Only `transcript` is required.
export type MeetingInput = {
  title?: string;
  transcript: string;
  attendees?: string[];
  company?: string;
  date?: string; // ISO string or human date; passed in, never derived at module load
};

// A single action item extracted from the meeting.
export type ActionItem = {
  text: string;
  owner?: string; // best-guess assignee, if the transcript names one
};

// The finished meeting summary — AI or heuristic, flagged by `usedAi`.
export type MeetingSummary = {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  sentiment?: string; // e.g. "positive" | "neutral" | "negative" | free text
  crmUpdates: string[]; // suggested CRM changes ("mark deal as ...", "add note ...")
  usedAi: boolean;
};
