"use server";
// Outreach orchestrator: for each fresh lead, AI writes copy, then every
// enabled channel is attempted. Returns a flat list of per-channel results.

import type { ScoredLead } from "../types";
import { generateMessage } from "./message";
import { sendEmail, sendWhatsapp, sendSms, queueCall } from "./channels";
import type { OutreachConfig, OutreachResult } from "./types";

export async function runOutreach(
  leads: ScoredLead[],
  config: OutreachConfig,
): Promise<OutreachResult[]> {
  const results: OutreachResult[] = [];

  for (const lead of leads) {
    const msg = await generateMessage(lead, config.channels, config.sender);

    for (const channel of config.channels) {
      try {
        if (channel === "email") results.push(await sendEmail(lead, msg, config.sender));
        else if (channel === "whatsapp") results.push(await sendWhatsapp(lead, msg));
        else if (channel === "sms") results.push(await sendSms(lead, msg));
        else if (channel === "call") results.push(await queueCall(lead, msg));
      } catch (err) {
        results.push({
          lead: lead.company,
          channel,
          status: "failed",
          detail: err instanceof Error ? err.message : "error",
          usedMockProvider: false,
        });
      }
    }
  }

  return results;
}

export type { OutreachConfig, OutreachResult } from "./types";
