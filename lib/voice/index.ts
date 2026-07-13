// Phase 11 — Voice AI calling. Public surface for the voice module.

export * from "./types";
export { initiateCall } from "./providers";
export { analyzeCall } from "./analyze";

import type { CallRequest, CallResult, CallAnalysis } from "./types";
import { initiateCall } from "./providers";
import { analyzeCall } from "./analyze";

// Convenience: place a call and, when a transcript is available (e.g. from a
// completed mock or a provider webhook payload), analyze it in one step.
// The transcript is optional because real calls resolve asynchronously — the
// analysis field is only populated when a transcript is supplied.
export async function makeAndAnalyze(
  req: CallRequest,
  transcript?: string,
): Promise<{ call: CallResult; analysis: CallAnalysis | null }> {
  const call = await initiateCall(req);
  const analysis =
    typeof transcript === "string" && transcript.trim()
      ? await analyzeCall(transcript)
      : null;
  return { call, analysis };
}
