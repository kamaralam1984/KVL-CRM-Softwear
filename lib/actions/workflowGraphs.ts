"use server";
// Phase 20 — Visual Drag-Drop Workflow Builder. Persists one WorkflowGraph
// per workflow key (see lib/automation/graph/types.ts).

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { emptyGraph, type WorkflowGraph } from "@/lib/automation/graph/types";
import { runGraph, type GraphContext } from "@/lib/automation/graph/interpreter";
import { recordWorkflowRun } from "@/lib/actions/workflows";
import type { WorkflowRun } from "@/lib/automation/store";

export async function getWorkflowGraph(workflowKey: string, accessToken?: string): Promise<WorkflowGraph> {
  if (!(await assertCan(accessToken, "automation", "read"))) return emptyGraph(workflowKey);
  try {
    const db = getServerClient();
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
  if (!(await assertCan(accessToken, "automation", "update"))) return { ok: false };
  try {
    const db = getServerClient();
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
): Promise<WorkflowRun> {
  const graph = await getWorkflowGraph(workflowKey, accessToken);
  const ctx: GraphContext = { company: sampleEntity, score: 85, owner: "Test User" };
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
