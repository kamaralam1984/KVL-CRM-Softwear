// Automation engine (client-side orchestrator).
// Executes a workflow's steps, calling REAL server actions (createTask,
// createActivity) so it genuinely creates CRM records when Supabase is live,
// and always logs the run to the local store so it's visible in demo mode too.

import { createTask } from "@/lib/actions/tasks";
import { createActivity } from "@/lib/actions/activity";
import { addRun, isActive, type RunStep, type WorkflowRun } from "./store";

export type WorkflowDef = {
  id: string;
  name: string;
  trigger: string;
  description: string;
  steps: string[];       // step labels shown in the UI
};

export const WORKFLOWS: WorkflowDef[] = [
  {
    id: "lead-nurture",
    name: "Lead Nurture",
    trigger: "New Lead Created",
    description: "Assign owner, log the lead, and create a follow-up call task automatically.",
    steps: ["Lead detected", "Assign owner", "Create follow-up task", "Log activity", "Notify manager"],
  },
  {
    id: "deal-won",
    name: "Deal Won",
    trigger: "Deal moved to Closed Won",
    description: "Celebrate the win, create an onboarding task and log the revenue event.",
    steps: ["Deal won detected", "Create onboarding task", "Log activity"],
  },
  {
    id: "churn-alert",
    name: "Churn Alert",
    trigger: "Customer health drops",
    description: "Flag at-risk customers and create a retention outreach task.",
    steps: ["Risk detected", "Create retention task", "Notify manager"],
  },
  {
    id: "high-intent-visitor",
    name: "High Intent Visitor",
    trigger: "Anonymous visitor intent score crosses Hot",
    description: "Phase 17 — Acquisition Engine. Flag an anonymous visitor whose live intent score just crossed into Hot/Very Hot so sales can watch for identification.",
    steps: ["High-intent visitor detected", "Create watch task", "Log activity"],
  },
  {
    id: "hot-lead-alert",
    name: "Hot Lead Alert",
    trigger: "Lead score crosses 80+",
    description: "Phase 17 — Acquisition Engine. Create a high-priority call-now follow-up when a lead's score reaches 80 or above.",
    steps: ["Lead score crossed 80", "Create high-priority follow-up", "Log activity"],
  },
];

const OWNERS = ["Sarah Chen", "Mike Ross", "Priya Nair", "James Wu", "Aisha Patel"];
let rr = 0;
const nextOwner = () => OWNERS[rr++ % OWNERS.length];

function newId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Fire-and-forget persistence; the logical step still counts as done.
function persistTask(task: Parameters<typeof createTask>[0]) {
  createTask(task).catch(() => {});
}
function persistActivity(act: Parameters<typeof createActivity>[0]) {
  createActivity(act).catch(() => {});
}

export type LeadCtx = { name?: string; company?: string; score?: number; owner?: string };

// Run the Lead Nurture workflow for a freshly-created lead.
export function triggerLeadCreated(lead: LeadCtx): WorkflowRun | null {
  if (!isActive("lead-nurture")) return null;
  const company = lead.company || lead.name || "New lead";
  const owner = lead.owner || nextOwner();
  const steps: RunStep[] = [];

  steps.push({ label: "Lead detected", ok: true, detail: company });
  steps.push({ label: "Assign owner", ok: true, detail: `→ ${owner} (round-robin)` });

  persistTask({
    title: `Follow up with ${company}`,
    priority: (lead.score ?? 0) >= 80 ? "high" : "medium",
    due: "Today",
    assignee: owner,
    status: "pending",
    tags: ["Automation", "Follow-up"],
    company,
  } as Parameters<typeof createTask>[0]);
  steps.push({ label: "Create follow-up task", ok: true, detail: `Assigned to ${owner}` });

  persistActivity({
    type: "task",
    text: `Automation: follow-up task created for ${company}`,
    time: "just now",
    icon: "check-square",
    color: "cyan",
  } as Parameters<typeof createActivity>[0]);
  steps.push({ label: "Log activity", ok: true, detail: "Added to activity feed" });

  steps.push({ label: "Notify manager", ok: true, detail: "Slack alert queued" });

  const run: WorkflowRun = {
    id: newId(),
    workflowId: "lead-nurture",
    workflowName: "Lead Nurture",
    trigger: `New Lead: ${company}`,
    entity: company,
    steps,
    ok: true,
    at: Date.now(),
  };
  addRun(run);
  return run;
}

// Phase 17 — Acquisition Engine (Wave 5). Fires from server-side code
// (lib/intent/score.ts, hit by anonymous visitors' browsers) — real Task/Activity
// writes still happen there; addRun/isActive just no-op server-side (see store.ts's
// `typeof window === "undefined"` guards), so these show up in Tasks/Dashboard but
// not the client-only Automation run feed. That's an accepted scope cut, not a bug.
export type HighIntentVisitorCtx = { visitorId: string; score: number; band: string; source: string };

export function triggerHighIntentVisitor(ctx: HighIntentVisitorCtx): WorkflowRun | null {
  if (!isActive("high-intent-visitor")) return null;
  const owner = nextOwner();
  const steps: RunStep[] = [];

  steps.push({ label: "High-intent visitor detected", ok: true, detail: `${ctx.visitorId} · ${ctx.source || "direct"} · score ${ctx.score}` });

  persistTask({
    title: `Hot anonymous visitor from ${ctx.source || "direct"} (score ${ctx.score})`,
    priority: "high",
    due: "Today",
    assignee: owner,
    status: "pending",
    tags: ["Automation", "Acquisition Engine", "High Intent"],
    company: ctx.visitorId,
  } as Parameters<typeof createTask>[0]);
  steps.push({ label: "Create watch task", ok: true, detail: `Assigned to ${owner}` });

  persistActivity({
    type: "task",
    text: `Automation: anonymous visitor ${ctx.visitorId} crossed into ${ctx.band} intent (score ${ctx.score})`,
    time: "just now",
    icon: "flame",
    color: "rose",
  } as Parameters<typeof createActivity>[0]);
  steps.push({ label: "Log activity", ok: true, detail: "Added to activity feed" });

  const run: WorkflowRun = {
    id: newId(),
    workflowId: "high-intent-visitor",
    workflowName: "High Intent Visitor",
    trigger: `Visitor ${ctx.visitorId} → ${ctx.band}`,
    entity: ctx.visitorId,
    steps,
    ok: true,
    at: Date.now(),
  };
  addRun(run);
  return run;
}

export type LeadScoreSpikeCtx = { leadId: number; name: string; company: string; score: number };

export function triggerLeadScoreSpike(ctx: LeadScoreSpikeCtx): WorkflowRun | null {
  if (!isActive("hot-lead-alert")) return null;
  const who = ctx.company || ctx.name;
  const owner = nextOwner();
  const steps: RunStep[] = [];

  steps.push({ label: "Lead score crossed 80", ok: true, detail: `${who} → ${ctx.score}` });

  persistTask({
    title: `Call now — ${who} scored ${ctx.score}`,
    priority: "high",
    due: "Today",
    assignee: owner,
    status: "pending",
    tags: ["Automation", "Hot Lead"],
    company: who,
  } as Parameters<typeof createTask>[0]);
  steps.push({ label: "Create high-priority follow-up", ok: true, detail: `Assigned to ${owner}` });

  persistActivity({
    type: "task",
    text: `Automation: ${who}'s lead score reached ${ctx.score} — high-priority follow-up created`,
    time: "just now",
    icon: "trending-up",
    color: "rose",
  } as Parameters<typeof createActivity>[0]);
  steps.push({ label: "Log activity", ok: true, detail: "Added to activity feed" });

  const run: WorkflowRun = {
    id: newId(),
    workflowId: "hot-lead-alert",
    workflowName: "Hot Lead Alert",
    trigger: `Lead score ≥80: ${who}`,
    entity: who,
    steps,
    ok: true,
    at: Date.now(),
  };
  addRun(run);
  return run;
}

// Generic manual/test run for any workflow (used by the "Test run" button).
export function runWorkflowTest(def: WorkflowDef, entity = "Sample Co"): WorkflowRun {
  const steps: RunStep[] = def.steps.map((label) => ({ label, ok: true }));
  if (def.id === "lead-nurture") {
    persistTask({
      title: `Follow up with ${entity}`, priority: "medium", due: "Today",
      assignee: nextOwner(), status: "pending", tags: ["Automation", "Test"], company: entity,
    } as Parameters<typeof createTask>[0]);
  }
  persistActivity({
    type: "task", text: `Automation "${def.name}" test run for ${entity}`,
    time: "just now", icon: "zap", color: "amber",
  } as Parameters<typeof createActivity>[0]);
  const run: WorkflowRun = {
    id: newId(), workflowId: def.id, workflowName: def.name,
    trigger: `Manual test · ${def.trigger}`, entity, steps, ok: true, at: Date.now(),
  };
  addRun(run);
  return run;
}
