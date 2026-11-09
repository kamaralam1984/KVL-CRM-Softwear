// Call outcome → next action. This is what closes the loop after a call:
//   interested      → team alert + follow-up task, drip keeps running
//   callback        → team reminder (10 min before) + drip paused until after the callback
//   not_picked/busy → instant WhatsApp "tried calling, when suits you?" (+ escalation after 3 misses)
//   voicemail       → logged
//   wrong_number    → follow-up stopped
//   not_interested  → follow-up stopped
//   do_not_call     → added to the global DNC list + follow-up stopped
import { getServerClient } from "@/lib/supabase/server";
import { endFollowUp, scheduleNextTouch, sendText } from "@/lib/followup/engine";
import { createReminder } from "@/lib/reminders/engine";
import { addSuppression } from "@/lib/compliance/dnc";
import { notifyTeam } from "@/lib/notify/team";
import { getCommsSettings } from "@/lib/comms/settings";

import type { CallOutcome } from "./outcomeTypes";
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? process.env.BRAND_NAME ?? "KVL Business Solutions";

export async function logCallOutcome(p: { leadId: number; outcome: CallOutcome; notes?: string; callbackAt?: Date | null; callLogId?: string; agent?: string }): Promise<{ ok: boolean; action: string }> {
  try {
    const db = getServerClient();
    const { data: lead } = await db.from("leads").select("id,name,company,email,phone,owner").eq("id", p.leadId).maybeSingle();
    if (!lead) return { ok: false, action: "Lead not found" };
    const patch = { lead_id: p.leadId, outcome: p.outcome, notes: (p.notes ?? "").slice(0, 1000), callback_at: p.callbackAt?.toISOString() ?? null, agent: p.agent ?? "" };
    if (p.callLogId) await db.from("call_logs").update(patch).eq("id", p.callLogId);
    else await db.from("call_logs").insert({ ...patch, direction: "outbound", status: "completed", to_number: lead.phone ?? "", from_number: "" });

    const who = (lead.company as string) || (lead.name as string) || "lead";
    switch (p.outcome) {
      case "interested":
        await notifyTeam({ kind: "call_interested", leadId: p.leadId, priority: "high", title: `📞 ${who} is interested`, body: p.notes ?? "" });
        await db.from("tasks").insert({ title: `Send proposal/next step to ${who} (interested on call)`, priority: "high", due: "Today", assignee: (lead.owner as string) || p.agent || "Unassigned", status: "pending", tags: ["Call Outcome"], company: who });
        return { ok: true, action: "Team alerted + next-step task created" };
      case "callback": {
        if (!p.callbackAt) return { ok: false, action: "Pick a callback date/time" };
        await createReminder({ kind: "callback", audience: "team", leadId: p.leadId, assignee: (lead.owner as string) || p.agent, title: `Call back ${who}`, body: p.notes ?? "", remindAt: new Date(p.callbackAt.getTime() - 10 * 60_000), dedupeKey: `callback:${p.leadId}:${p.callbackAt.getTime()}` });
        await scheduleNextTouch(p.leadId, new Date(p.callbackAt.getTime() + 2 * 3_600_000)); // drip waits until after the callback
        return { ok: true, action: "Callback reminder set; drip paused until after it" };
      }
      case "not_picked": case "busy": {
        const { count } = await db.from("call_logs").select("id", { count: "exact", head: true }).eq("lead_id", p.leadId).in("outcome", ["not_picked", "busy"]).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
        const s = await getCommsSettings();
        const first = String(lead.name ?? "").split(/\s+/)[0] || "there";
        const msg = `Hi ${first}, ${(lead.owner as string) || "our team"} from ${BRAND} just tried calling you. When is a good time to talk?${s.links.bookingLink ? ` You can also pick a slot here: ${s.links.bookingLink}` : ""}`;
        const d = await sendText({ id: p.leadId, name: lead.name as string, company: lead.company as string, email: lead.email as string, phone: lead.phone as string, owner: lead.owner as string }, msg, `We tried to reach you — ${BRAND}`, "whatsapp", "automation");
        if ((count ?? 0) >= 3) await db.from("tasks").insert({ title: `${who} hasn't picked up ${count}× — try another number/email or a different time`, priority: "medium", due: "Tomorrow", assignee: (lead.owner as string) || "Unassigned", status: "pending", tags: ["Call Outcome"], company: who });
        return { ok: true, action: d?.ok ? `Not-picked WhatsApp sent via ${d.channel}` : "Logged (fallback message not sent)" };
      }
      case "wrong_number":
        await endFollowUp(p.leadId, "stopped", "Wrong number");
        return { ok: true, action: "Follow-up stopped (wrong number)" };
      case "not_interested":
        await endFollowUp(p.leadId, "stopped", "Not interested (call)");
        return { ok: true, action: "Follow-up stopped" };
      case "do_not_call":
        await addSuppression({ phone: lead.phone as string, email: lead.email as string }, { channel: "all", reason: "Asked not to be contacted (call)", source: "call_outcome" });
        await endFollowUp(p.leadId, "stopped", "Do not contact (call)");
        return { ok: true, action: "Added to Do-Not-Contact list; follow-up stopped" };
      default:
        return { ok: true, action: "Logged" };
    }
  } catch (err) { console.error("[calls] logCallOutcome failed:", err); return { ok: false, action: "Failed — see server logs" }; }
}
