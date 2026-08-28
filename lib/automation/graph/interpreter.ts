// Phase 20 — Visual Drag-Drop Workflow Builder.
// Walks a persisted WorkflowGraph starting at its trigger node, evaluating
// condition nodes with a small safe `field op value` comparator (no eval())
// and executing action nodes by calling EXISTING server actions
// (createTask/createActivity) — the same functions
// lib/automation/engine.ts's hardcoded triggers already call. Never throws;
// a failed step is recorded, not fatal to the run.

import { createTask } from "@/lib/actions/tasks";
import { createActivity } from "@/lib/actions/activity";
import type {
  WorkflowGraph, GraphNode, ConditionNodeData, ActionNodeData, ActionKind,
} from "./types";
import type { RunStep } from "../store";

// Flat context the trigger hands the interpreter — e.g. { company, score, owner }.
export type GraphContext = Record<string, string | number | undefined>;

const MAX_STEPS = 200; // cycle/runaway-graph guard

function evalCondition(cond: ConditionNodeData, ctx: GraphContext): boolean {
  const actual = ctx[cond.field];
  switch (cond.op) {
    case "eq": return String(actual ?? "") === cond.value;
    case "neq": return String(actual ?? "") !== cond.value;
    case "gt": return Number(actual) > Number(cond.value);
    case "gte": return Number(actual) >= Number(cond.value);
    case "lt": return Number(actual) < Number(cond.value);
    case "lte": return Number(actual) <= Number(cond.value);
    case "contains": return String(actual ?? "").toLowerCase().includes(cond.value.toLowerCase());
    default: return false;
  }
}

// Not yet wired to a real channel (ships in Phase 21's lib/messaging/send.ts)
// — honestly reported as not-implemented rather than faked as sent.
const UNWIRED_ACTIONS = new Set<ActionKind>(["send_whatsapp", "send_email", "send_sms"]);

async function runAction(node: GraphNode, data: ActionNodeData, ctx: GraphContext): Promise<RunStep> {
  const entity = String(ctx.company ?? ctx.name ?? "record");

  if (UNWIRED_ACTIONS.has(data.kind)) {
    console.warn(`[automation-graph] ${data.kind} not wired to a real channel yet — ships in Phase 21`);
    return { label: data.label, ok: false, detail: "Channel not connected yet (Phase 21)" };
  }

  try {
    if (data.kind === "create_task") {
      await createTask({
        title: data.params.title || `Follow up with ${entity}`,
        priority: (data.params.priority as "high" | "medium" | "low") || "medium",
        due: data.params.due || "Today",
        assignee: data.params.assignee || "Unassigned",
        status: "pending",
        tags: ["Automation", "Graph Builder"],
        company: entity,
      } as Parameters<typeof createTask>[0]);
      return { label: data.label, ok: true, detail: `Task created for ${entity}` };
    }

    if (data.kind === "log_activity") {
      await createActivity({
        type: "task",
        text: data.params.text || `Automation: workflow step for ${entity}`,
        time: "just now",
        icon: "zap",
        color: "amber",
      } as Parameters<typeof createActivity>[0]);
      return { label: data.label, ok: true, detail: "Added to activity feed" };
    }

    return { label: data.label, ok: false, detail: `Unknown action kind "${data.kind}"` };
  } catch (err) {
    console.error(`[automation-graph] action "${data.kind}" failed:`, err);
    return { label: data.label, ok: false, detail: "Action failed — see server logs" };
  }
}

// Runs the graph from its trigger node, following edges (condition nodes
// branch on sourceHandle "true"/"false"). Returns the ordered step log.
export async function runGraph(graph: WorkflowGraph, ctx: GraphContext): Promise<RunStep[]> {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const trigger = graph.nodes.find((n) => n.type === "trigger");
  if (!trigger) return [{ label: "No trigger node", ok: false, detail: "Add a trigger to run this workflow" }];

  const steps: RunStep[] = [];
  const triggerData = trigger.data as { label: string };
  steps.push({ label: triggerData.label, ok: true, detail: "Trigger fired" });

  let current: GraphNode | undefined = trigger;
  let guard = 0;

  while (current && guard++ < MAX_STEPS) {
    const outgoing = graph.edges.filter((e) => e.source === current!.id);
    let next: GraphNode | undefined;

    if (current.type === "condition") {
      const passed = evalCondition(current.data as ConditionNodeData, ctx);
      const edge = outgoing.find((e) => e.sourceHandle === (passed ? "true" : "false"));
      steps.push({ label: (current.data as ConditionNodeData).label, ok: true, detail: passed ? "TRUE branch" : "FALSE branch" });
      next = edge ? nodeById.get(edge.target) : undefined;
    } else if (current.type === "action") {
      steps.push(await runAction(current, current.data as ActionNodeData, ctx));
      next = outgoing[0] ? nodeById.get(outgoing[0].target) : undefined;
    } else {
      // trigger node — just move to whatever follows it
      next = outgoing[0] ? nodeById.get(outgoing[0].target) : undefined;
    }

    current = next;
  }

  if (guard >= MAX_STEPS) {
    console.error(`[automation-graph] workflow "${graph.workflowKey}" hit the ${MAX_STEPS}-step safety limit — check for a cycle`);
    steps.push({ label: "Safety limit reached", ok: false, detail: `Stopped after ${MAX_STEPS} steps` });
  }

  return steps;
}
