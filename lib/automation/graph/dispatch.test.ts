import { describe, it, expect } from "vitest";
import { pickGraphs } from "./dispatch";
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
