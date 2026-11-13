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
  WorkflowGraph, GraphNode, ConditionNodeData, ActionNodeData,
} from "./types";
import type { RunStep } from "../store";
import { sendWhatsApp, sendSms, sendEmail } from "@/lib/messaging/send";
import { isSafeWebhookUrl } from "@/lib/security/ssrfGuard";

// Flat context the trigger hands the interpreter — e.g. { company, score, owner }.
export type GraphContext = Record<string, string | number | undefined>;

const MAX_STEPS = 200; // cycle/runaway-graph guard

export interface RunOptions {
  /** Log what messages / HTTP calls WOULD happen but don't send or call anything. */
  dryRun?: boolean;
  /** Fired by a real CRM event (not Test run) — enables the send guard below. */
  auto?: boolean;
}

// ── Send guard (automatic runs only) ─────────────────────────────────────────
// A canvas that fires by itself must not be able to spam: the same node never messages the
// same recipient twice within an hour (retries / double firing), and one canvas can send at
// most SEND_CAP messages per hour in total (circuit breaker for a bad template or a loop).
const SEND_WINDOW_MS = 60 * 60 * 1000;
const SEND_CAP = 100;
const recentSends = new Map<string, number>();      // `${wf}|${node}|${to}` → last send time
const workflowSends = new Map<string, number[]>();  // wf → send times in the window

export function checkSendAllowed(wf: string, nodeId: string, to: string, now = Date.now()): string | null {
  for (const [k, t] of recentSends) if (now - t > SEND_WINDOW_MS) recentSends.delete(k);
  const key = `${wf}|${nodeId}|${to.toLowerCase()}`;
  if (recentSends.has(key)) return `Skipped: this step already messaged ${to} in the last hour`;
  const times = (workflowSends.get(wf) ?? []).filter((t) => now - t <= SEND_WINDOW_MS);
  if (times.length >= SEND_CAP) { workflowSends.set(wf, times); return `Skipped: hourly send limit (${SEND_CAP}) reached for this workflow`; }
  times.push(now);
  workflowSends.set(wf, times);
  recentSends.set(key, now);
  return null;
}
export function resetSendGuard(): void { recentSends.clear(); workflowSends.clear(); }

// {{field}} / {{ field }} expressions → values from the running record.
export function fillExpr(t: string, ctx: GraphContext): string {
  return String(t ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => String(ctx[k] ?? ""));
}

function evalCondition(rawCond: ConditionNodeData, ctx: GraphContext): boolean {
  const cond = { ...rawCond, value: fillExpr(rawCond.value, ctx) };
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

async function runAction(node: GraphNode, data: ActionNodeData, ctx: GraphContext, wf: string, opts: RunOptions): Promise<RunStep> {
  const entity = String(ctx.company ?? ctx.name ?? "record");
  const p = (k: string) => fillExpr(data.params?.[k] ?? "", ctx).trim();
  const step = (ok: boolean, detail: string): RunStep => ({ label: data.label, ok, detail, nodeId: node.id });

  try {
    if (data.kind === "send_whatsapp" || data.kind === "send_sms" || data.kind === "send_email") {
      const body = fillExpr(data.params?.body || data.params?.text || `Hi ${ctx.name ?? "there"}, following up from our team.`, ctx);
      const to = p("to") || String(data.kind === "send_email" ? ctx.email ?? "" : ctx.phone ?? "");
      if (!to) return step(false, `No ${data.kind === "send_email" ? "email" : "phone"} on this record`);
      if (opts.dryRun) return step(true, `Dry run — would ${data.kind.replace("send_", "send ")} to ${to}: “${body.replace(/\s+/g, " ").slice(0, 90)}”`);
      if (opts.auto) {
        const blocked = checkSendAllowed(wf, node.id, to);
        if (blocked) return step(false, blocked);
      }
      const r = data.kind === "send_whatsapp" ? await sendWhatsApp(to, body)
        : data.kind === "send_sms" ? await sendSms(to, body)
        : await sendEmail(to, p("subject") || "Following up", body.replace(/\n/g, "<br>"));
      return step(r.ok, r.ok ? (r.mock ? "Logged (provider not configured)" : `Sent to ${to}`) : (r.detail ?? "Send failed"));
    }

    if (data.kind === "create_task") {
      await createTask({
        title: p("title") || `Follow up with ${entity}`,
        priority: (p("priority") as "high" | "medium" | "low") || "medium",
        due: p("due") || "Today",
        assignee: p("assignee") || "Unassigned",
        status: "pending",
        tags: ["Automation", "Graph Builder"],
        company: entity,
      } as Parameters<typeof createTask>[0]);
      return step(true, `Task created for ${entity}`);
    }

    if (data.kind === "log_activity") {
      await createActivity({
        type: "task",
        text: p("text") || `Automation: workflow step for ${entity}`,
        time: "just now",
        icon: "zap",
        color: "amber",
      } as Parameters<typeof createActivity>[0]);
      return step(true, "Added to activity feed");
    }

    if (data.kind === "set_field") {
      const key = p("key");
      if (!/^\w+$/.test(key)) return step(false, "Field name must be letters, numbers or _");
      ctx[key] = p("value");
      return step(true, `${key} = ${ctx[key]}`);
    }

    if (data.kind === "http_request") {
      const url = p("url");
      if (!url) return step(false, "No URL set");
      if (!(await isSafeWebhookUrl(url))) return step(false, "Blocked: URL must be a public http(s) address");
      const method = p("method") === "GET" ? "GET" : "POST";
      if (opts.dryRun) return step(true, `Dry run — would ${method} ${url}`);
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 8000);
      try {
        const res = await fetch(url, {
          method,
          signal: ac.signal,
          redirect: "manual",
          headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
          body: method === "POST" ? (p("body") || JSON.stringify({ company: ctx.company ?? null, name: ctx.name ?? null, score: ctx.score ?? null })) : undefined,
        });
        const text = (await res.text()).slice(0, 2000);
        ctx.http_status = res.status;
        ctx.http_body = text;
        return step(res.ok, `${method} ${res.status}${res.ok ? "" : " — request failed"}`);
      } finally {
        clearTimeout(timer);
      }
    }

    return step(false, `Unknown action kind "${data.kind}"`);
  } catch (err) {
    console.error(`[automation-graph] action "${data.kind}" failed:`, err);
    return step(false, "Action failed — see server logs");
  }
}

// Runs the graph from its trigger node, following edges (condition nodes
// branch on sourceHandle "true"/"false"). Returns the ordered step log.
export async function runGraph(graph: WorkflowGraph, ctx: GraphContext, opts: RunOptions = {}): Promise<RunStep[]> {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const trigger = graph.nodes.find((n) => n.type === "trigger");
  if (!trigger) return [{ label: "No trigger node", ok: false, detail: "Add a trigger to run this workflow" }];

  const steps: RunStep[] = [];
  const triggerData = trigger.data as { label: string };
  steps.push({ label: triggerData.label, ok: true, detail: "Trigger fired", nodeId: trigger.id });

  let current: GraphNode | undefined = trigger;
  let guard = 0;

  while (current && guard++ < MAX_STEPS) {
    const outgoing = graph.edges.filter((e) => e.source === current!.id);
    let next: GraphNode | undefined;

    if (current.type === "condition") {
      const passed = evalCondition(current.data as ConditionNodeData, ctx);
      const edge = outgoing.find((e) => e.sourceHandle === (passed ? "true" : "false"));
      steps.push({ label: (current.data as ConditionNodeData).label, ok: true, detail: passed ? "TRUE branch" : "FALSE branch", nodeId: current.id });
      next = edge ? nodeById.get(edge.target) : undefined;
    } else if (current.type === "action") {
      steps.push(await runAction(current, current.data as ActionNodeData, ctx, graph.workflowKey, opts));
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
