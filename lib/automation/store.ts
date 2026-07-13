// Client-side store for automation runs + workflow active-state.
// Persists to localStorage so executions survive reloads and are visible in
// demo mode (no Supabase). Emits a browser event so open pages live-update.

export type RunStep = { label: string; ok: boolean; detail?: string };
export type WorkflowRun = {
  id: string;
  workflowId: string;
  workflowName: string;
  trigger: string;       // what fired it, e.g. "New Lead: Acme"
  entity: string;        // the subject, e.g. lead/company name
  steps: RunStep[];
  ok: boolean;
  at: number;            // epoch ms
};

const RUNS_KEY = "crm_automation_runs";
const ACTIVE_KEY = "crm_automation_active";
export const AUTOMATION_EVENT = "automation-run";
const MAX_RUNS = 200;

export function getRuns(): WorkflowRun[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY) || "[]") as WorkflowRun[];
  } catch {
    return [];
  }
}

export function addRun(run: WorkflowRun): void {
  if (typeof window === "undefined") return;
  const runs = [run, ...getRuns()].slice(0, MAX_RUNS);
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  window.dispatchEvent(new CustomEvent(AUTOMATION_EVENT, { detail: run }));
}

// Workflow active on/off — defaults to `def` when nothing stored yet.
export function isActive(workflowId: string, def = true): boolean {
  if (typeof window === "undefined") return def;
  try {
    const m = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "{}");
    return workflowId in m ? !!m[workflowId] : def;
  } catch {
    return def;
  }
}

export function setActive(workflowId: string, on: boolean): void {
  if (typeof window === "undefined") return;
  let m: Record<string, boolean> = {};
  try {
    m = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "{}");
  } catch {
    m = {};
  }
  m[workflowId] = on;
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(m));
}

// "time ago" helper for display
export function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
