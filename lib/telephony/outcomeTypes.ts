// Pure (client-safe) call-outcome constants — kept apart from outcomes.ts, which pulls in server-only code.
export const CALL_OUTCOMES = ["interested", "callback", "not_picked", "busy", "voicemail", "wrong_number", "not_interested", "do_not_call"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
