"use server";
// Phase 20 — Visual Drag-Drop Workflow Builder. Persists one WorkflowGraph
// per workflow key (see lib/automation/graph/types.ts).

import { getDb } from "@/lib/db";
import { assertCan, assertCanStrict } from "@/lib/security/requireAction";
import { emptyGraph, type WorkflowGraph } from "@/lib/automation/graph/types";
import { runGraph, type GraphContext } from "@/lib/automation/graph/interpreter";
import { recordWorkflowRun } from "@/lib/actions/workflows";
import type { WorkflowRun } from "@/lib/automation/store";

export async function getWorkflowGraph(workflowKey: string, accessToken?: string): Promise<WorkflowGraph> {
  if (!(await assertCan(accessToken, "automation", "read"))) return emptyGraph(workflowKey);
  try {
    const db = getDb();
    const { data, error } = await db
      .from("workflow_graphs")
      .select("*")
      .eq("workflow_key", workflowKey)
      .maybeSingle();
    if (error || !data) return emptyGraph(workflowKey);
    return {
      workflowKey: data.workflow_key,
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
      version: data.version ?? 1,
    };
  } catch (err) {
    console.error("[automation-graph] getWorkflowGraph failed:", err);
    return emptyGraph(workflowKey);
  }
}

export async function saveWorkflowGraph(graph: WorkflowGraph, accessToken?: string): Promise<{ ok: boolean }> {
  // Strict: a saved canvas can send messages and call URLs automatically, so anonymous saves are refused.
  if (!(await assertCanStrict(accessToken, "automation", "update"))) return { ok: false };
  try {
    const db = getDb();
    const { error } = await db.from("workflow_graphs").upsert(
      {
        workflow_key: graph.workflowKey,
        nodes: graph.nodes,
        edges: graph.edges,
        version: graph.version,
      },
      { onConflict: "workflow_key" },
    );
    if (error) { console.error("[automation-graph] saveWorkflowGraph failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[automation-graph] saveWorkflowGraph error:", err);
    return { ok: false };
  }
}

// "Test run" button — executes the graph with a sample context, records the
// result into workflow_runs (Phase 19) so it shows up in the Executions tab
// exactly like the hardcoded-trigger workflows' runs do.
export async function testWorkflowGraph(
  workflowKey: string,
  sampleEntity = "Sample Co",
  accessToken?: string,
  sample: Record<string, string | number> = {},
): Promise<WorkflowRun> {
  // Strict: Test run really sends to the phone/email in the sample record.
  if (!(await assertCanStrict(accessToken, "automation", "update"))) {
    return { id: `graph-run-${Date.now().toString(36)}`, workflowId: workflowKey, workflowName: workflowKey, trigger: "Denied", entity: sampleEntity,
      steps: [{ label: "Not allowed", ok: false, detail: "Sign in with a role that can edit automations" }], ok: false, at: Date.now() };
  }
  const graph = await getWorkflowGraph(workflowKey, accessToken);
  // Test data typed in the builder (name / email / phone / score …). Bounded and
  // flat so a crafted call can't smuggle anything bigger into the run context.
  const safe: GraphContext = {};
  for (const [k, v] of Object.entries(sample).slice(0, 20)) {
    if (/^\w{1,40}$/.test(k)) safe[k] = typeof v === "number" ? v : String(v).slice(0, 500);
  }
  const ctx: GraphContext = { company: sampleEntity, score: 85, owner: "Test User", name: "Test Lead", ...safe };
  const steps = await runGraph(graph, ctx);
  const run: WorkflowRun = {
    id: `graph-run-${Date.now().toString(36)}`,
    workflowId: workflowKey,
    workflowName: workflowKey,
    trigger: `Manual test · ${workflowKey}`,
    entity: sampleEntity,
    steps,
    ok: steps.every((s) => s.ok),
    at: Date.now(),
  };
  await recordWorkflowRun(run);
  return run;
}
