"use client";
// Phase 20 — Visual Drag-Drop Workflow Builder.
// Real, persisted trigger→condition→action canvas (replaces the previous
// fully-mock BuilderView, which rendered one hardcoded fixed workflow with no
// save/test backing anything real). Nodes are draggable/connectable via
// @xyflow/react; the graph saves to Supabase (lib/actions/workflowGraphs.ts)
// and "Test run" executes it for real through lib/automation/graph/interpreter.ts.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, addEdge, applyNodeChanges, applyEdgeChanges,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Zap, GitBranch, PlayCircle, Save, FlaskConical, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOWS as AUTO_WORKFLOWS } from "@/lib/automation/engine";
import {
  TRIGGER_KINDS, ACTION_KINDS, CONDITION_OPS, emptyGraph,
  type WorkflowGraph, type GraphNode, type GraphNodeType,
  type TriggerNodeData, type ConditionNodeData, type ActionNodeData,
} from "@/lib/automation/graph/types";
import { getWorkflowGraph, saveWorkflowGraph, testWorkflowGraph } from "@/lib/actions/workflowGraphs";
import { getAccessToken } from "@/lib/security/clientSession";
import type { WorkflowRun } from "@/lib/automation/store";

// ─── Custom node renderers ────────────────────────────────────────────────

function TriggerNode({ data, selected }: NodeProps) {
  const d = data as unknown as TriggerNodeData;
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2 min-w-[160px] bg-blue-500/15 border-blue-500/50",
      selected && "ring-2 ring-[#c9a84c]",
    )}>
      <div className="flex items-center gap-1.5 text-blue-400"><Zap size={12} /><span className="text-[9px] font-bold uppercase tracking-wide">Trigger</span></div>
      <p className="text-[11px] text-slate-100 mt-1 font-medium">{d.label}</p>
    </div>
  );
}

function ConditionNode({ data, selected }: NodeProps) {
  const d = data as unknown as ConditionNodeData;
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2 min-w-[170px] bg-violet-500/15 border-violet-500/50",
      selected && "ring-2 ring-[#c9a84c]",
    )}>
      <div className="flex items-center gap-1.5 text-violet-400"><GitBranch size={12} /><span className="text-[9px] font-bold uppercase tracking-wide">Condition</span></div>
      <p className="text-[11px] text-slate-100 mt-1 font-medium">{d.label}</p>
    </div>
  );
}

function ActionNode({ data, selected }: NodeProps) {
  const d = data as unknown as ActionNodeData;
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2 min-w-[160px] bg-amber-500/15 border-amber-500/50",
      selected && "ring-2 ring-[#c9a84c]",
    )}>
      <div className="flex items-center gap-1.5 text-amber-400"><PlayCircle size={12} /><span className="text-[9px] font-bold uppercase tracking-wide">Action</span></div>
      <p className="text-[11px] text-slate-100 mt-1 font-medium">{d.label}</p>
    </div>
  );
}

const NODE_TYPES = { trigger: TriggerNode, condition: ConditionNode, action: ActionNode };

// ─── Graph <-> React Flow node/edge conversion (types already match 1:1) ──

function toFlowNodes(nodes: GraphNode[]): Node[] {
  return nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data as unknown as Record<string, unknown> }));
}
function toFlowEdges(edges: WorkflowGraph["edges"]): Edge[] {
  return edges.map((e) => ({
    id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle,
    label: e.sourceHandle === "true" ? "TRUE" : e.sourceHandle === "false" ? "FALSE" : undefined,
    style: { stroke: e.sourceHandle === "false" ? "#f87171" : e.sourceHandle === "true" ? "#34d399" : "#64748b" },
  }));
}

let nodeSeq = 1;
function newNodeId(type: GraphNodeType) { return `${type}-${Date.now().toString(36)}-${nodeSeq++}`; }

export default function GraphBuilder() {
  const [workflowKey, setWorkflowKey] = useState(AUTO_WORKFLOWS[0]?.id ?? "lead-nurture");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [testResult, setTestResult] = useState<WorkflowRun | null>(null);
  const [testing, setTesting] = useState(false);
  // Derived, not a synchronous setState-in-effect: loading is simply "the
  // graph currently on screen isn't the one for the selected workflow yet".
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== workflowKey;

  useEffect(() => {
    let cancelled = false;
    getWorkflowGraph(workflowKey, getAccessToken()).then((graph) => {
      if (cancelled) return;
      setNodes(toFlowNodes(graph.nodes));
      setEdges(toFlowEdges(graph.edges));
      setTestResult(null);
      setLoadedKey(workflowKey);
    }).catch(() => {
      if (cancelled) return;
      const g = emptyGraph(workflowKey);
      setNodes(toFlowNodes(g.nodes));
      setEdges([]);
      setTestResult(null);
      setLoadedKey(workflowKey);
    });
    return () => { cancelled = true; };
  }, [workflowKey]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((conn: Connection) => setEdges((eds) => addEdge({
    ...conn,
    label: conn.sourceHandle === "true" ? "TRUE" : conn.sourceHandle === "false" ? "FALSE" : undefined,
    style: { stroke: conn.sourceHandle === "false" ? "#f87171" : conn.sourceHandle === "true" ? "#34d399" : "#64748b" },
  }, eds)), []);

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);

  const addNode = (type: GraphNodeType) => {
    const id = newNodeId(type);
    const position = { x: 80 + nodes.length * 40, y: 80 + (nodes.length % 4) * 90 };
    const data: Record<string, unknown> =
      type === "trigger" ? { kind: TRIGGER_KINDS[0].kind, label: TRIGGER_KINDS[0].label } :
      type === "condition" ? { field: "score", op: "gt", value: "80", label: "Lead score > 80" } :
      { kind: ACTION_KINDS[0].kind, label: ACTION_KINDS[0].label, params: {} };
    setNodes((nds) => [...nds, { id, type, position, data }]);
    setSelectedId(id);
  };

  const updateSelected = (patch: Record<string, unknown>) => {
    if (!selectedId) return;
    setNodes((nds) => nds.map((n) => n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n));
  };

  const save = async () => {
    setSaving("saving");
    const graph: WorkflowGraph = {
      workflowKey,
      version: 1,
      nodes: nodes.map((n) => ({ id: n.id, type: n.type as GraphNodeType, position: n.position, data: n.data as unknown as GraphNode["data"] })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined })),
    };
    const res = await saveWorkflowGraph(graph, getAccessToken());
    setSaving(res.ok ? "saved" : "idle");
    if (res.ok) setTimeout(() => setSaving("idle"), 1800);
  };

  const testRun = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const run = await testWorkflowGraph(workflowKey, "Sample Co", getAccessToken());
      setTestResult(run);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="relative">
          <select
            value={workflowKey}
            onChange={(e) => setWorkflowKey(e.target.value)}
            className="appearance-none bg-white/[0.05] border border-white/10 rounded-lg pl-3 pr-7 py-1.5 text-xs text-slate-200 outline-none"
          >
            {AUTO_WORKFLOWS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={testRun}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[10px] text-slate-300 hover:bg-white/[0.09] transition-colors disabled:opacity-40"
          >
            <FlaskConical size={11} /> {testing ? "Running…" : "Test run"}
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-black transition-all"
            style={{ background: "linear-gradient(135deg,#c9a84c,#e8c96d)" }}
          >
            <Save size={11} /> {saving === "saving" ? "Saving…" : saving === "saved" ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* palette */}
        <div className="w-36 border-r border-white/[0.06] flex-shrink-0 p-3 space-y-1.5 overflow-y-auto">
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Add Node</p>
          <button onClick={() => addNode("trigger")} className="w-full flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/[0.05] text-[10px] text-blue-400"><Zap size={11} /> Trigger</button>
          <button onClick={() => addNode("condition")} className="w-full flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/[0.05] text-[10px] text-violet-400"><GitBranch size={11} /> Condition</button>
          <button onClick={() => addNode("action")} className="w-full flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/[0.05] text-[10px] text-amber-400"><PlayCircle size={11} /> Action</button>
          <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">Drag nodes to arrange, drag from a node&apos;s edge to connect. Condition nodes have TRUE/FALSE outputs.</p>
        </div>

        {/* canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Loading graph…</div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={NODE_TYPES}
              colorMode="dark"
              fitView
            >
              <Background gap={20} color="#ffffff14" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable style={{ background: "#0d1420" }} maskColor="rgba(0,0,0,0.6)" />
            </ReactFlow>
          )}
        </div>

        {/* properties */}
        <div className="w-56 border-l border-white/[0.06] flex-shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-white/[0.06]"><p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Properties</p></div>
          {!selected ? (
            <div className="p-4 text-[10px] text-slate-500">Click a node to configure it.</div>
          ) : selected.type === "trigger" ? (
            <div className="p-3 space-y-2">
              <label className="text-[10px] text-slate-500 block">Event</label>
              <select
                value={(selected.data as unknown as TriggerNodeData).kind}
                onChange={(e) => {
                  const t = TRIGGER_KINDS.find((t) => t.kind === e.target.value)!;
                  updateSelected({ kind: t.kind, label: t.label });
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none"
              >
                {TRIGGER_KINDS.map((t) => <option key={t.kind} value={t.kind}>{t.label}</option>)}
              </select>
            </div>
          ) : selected.type === "condition" ? (
            <div className="p-3 space-y-2">
              <label className="text-[10px] text-slate-500 block">Field</label>
              <input
                value={(selected.data as unknown as ConditionNodeData).field}
                onChange={(e) => updateSelected({ field: e.target.value, label: `${e.target.value} ${(selected.data as unknown as ConditionNodeData).op} ${(selected.data as unknown as ConditionNodeData).value}` })}
                placeholder="e.g. score"
                className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none"
              />
              <label className="text-[10px] text-slate-500 block">Operator</label>
              <select
                value={(selected.data as unknown as ConditionNodeData).op}
                onChange={(e) => {
                  const d = selected.data as unknown as ConditionNodeData;
                  updateSelected({ op: e.target.value, label: `${d.field} ${e.target.value} ${d.value}` });
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none"
              >
                {CONDITION_OPS.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
              </select>
              <label className="text-[10px] text-slate-500 block">Value</label>
              <input
                value={(selected.data as unknown as ConditionNodeData).value}
                onChange={(e) => {
                  const d = selected.data as unknown as ConditionNodeData;
                  updateSelected({ value: e.target.value, label: `${d.field} ${d.op} ${e.target.value}` });
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none"
              />
              <p className="text-[9px] text-slate-600">Connect the TRUE/FALSE handles below the node to different next steps.</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <label className="text-[10px] text-slate-500 block">Action</label>
              <select
                value={(selected.data as unknown as ActionNodeData).kind}
                onChange={(e) => {
                  const a = ACTION_KINDS.find((a) => a.kind === e.target.value)!;
                  updateSelected({ kind: a.kind, label: a.label });
                }}
                className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none"
              >
                {ACTION_KINDS.map((a) => <option key={a.kind} value={a.kind}>{a.label}</option>)}
              </select>
              {(["send_whatsapp", "send_email", "send_sms"] as string[]).includes((selected.data as unknown as ActionNodeData).kind) && (
                <p className="text-[9px] text-amber-500/80">Sending isn&apos;t wired to a real channel yet — ships in Phase 21. Runs will log as not-sent.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* test result strip */}
      {testResult && (
        <div className="border-t border-white/[0.06] px-4 py-2.5 flex-shrink-0 flex flex-wrap gap-1.5 items-center bg-[#0a0f1a]">
          <span className="text-[9px] text-slate-500 mr-1">Test result:</span>
          {testResult.steps.map((s, i) => (
            <span key={i} className={cn(
              "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md border",
              s.ok ? "bg-emerald-500/10 text-emerald-400/90 border-emerald-500/15" : "bg-red-500/10 text-red-400/90 border-red-500/15",
            )}>
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
