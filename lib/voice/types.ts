// Shared types for Phase 11 — Voice AI calling.
//
// The voice layer places (or mocks) outbound calls to leads and then analyzes
// the resulting transcript. Everything is provider-agnostic: a call may be
// dispatched to a real provider (OpenAI Realtime, ElevenLabs, Twilio) when the
// relevant credentials exist, or fall back to a deterministic mock otherwise.

export type CallProvider = "openai_realtime" | "elevenlabs" | "twilio";

export type CallRequest = {
  to: string;                 // destination phone number (E.164 preferred)
  script?: string;            // optional talking-points / opening script
  leadCompany?: string;       // company name for context / logging
  provider?: CallProvider;    // preferred provider; defaults to openai_realtime
};

export type CallStatus = "queued" | "completed" | "failed";

export type CallResult = {
  id: string;                 // call id (provider id when real, mock id otherwise)
  status: CallStatus;
  provider: string;           // provider actually used (or "mock")
  usedRealProvider: boolean;  // true when a real provider account was invoked
};

export type CallSentiment = "positive" | "neutral" | "negative";

export type CallAnalysis = {
  transcript: string;
  summary: string;
  sentiment: CallSentiment;
  actionItems: string[];
  usedAi: boolean;            // true when Claude produced the analysis
};
