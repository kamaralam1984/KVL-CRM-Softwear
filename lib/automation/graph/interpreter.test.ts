import { describe, it, expect } from "vitest";
import { runGraph, checkSendAllowed, resetSendGuard } from "./interpreter";
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

  it("reports a send action with no recipient as not-ok, never throws, never fakes success", async () => {
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
    expect(waStep?.detail).toMatch(/No phone/);
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

  it("fills {{expressions}}, carries Set Field values forward and tags steps with node ids", async () => {
    const graph: WorkflowGraph = {
      workflowKey: "expr-test",
      version: 1,
      nodes: [
        { id: "t", type: "trigger", position: { x: 0, y: 0 }, data: { kind: "manual", label: "Manual Trigger" } },
        { id: "s", type: "action", position: { x: 0, y: 0 }, data: { kind: "set_field", label: "Set", params: { key: "tag", value: "VIP-{{company}}" } } },
        { id: "c", type: "condition", position: { x: 0, y: 0 }, data: { field: "tag", op: "eq", value: "VIP-{{company}}", label: "tag check" } },
        { id: "a", type: "action", position: { x: 0, y: 0 }, data: { kind: "log_activity", label: "Log", params: { text: "{{tag}}" } } },
      ],
      edges: [
        { id: "1", source: "t", target: "s" },
        { id: "2", source: "s", target: "c" },
        { id: "3", source: "c", target: "a", sourceHandle: "true" },
      ],
    };
    const steps = await runGraph(graph, { company: "Acme" });
    expect(steps.find((x) => x.label === "Set")?.detail).toBe("tag = VIP-Acme");
    expect(steps.find((x) => x.label === "tag check")?.detail).toBe("TRUE branch");
    expect(steps.map((x) => x.nodeId)).toEqual(["t", "s", "c", "a"]);
  });

  it("HTTP Request refuses private/loopback URLs and invalid Set Field names", async () => {
    const mk = (kind: "http_request" | "set_field", params: Record<string, string>): WorkflowGraph => ({
      workflowKey: "http-test",
      version: 1,
      nodes: [
        { id: "t", type: "trigger", position: { x: 0, y: 0 }, data: { kind: "manual", label: "Manual Trigger" } },
        { id: "a", type: "action", position: { x: 0, y: 0 }, data: { kind, label: "Node", params } },
      ],
      edges: [{ id: "1", source: "t", target: "a" }],
    });
    const blocked = await runGraph(mk("http_request", { method: "GET", url: "http://127.0.0.1:3000/admin" }), {});
    expect(blocked[1].ok).toBe(false);
    expect(blocked[1].detail).toMatch(/Blocked/);
    const bad = await runGraph(mk("set_field", { key: "bad key!", value: "x" }), {});
    expect(bad[1].ok).toBe(false);
  });

  it("dry run logs what WOULD be sent and sends nothing", async () => {
    const graph: WorkflowGraph = {
      workflowKey: "dry-test",
      version: 1,
      nodes: [
        { id: "t", type: "trigger", position: { x: 0, y: 0 }, data: { kind: "lead_created", label: "T" } },
        { id: "w", type: "action", position: { x: 0, y: 0 }, data: { kind: "send_whatsapp", label: "WA", params: { body: "Hi {{name}}" } } },
        { id: "h", type: "action", position: { x: 0, y: 0 }, data: { kind: "http_request", label: "Hook", params: { method: "POST", url: "https://example.com/hook" } } },
      ],
      edges: [{ id: "1", source: "t", target: "w" }, { id: "2", source: "w", target: "h" }],
    };
    const steps = await runGraph(graph, { name: "Asha", phone: "+919876543210" }, { dryRun: true, auto: true });
    expect(steps[1].ok).toBe(true);
    expect(steps[1].detail).toMatch(/^Dry run — would send whatsapp to \+919876543210: “Hi Asha”/);
    expect(steps[2].detail).toMatch(/^Dry run — would POST https:\/\/example\.com\/hook/);
  });
});

describe("send guard (automatic runs)", () => {
  it("blocks the same step messaging the same recipient twice within an hour", () => {
    resetSendGuard();
    expect(checkSendAllowed("wf", "n1", "+91999", 1_000)).toBeNull();
    expect(checkSendAllowed("wf", "n1", "+91999", 2_000)).toMatch(/already messaged/);
    expect(checkSendAllowed("wf", "n1", "+91888", 2_000)).toBeNull(); // different person is fine
    expect(checkSendAllowed("wf", "n1", "+91999", 1_000 + 61 * 60 * 1000)).toBeNull(); // window passed
  });

  it("stops a workflow after 100 sends per hour", () => {
    resetSendGuard();
    for (let i = 0; i < 100; i++) expect(checkSendAllowed("loop", "n", `+91${i}`, 5_000)).toBeNull();
    expect(checkSendAllowed("loop", "n", "+91new", 5_000)).toMatch(/hourly send limit/);
    expect(checkSendAllowed("other", "n", "+91new", 5_000)).toBeNull(); // other workflows unaffected
  });
});
