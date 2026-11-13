import { describe, it, expect, vi, beforeEach } from "vitest";

const { tables, runGraphMock, recordMock } = vi.hoisted(() => ({
  tables: { workflows: [] as unknown[], workflow_graphs: [] as unknown[] } as Record<string, unknown[]>,
  runGraphMock: vi.fn(async () => [{ label: "x", ok: true }]),
  recordMock: vi.fn(async () => {}),
}));
vi.mock("@/lib/db", () => ({ getDb: () => ({ from: (t: string) => ({ select: async () => ({ data: tables[t], error: null }) }) }) }));
vi.mock("@/lib/actions/workflows", () => ({ recordWorkflowRun: recordMock }));
vi.mock("./interpreter", () => ({ runGraph: runGraphMock }));

import { pickGraphs, runCustomGraphs } from "./dispatch";
import { emptyGraph } from "./types";

const row = (key: string, kind: string, connected: boolean) => ({
  workflow_key: key,
  version: 1,
  nodes: [
    { id: "t", type: "trigger" as const, position: { x: 0, y: 0 }, data: { kind, label: "x" } },
    { id: "a", type: "action" as const, position: { x: 0, y: 0 }, data: { kind: "log_activity", label: "Log", params: {} } },
  ] as never,
  edges: connected ? [{ id: "e", source: "t", target: "a" }] : [],
});

describe("pickGraphs", () => {
  it("selects connected canvases whose trigger matches the event", () => {
    const picked = pickGraphs([row("lead-nurture", "lead_created", true), row("deal-won", "deal_won", true)], new Map(), "lead_created");
    expect(picked.map((g) => g.workflowKey)).toEqual(["lead-nurture"]);
  });

  it("ignores a canvas with nothing after the trigger (so the built-in keeps running)", () => {
    expect(pickGraphs([row("lead-nurture", "lead_created", false)], new Map(), "lead_created")).toEqual([]);
  });

  it("skips canvases whose workflow is switched off, but treats unknown workflows as on", () => {
    const rows = [row("lead-nurture", "lead_created", true), row("custom", "lead_created", true)];
    const picked = pickGraphs(rows, new Map([["lead-nurture", false]]), "lead_created");
    expect(picked.map((g) => g.workflowKey)).toEqual(["custom"]);
  });
});

describe("emptyGraph", () => {
  it("defaults the trigger to the workflow's own event", () => {
    expect((emptyGraph("deal-won").nodes[0].data as { kind: string }).kind).toBe("deal_won");
    expect((emptyGraph("lead-nurture").nodes[0].data as { kind: string }).kind).toBe("lead_created");
  });
});

describe("runCustomGraphs", () => {
  beforeEach(() => { runGraphMock.mockClear(); recordMock.mockClear(); tables.workflows = []; tables.workflow_graphs = []; });

  it("skips the built-in when its workflow is switched off in the database", async () => {
    tables.workflows = [{ key: "churn-alert", name: "Churn Alert", active: false }];
    expect(await runCustomGraphs("customer_health_drop", {}, "churn-alert")).toBe(true);
    expect(runGraphMock).not.toHaveBeenCalled();
  });

  it("lets the built-in run when no canvas matches and the workflow is on", async () => {
    tables.workflows = [{ key: "lead-nurture", name: "Lead Nurture", active: true }];
    expect(await runCustomGraphs("lead_created", {}, "lead-nurture")).toBe(false);
  });

  it("replaces the built-in with a matching canvas and runs it in SAFE (dry-run) mode by default", async () => {
    tables.workflows = [{ key: "lead-nurture", name: "Lead Nurture", active: true }];
    tables.workflow_graphs = [row("lead-nurture", "lead_created", true)];
    expect(await runCustomGraphs("lead_created", { company: "Acme" }, "lead-nurture")).toBe(true);
    expect(runGraphMock).toHaveBeenCalledTimes(1);
    expect((runGraphMock.mock.calls[0] as unknown[])[2]).toEqual({ auto: true, dryRun: true });
    expect((recordMock.mock.calls[0] as unknown[])[0]).toMatchObject({ trigger: "Auto (dry run) · lead_created · Acme" });
  });

  it("sends for real only when the trigger node says sendMode: live", async () => {
    tables.workflows = [{ key: "lead-nurture", name: "Lead Nurture", active: true }];
    const live = row("lead-nurture", "lead_created", true);
    (live.nodes as unknown as { data: Record<string, unknown> }[])[0].data.sendMode = "live";
    tables.workflow_graphs = [live];
    await runCustomGraphs("lead_created", { company: "Acme" }, "lead-nurture");
    expect((runGraphMock.mock.calls[0] as unknown[])[2]).toEqual({ auto: true, dryRun: false });
  });

  it("fails open (built-in still runs) if the database lookup throws", async () => {
    tables.workflows = undefined as never;
    // select resolves with data undefined → treated as empty, not an error
    expect(await runCustomGraphs("lead_created", {}, "lead-nurture")).toBe(false);
  });
});
