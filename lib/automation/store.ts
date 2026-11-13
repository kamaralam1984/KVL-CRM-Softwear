// Client-side store for automation runs + workflow active-state.
// Persists to localStorage so executions survive reloads and are visible in
// demo mode (no the database). Emits a browser event so open pages live-update.
//
// Phase 19: dual-write added. localStorage stays the fast, always-available
// client cache every existing reader (isActive, getRuns) still uses exactly
// as before; addRun ALSO fire-and-forgets a real database write (the active toggle is
// database-first — see toggleWorkflowActive below)
// via lib/actions/workflows.ts, so runs and the active-toggle survive a
// restart and are visible cross-device (see docs/GHL_PARITY_STATUS.md).
// This also closes a documented gap (ACQUISITION_ENGINE_ROADMAP.md Wave 5):
// addRun previously no-op'd entirely server-side (`typeof window` guard), so
// triggers fired from server code (e.g. lib/intent/score.ts) never showed up
// in the run feed even though they created real Task/Activity rows — the new
// recordWorkflowRun() call below runs unconditionally, client or server.

import { recordWorkflowRun, getWorkflows as getWorkflowsRemote, setWorkflowActive as setWorkflowActiveRemote } from "@/lib/actions/workflows";

export type RunStep = { label: string; ok: boolean; detail?: string; nodeId?: string };
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
  // Runs unconditionally (client or server) — see file header.
  recordWorkflowRun(run).catch(() => {});

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

// ── Database is the source of truth for on/off ───────────────────────────────
// localStorage is only a fast synchronous cache for the client-side trigger gates (isActive).
// - hydrateActiveFromDb(): overwrite the cache with the database values (call once after login)
// - toggleWorkflowActive(): write the database FIRST, flip the cache only if that was allowed,
//   so a denied/failed change never leaves this browser out of step with the server.
// The token is passed in (not read here) because this module is also imported by server code.
function readActive(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "{}"); } catch { return {}; }
}
function writeActive(m: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(m)); } catch { /* storage unavailable */ }
}

export async function hydrateActiveFromDb(accessToken?: string): Promise<Record<string, boolean> | null> {
  try {
    const rows = await getWorkflowsRemote(accessToken);
    if (!rows.length) return null;
    const m = readActive();
    for (const w of rows) m[w.key] = w.active;
    writeActive(m);
    return m;
  } catch {
    return null;
  }
}

/** Returns false when the change was refused (no permission) — nothing was changed in that case. */
export async function toggleWorkflowActive(workflowId: string, on: boolean, accessToken?: string): Promise<boolean> {
  const res = await setWorkflowActiveRemote(workflowId, on, accessToken).catch(() => "error" as const);
  if (res === "denied") return false;
  writeActive({ ...readActive(), [workflowId]: on });
  return true;
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
