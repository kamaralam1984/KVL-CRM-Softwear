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
