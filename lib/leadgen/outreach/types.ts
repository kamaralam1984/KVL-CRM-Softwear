// Types for the outreach layer — reaching out to fresh leads automatically.

import type { ScoredLead } from "../types";

export type OutreachChannel = "email" | "whatsapp" | "sms" | "call";

// Who is sending, and what they're offering. Feeds the AI message writer.
export type SenderProfile = {
  senderName: string;    // person signing off
  senderCompany: string; // your business
  offer: string;         // one line: what you're pitching
  calendarLink?: string; // optional booking link to include
};

// AI-generated copy for a single lead, per channel.
export type OutreachMessage = {
  email?: { subject: string; body: string };
  whatsapp?: { body: string };
  sms?: { body: string };
  call?: { talkingPoints: string }; // script notes for the human caller
};

export type OutreachResult = {
  lead: string;                    // company name
  channel: OutreachChannel;
  status: "sent" | "queued" | "task_created" | "skipped" | "failed";
  detail?: string;                 // provider id, task title, or error
  usedMockProvider: boolean;
};

export type OutreachConfig = {
  channels: OutreachChannel[];     // which channels to attempt
  sender: SenderProfile;
};

export type OutreachInput = {
  lead: ScoredLead;
  message: OutreachMessage;
};
