// Automatic firing of saved canvases (server-side).
// When the CRM raises an event (new lead, hot visitor, score spike, deal won) the caller
// asks runCustomGraphs() to run every ACTIVE canvas whose trigger node listens to that
// event and that actually does something (an edge leaves the trigger). If the canvas
// belongs to the workflow whose built-in logic would normally handle this event, the
// function returns true so the caller skips the built-in version — one workflow, one run,
// never a duplicate task/message. Never throws.

import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/security/rateLimit";
import { recordWorkflowRun } from "@/lib/actions/workflows";
import { runGraph, type GraphContext } from "./interpreter";
import type { TriggerKind, WorkflowGraph, GraphNode, GraphEdge } from "./types";

interface GraphRow { workflow_key: string; nodes: GraphNode[] | null; edges: GraphEdge[] | null; version: number | null }

/** Canvases that should run for `kind`: active, trigger matches, something follows the trigger. */
export function pickGraphs(rows: GraphRow[], active: Map<string, boolean>, kind: TriggerKind): WorkflowGraph[] {
  const out: WorkflowGraph[] = [];
  for (const r of rows) {
    const nodes = r.nodes ?? [];
    const edges = r.edges ?? [];
    const trigger = nodes.find((n) => n.type === "trigger");
    if (!trigger || (trigger.data as { kind?: string }).kind !== kind) continue;
    if (!edges.some((e) => e.source === trigger.id)) continue;
    if (active.get(r.workflow_key) === false) continue;
    out.push({ workflowKey: r.workflow_key, nodes, edges, version: r.version ?? 1 });
  }
  return out;
}

const PER_GRAPH_LIMIT = 30; // runs / minute — stops a canvas that re-triggers itself (e.g. via HTTP Request)

export async function runCustomGraphs(kind: TriggerKind, ctx: GraphContext, builtinKey?: string): Promise<boolean> {
  let picked: WorkflowGraph[] = [];
  const names = new Map<string, string>();
  try {
    const db = getDb();
    const { data: rows, error } = await db.from("workflow_graphs").select("*");
    if (error || !rows?.length) return false;
    const { data: wfs } = await db.from("workflows").select("key, name, active");
    const active = new Map<string, boolean>();
    for (const w of (wfs ?? []) as { key: string; name: string; active: boolean }[]) {
      active.set(w.key, w.active);
      names.set(w.key, w.name);
    }
    picked = pickGraphs(rows as GraphRow[], active, kind);
  } catch (err) {
    console.error("[automation-graph] dispatch lookup failed:", err);
    return false;
  }

  const replaced = picked.some((g) => g.workflowKey === builtinKey);
  const entity = String(ctx.company ?? ctx.name ?? "record");

  for (const g of picked) {
    try {
      if (!rateLimit(`graph-run:${g.workflowKey}`, PER_GRAPH_LIMIT, 60_000).allowed) {
        console.error(`[automation-graph] "${g.workflowKey}" exceeded ${PER_GRAPH_LIMIT} runs/min — skipped (possible loop)`);
        continue;
      }
      const steps = await runGraph(g, { ...ctx });
      await recordWorkflowRun({
        id: `graph-auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        workflowId: g.workflowKey,
        workflowName: names.get(g.workflowKey) ?? g.workflowKey,
        trigger: `Auto · ${kind} · ${entity}`,
        entity,
        steps,
        ok: steps.every((s) => s.ok),
        at: Date.now(),
      });
    } catch (err) {
      console.error(`[automation-graph] auto-run of "${g.workflowKey}" failed:`, err);
    }
  }
  return replaced;
}
