"use server";
// Follow-up Engine — server actions backing components/crm/sections/automation/FollowUpEngine.tsx.
// Thin RBAC wrappers over lib/followup/engine.ts (resource: "automation").

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { enrollLead, endFollowUp, setPaused, runDueSteps, runAiNudges } from "@/lib/followup/engine";
import { DEFAULT_SEQUENCE, type EnrollmentStatus } from "@/lib/followup/sequence";

export type FollowUpRow = {
  id: string;
  lead_id: number;
  lead_name: string;
  company: string;
  status: EnrollmentStatus;
  step_index: number;
  total_steps: number;
  next_run_at: string | null;
  last_inbound_at: string | null;
  last_human_reply_at: string | null;
  ai_nudge_count: number;
  waiting_hours: number | null; // hours the client has been waiting for a human reply
  stop_reason: string;
};

export type FollowUpEventRow = { id: string; enrollment_id: string; kind: string; channel: string; ok: boolean; detail: string; created_at: string };

export type FollowUpSnapshot = {
  rows: FollowUpRow[];
  events: FollowUpEventRow[];
  sequence: { name: string; steps: { atHours: number; channel: string; subject?: string; body: string }[] };
};

export async function getFollowUps(accessToken?: string): Promise<FollowUpSnapshot> {
  const empty: FollowUpSnapshot = { rows: [], events: [], sequence: { name: DEFAULT_SEQUENCE.name, steps: DEFAULT_SEQUENCE.steps } };
  if (!(await assertCan(accessToken, "automation", "read"))) return empty;
  try {
    const db = getServerClient();
    const [{ data }, { data: ev }] = await Promise.all([
      db.from("followup_enrollments").select("*, leads(name,company)").order("updated_at", { ascending: false }).limit(200),
      db.from("followup_events").select("*").order("created_at", { ascending: false }).limit(60),
    ]);
    const now = Date.now();
    const rows = ((data ?? []) as Array<Record<string, unknown> & { leads: { name?: string; company?: string } | null }>).map((e) => {
      const inbound = e.last_inbound_at as string | null;
      const human = e.last_human_reply_at as string | null;
      const waiting = e.status === "replied_waiting" && inbound && !(human && new Date(human) >= new Date(inbound))
        ? Math.floor((now - new Date(inbound).getTime()) / 3_600_000) : null;
      return {
        id: e.id as string, lead_id: e.lead_id as number,
        lead_name: e.leads?.name ?? "Lead", company: e.leads?.company ?? "",
        status: e.status as EnrollmentStatus, step_index: e.step_index as number, total_steps: DEFAULT_SEQUENCE.steps.length,
        next_run_at: e.next_run_at as string | null, last_inbound_at: inbound, last_human_reply_at: human,
        ai_nudge_count: e.ai_nudge_count as number, waiting_hours: waiting, stop_reason: (e.stop_reason as string) ?? "",
      } satisfies FollowUpRow;
    });
    return { ...empty, rows, events: (ev ?? []) as FollowUpEventRow[] };
  } catch (err) {
    console.error("[followup] getFollowUps failed:", err);
    return empty;
  }
}

export async function enrollLeadAction(leadId: number, accessToken?: string): Promise<boolean> {
  if (!(await assertCan(accessToken, "automation", "create"))) return false;
  return (await enrollLead(leadId)).ok;
}

export async function markPaymentReady(leadId: number, accessToken?: string): Promise<boolean> {
  if (!(await assertCan(accessToken, "automation", "update"))) return false;
  await endFollowUp(leadId, "payment_ready", "Marked ready to pay by team");
  return true;
}

export async function markWon(leadId: number, accessToken?: string): Promise<boolean> {
  if (!(await assertCan(accessToken, "automation", "update"))) return false;
  await endFollowUp(leadId, "won", "Marked paid/won by team");
  return true;
}

export async function stopFollowUp(leadId: number, accessToken?: string): Promise<boolean> {
  if (!(await assertCan(accessToken, "automation", "update"))) return false;
  await endFollowUp(leadId, "stopped", "Stopped by team");
  return true;
}

export async function pauseFollowUp(enrollmentId: string, paused: boolean, accessToken?: string): Promise<boolean> {
  if (!(await assertCan(accessToken, "automation", "update"))) return false;
  await setPaused(enrollmentId, paused);
  return true;
}

/** "Run now" button — same work the 15-min cron does. */
export async function runFollowUpsNow(accessToken?: string) {
  if (!(await assertCan(accessToken, "automation", "update"))) return null;
  const now = new Date();
  return { steps: await runDueSteps(now), nudges: await runAiNudges(now) };
}
