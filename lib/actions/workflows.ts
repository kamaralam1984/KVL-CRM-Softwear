"use server";
// Phase 19 — Automation Core: DB-backed workflow runs + active toggle.
// Gives lib/automation/store.ts's previously localStorage-only run-log and
// active-toggle a real, cross-device source of truth. Called by store.ts as a
// fire-and-forget dual-write (see its own comments) so every existing caller
// keeps working unchanged even when Supabase is unavailable.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { WORKFLOWS as SEED_WORKFLOWS } from "@/lib/automation/engine";
import type { RunStep, WorkflowRun } from "@/lib/automation/store";

export type DbWorkflow = {
  id: string;
  key: string;
  name: string;
  trigger_key: string;
  description: string;
  active: boolean;
  steps: string[];
};

type ServerClient = ReturnType<typeof getServerClient>;

// Seeds `workflows` from the static WORKFLOWS array in engine.ts the first
// time the table is empty. Workflows are configuration (not disposable seed
// data like lib/data.ts arrays), so this is a real one-time insert, not a
// per-request fallback.
async function ensureSeeded(db: ServerClient): Promise<void> {
  const { count, error } = await db.from("workflows").select("id", { count: "exact", head: true });
  if (error) { console.error("[automation] ensureSeeded count failed:", error.message); return; }
  if (count && count > 0) return;

  const rows = SEED_WORKFLOWS.map((w) => ({
    key: w.id, name: w.name, trigger_key: w.trigger, description: w.description,
    active: true, steps: w.steps,
  }));
  const { error: insertErr } = await db.from("workflows").insert(rows);
  if (insertErr) console.error("[automation] failed to seed workflows:", insertErr.message);
}

export async function getWorkflows(accessToken?: string): Promise<DbWorkflow[]> {
  if (!(await assertCan(accessToken, "automation", "read"))) return [];
  try {
    const db = getServerClient();
    await ensureSeeded(db);
    const { data, error } = await db.from("workflows").select("*").order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as DbWorkflow[];
  } catch (err) {
    console.error("[automation] getWorkflows failed:", err);
    return [];
  }
}

export async function setWorkflowActive(key: string, active: boolean, accessToken?: string): Promise<void> {
  if (!(await assertCan(accessToken, "automation", "update"))) return;
  try {
    const db = getServerClient();
    await ensureSeeded(db);
    const { error } = await db.from("workflows").update({ active }).eq("key", key);
    if (error) console.error("[automation] setWorkflowActive failed:", error.message);
  } catch (err) {
    console.error("[automation] setWorkflowActive error:", err);
  }
}

export async function getWorkflowRuns(limit = 200, accessToken?: string): Promise<WorkflowRun[]> {
  if (!(await assertCan(accessToken, "automation", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("workflow_runs")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: String(r.id),
      workflowId: String(r.workflow_key),
      workflowName: String(r.workflow_name),
      trigger: String(r.trigger_label ?? ""),
      entity: String(r.entity ?? ""),
      steps: (r.steps ?? []) as RunStep[],
      ok: Boolean(r.ok),
      at: new Date(r.ran_at).getTime(),
    }));
  } catch (err) {
    console.error("[automation] getWorkflowRuns failed:", err);
    return [];
  }
}

// Fire-and-forget target for store.ts's addRun — never throws, so a run is
// never lost even in demo mode (no Supabase configured).
export async function recordWorkflowRun(run: WorkflowRun): Promise<void> {
  try {
    const db = getServerClient();
    const { data: wf } = await db.from("workflows").select("id").eq("key", run.workflowId).maybeSingle();
    const { error } = await db.from("workflow_runs").insert({
      workflow_id: wf?.id ?? null,
      workflow_key: run.workflowId,
      workflow_name: run.workflowName,
      trigger_label: run.trigger,
      entity: run.entity,
      steps: run.steps,
      ok: run.ok,
      ran_at: new Date(run.at).toISOString(),
    });
    if (error) console.error("[automation] recordWorkflowRun failed:", error.message);
  } catch (err) {
    console.error("[automation] recordWorkflowRun error:", err);
  }
}
