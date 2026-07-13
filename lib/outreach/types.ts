// Types for the standalone AI Outreach content generator (Phase 5).
// Broader than the auto-pipeline copy writer: covers email, whatsapp, sms,
// linkedin, follow-up nudges and proposal intros, for a single lead at a time.

import type { RawLead } from "@/lib/leadgen/types";
import type { OpportunityReport } from "@/lib/opportunity/types";

export type OutreachChannel =
  | "email"
  | "whatsapp"
  | "sms"
  | "linkedin"
  | "follow_up"
  | "proposal_intro";

export type OutreachContent = {
  channel: OutreachChannel;
  subject?: string; // email (and, optionally, proposal_intro) only
  body: string;
  usedAi: boolean;
};

export type OutreachContext = {
  lead: RawLead;
  opportunity?: OpportunityReport; // services / headline give great pitch material
  senderName?: string;
  senderCompany?: string;
  offer?: string;
  calendarLink?: string;
  previousMessage?: string; // referenced by the follow_up channel
};
