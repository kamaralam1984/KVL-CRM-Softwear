import { describe, it, expect } from "vitest";
import { runGraph } from "./interpreter";
import type { WorkflowGraph } from "./types";

const baseGraph = (): WorkflowGraph => ({
  workflowKey: "test-graph",
  version: 1,
  nodes: [
    { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { kind: "lead_created", label: "New Lead Created" } },
    { id: "c1", type: "condition", position: { x: 0, y: 100 }, data: { field: "score", op: "gt", value: "80", label: "score > 80" } },
    { id: "a-hot", type: "action", position: { x: 0, y: 200 }, data: { kind: "log_activity", label: "Log hot lead", params: {} } },
    { id: "a-cold", type: "action", position: { x: 200, y: 200 }, data: { kind: "log_activity", label: "Log cold lead", params: {} } },
  ],
  edges: [
    { id: "e1", source: "t1", target: "c1" },
    { id: "e2", source: "c1", target: "a-hot", sourceHandle: "true" },
    { id: "e3", source: "c1", target: "a-cold", sourceHandle: "false" },
  ],
});

describe("runGraph", () => {
  it("takes the TRUE branch when the condition passes", async () => {
    const steps = await runGraph(baseGraph(), { score: 95, company: "Acme" });
    const labels = steps.map((s) => s.label);
    expect(labels).toContain("New Lead Created");
    expect(labels).toContain("score > 80");
    expect(labels).toContain("Log hot lead");
    expect(labels).not.toContain("Log cold lead");
  });

  it("takes the FALSE branch when the condition fails", async () => {
    const steps = await runGraph(baseGraph(), { score: 10, company: "Acme" });
    const labels = steps.map((s) => s.label);
    expect(labels).toContain("Log cold lead");
    expect(labels).not.toContain("Log hot lead");
  });

  it("reports an unwired send action as not-ok, never throws, never fakes success", async () => {
    const graph: WorkflowGraph = {
      workflowKey: "wa-test",
      version: 1,
      nodes: [
        { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { kind: "lead_created", label: "New Lead" } },
        { id: "a1", type: "action", position: { x: 0, y: 100 }, data: { kind: "send_whatsapp", label: "Send WhatsApp", params: {} } },
      ],
      edges: [{ id: "e1", source: "t1", target: "a1" }],
    };
    const steps = await runGraph(graph, { company: "Acme" });
    const waStep = steps.find((s) => s.label === "Send WhatsApp");
    expect(waStep?.ok).toBe(false);
    expect(waStep?.detail).toMatch(/Phase 21/);
  });

  it("returns an error step for a graph with no trigger node", async () => {
    const steps = await runGraph({ workflowKey: "no-trigger", version: 1, nodes: [], edges: [] }, {});
    expect(steps).toHaveLength(1);
    expect(steps[0].ok).toBe(false);
  });

  it("stops at the safety limit instead of looping forever on a cyclic graph", async () => {
    const graph: WorkflowGraph = {
      workflowKey: "cycle",
      version: 1,
      nodes: [
        { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { kind: "lead_created", label: "New Lead" } },
        { id: "a1", type: "action", position: { x: 0, y: 100 }, data: { kind: "log_activity", label: "Loop step", params: {} } },
      ],
      edges: [
        { id: "e1", source: "t1", target: "a1" },
        { id: "e2", source: "a1", target: "a1" }, // self-loop
      ],
    };
    const steps = await runGraph(graph, {});
    expect(steps.some((s) => s.label === "Safety limit reached")).toBe(true);
  });
});
