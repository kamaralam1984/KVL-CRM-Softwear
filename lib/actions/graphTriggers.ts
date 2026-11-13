"use server";
// Client → server bridge for firing saved canvases on events that originate in the browser
// (a lead added from the Leads page). Server-originated events call runCustomGraphs directly.
// Strict auth: this can send WhatsApp/SMS/email, so an anonymous caller must never reach it
// (assertCanStrict denies when no token is presented).

import { assertCanStrict } from "@/lib/security/requireAction";
import { runCustomGraphs } from "@/lib/automation/graph/dispatch";
import type { GraphContext } from "@/lib/automation/graph/interpreter";

const str = (v: unknown, max = 200) => String(v ?? "").slice(0, max);

/** Returns true when a custom canvas replaced the built-in Lead Nurture workflow. */
export async function fireLeadCreatedGraphs(
  lead: { name?: string; company?: string; email?: string; phone?: string; score?: number; owner?: string },
  accessToken?: string,
): Promise<boolean> {
  if (!(await assertCanStrict(accessToken, "leads", "create"))) return false;
  const ctx: GraphContext = {
    name: str(lead.name), company: str(lead.company), email: str(lead.email), phone: str(lead.phone, 40),
    score: Number(lead.score) || 0, owner: str(lead.owner),
  };
  return runCustomGraphs("lead_created", ctx, "lead-nurture");
}
