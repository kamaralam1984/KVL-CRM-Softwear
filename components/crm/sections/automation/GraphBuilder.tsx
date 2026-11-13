"use client";
// Visual workflow builder, n8n-style:
//  • every node has an input (left) and output (right) handle; a "+" on any free
//    output opens the node picker and auto-connects the new node
//  • searchable node picker grouped Trigger / Logic / Messaging / CRM / Developer
//  • per-node parameter form (schema-driven) with {{field}} expressions
//  • Test run saves the canvas, executes it for real and paints ✓ / ✗ on each node
// The graph persists through lib/actions/workflowGraphs.ts and runs through
// lib/automation/graph/interpreter.ts.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Handle, Position, MarkerType,
  addEdge, applyNodeChanges, applyEdgeChanges, useReactFlow,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Zap, GitBranch, Save, FlaskConical, ChevronDown, Plus, Trash2, Copy, Search, X, Check,
  MessageCircle, Mail, Smartphone, CheckSquare, Activity, Globe, Braces, MousePointerClick, TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/crm/ThemeContext";
import { WORKFLOWS as AUTO_WORKFLOWS } from "@/lib/automation/engine";
import {
  TRIGGER_KINDS, ACTION_KINDS, CONDITION_OPS, ACTION_FIELDS, CONTEXT_FIELDS, NODE_CATALOG, LIVE_TRIGGERS, emptyGraph,
  type WorkflowGraph, type GraphNode, type GraphNodeType, type CatalogEntry, type NodeGroup,
  type TriggerNodeData, type ConditionNodeData, type ActionNodeData, type ActionKind, type ParamField,
} from "@/lib/automation/graph/types";
import { getWorkflowGraph, saveWorkflowGraph, testWorkflowGraph } from "@/lib/actions/workflowGraphs";
import { getAccessToken } from "@/lib/security/clientSession";
import { isActive, toggleWorkflowActive, type WorkflowRun } from "@/lib/automation/store";
import { getWorkflows } from "@/lib/actions/workflows";

// ─── node look (icon + accent per kind) ───────────────────────────────────

const GROUP_COLOR: Record<NodeGroup, string> = {
  Trigger: "#3b82f6", Logic: "#8b5cf6", Messaging: "#10b981", CRM: "#D4AF37", Developer: "#f43f5e",
};
const KIND_ICON: Record<string, LucideIcon> = {
  manual: MousePointerClick, if: GitBranch, set_field: Braces,
  send_whatsapp: MessageCircle, send_email: Mail, send_sms: Smartphone,
  create_task: CheckSquare, log_activity: Activity, http_request: Globe,
};
function catalogFor(type: string, kind: string): CatalogEntry | undefined {
  return NODE_CATALOG.find((c) => c.type === type && c.kind === kind);
}
function metaFor(type: string, kind: string) {
  const entry = catalogFor(type, kind);
  return { Icon: KIND_ICON[kind] ?? Zap, color: GROUP_COLOR[entry?.group ?? "Trigger"] };
}
const OP_SYMBOL: Record<string, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", neq: "≠", contains: "contains" };
const condLabel = (field: string, op: string, value: string) => `${field || "field"} ${OP_SYMBOL[op] ?? op} ${value}`;

function summary(type: string, data: Record<string, unknown>): string {
  if (type === "trigger") return "Starts the workflow";
  if (type === "condition") return String(data.label ?? "");
  const params = (data.params ?? {}) as Record<string, string>;
  const first = Object.values(params).find((v) => v && v.trim());
  return first ? first.replace(/\s+/g, " ").slice(0, 38) : "Click to configure";
}

// ─── canvas ↔ node renderers share state through this context ─────────────

interface BuilderCtx {
  onAdd: (sourceId: string, handle?: string) => void;
  used: Set<string>;                              // `${sourceId}:${handle ?? ""}` already wired
  status: Record<string, { ok: boolean; detail?: string }>;
}
const BuilderContext = createContext<BuilderCtx>({ onAdd: () => {}, used: new Set(), status: {} });

function OutputPlus({ nodeId, handle, top, label }: { nodeId: string; handle?: string; top: string; label?: string }) {
  const { onAdd, used } = useContext(BuilderContext);
  const color = handle === "false" ? "#f87171" : handle === "true" ? "#34d399" : "#94a3b8";
  const free = !used.has(`${nodeId}:${handle ?? ""}`);
  return (
    <>
      <Handle
        id={handle}
        type="source"
        position={Position.Right}
        style={{ top, width: 11, height: 11, background: color, border: "2px solid var(--surface, #0d1424)" }}
      />
      {label && (
        <span className="absolute text-[8px] font-bold uppercase" style={{ left: "calc(100% + 12px)", top, transform: "translateY(-50%)", color, display: free ? "none" : "block" }}>
          {label}
        </span>
      )}
      {free && (
        <div className="absolute flex items-center" style={{ left: "100%", top, transform: "translateY(-50%)" }}>
          <span className="block h-px w-5" style={{ background: color }} />
          {label && <span className="absolute -top-3.5 left-1 text-[8px] font-bold uppercase" style={{ color }}>{label}</span>}
          <button
            type="button"
            title="Add next node"
            onClick={(e) => { e.stopPropagation(); onAdd(nodeId, handle); }}
            className="nodrag nopan flex h-5 w-5 items-center justify-center rounded-md border transition-colors hover:bg-[#D4AF37] hover:text-black"
            style={{ borderColor: color, color, background: "var(--surface, #0d1424)" }}
          >
            <Plus size={11} />
          </button>
        </div>
      )}
    </>
  );
}

function FlowNode({ id, type, data, selected }: NodeProps) {
  const { status } = useContext(BuilderContext);
  const d = data as Record<string, unknown>;
  const kind = type === "condition" ? "if" : String(d.kind ?? "");
  const { Icon, color } = metaFor(type, kind);
  const st = status[id];
  return (
    <div className="relative">
      {type !== "trigger" && (
        <Handle type="target" position={Position.Left} style={{ width: 11, height: 11, background: "#94a3b8", border: "2px solid var(--surface, #0d1424)" }} />
      )}
      <div
        className={cn("flex min-w-[190px] max-w-[240px] items-center gap-2.5 rounded-xl border py-2 pl-2 pr-3 shadow-lg transition-shadow", selected && "ring-2 ring-[#D4AF37]")}
        style={{ background: "var(--surface, #0d1424)", borderColor: selected ? "#D4AF37" : `${color}66`, borderLeftWidth: 4, borderLeftColor: color }}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}22`, color }}>
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold" style={{ color: "var(--text-head, #f1f5f9)" }}>{String(d.label ?? "")}</p>
          <p className="truncate text-[9.5px]" style={{ color: "var(--text-sub, #94a3b8)" }}>{summary(type ?? "", d)}</p>
        </div>
      </div>
      {st && (
        <span
          title={st.detail}
          className={cn("absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full text-white", st.ok ? "bg-emerald-500" : "bg-red-500")}
        >
          {st.ok ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
        </span>
      )}
      {type === "condition" ? (
        <>
          <OutputPlus nodeId={id} handle="true" top="30%" label="true" />
          <OutputPlus nodeId={id} handle="false" top="70%" label="false" />
        </>
      ) : (
        <OutputPlus nodeId={id} top="50%" />
      )}
    </div>
  );
}

const NODE_TYPES = { trigger: FlowNode, condition: FlowNode, action: FlowNode };

// ─── graph ↔ React Flow conversion ────────────────────────────────────────

function edgeStyle(handle?: string | null) {
  const color = handle === "false" ? "#f87171" : handle === "true" ? "#34d399" : "#64748b";
  return {
    style: { stroke: color, strokeWidth: 1.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
  };
}
function toFlowNodes(nodes: GraphNode[]): Node[] {
  return nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data as unknown as Record<string, unknown> }));
}
function toFlowEdges(edges: WorkflowGraph["edges"]): Edge[] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, ...edgeStyle(e.sourceHandle) }));
}

let nodeSeq = 1;
const newNodeId = (type: GraphNodeType) => `${type}-${Date.now().toString(36)}-${nodeSeq++}`;

function defaultData(entry: CatalogEntry): Record<string, unknown> {
  if (entry.type === "trigger") return { kind: entry.kind, label: entry.label };
  if (entry.type === "condition") return { field: "score", op: "gt", value: "80", label: condLabel("score", "gt", "80") };
  return { kind: entry.kind, label: entry.label, params: {} };
}

// ─── node picker ("What happens next?") ───────────────────────────────────

function NodePicker({ hasTrigger, onPick, onClose }: { hasTrigger: boolean; onPick: (e: CatalogEntry) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const items = NODE_CATALOG.filter((c) => !(hasTrigger && c.group === "Trigger"))
    .filter((c) => `${c.label} ${c.desc} ${c.group}`.toLowerCase().includes(q.toLowerCase()));
  const groups = Array.from(new Set(items.map((i) => i.group)));
  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-72 flex-col border-l shadow-2xl" style={{ background: "var(--surface, #0d1424)", borderColor: "var(--border-col, #1e2d45)" }}>
      <div className="flex items-center justify-between border-b px-3 py-2.5" style={{ borderColor: "var(--border-col, #1e2d45)" }}>
        <p className="text-xs font-semibold text-slate-100">{hasTrigger ? "What happens next?" : "Add a trigger"}</p>
        <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06]"><X size={13} /></button>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
          <Search size={12} className="text-slate-500" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nodes…"
            className="w-full bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
          />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        {groups.length === 0 && <p className="py-6 text-center text-[11px] text-slate-500">No node matches “{q}”.</p>}
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">{g}</p>
            <div className="space-y-1">
              {items.filter((i) => i.group === g).map((i) => {
                const { Icon, color } = metaFor(i.type, i.kind);
                return (
                  <button
                    key={`${i.type}-${i.kind}`} onClick={() => onPick(i)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-white/10 hover:bg-white/[0.05]"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}22`, color }}><Icon size={15} /></span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium text-slate-100">{i.label}</span>
                      <span className="block truncate text-[9.5px] text-slate-500">{i.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── builder ──────────────────────────────────────────────────────────────

const inputCls = "w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none focus:border-[#D4AF37]/60";
const SAMPLE_FIELDS = ["name", "company", "email", "phone", "score"] as const;

function Builder() {
  const { darkMode } = useTheme();
  const { fitView } = useReactFlow();
  const [workflowKey, setWorkflowKey] = useState(AUTO_WORKFLOWS[0]?.id ?? "lead-nurture");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dirty, setDirty] = useState(false);
  const [testResult, setTestResult] = useState<WorkflowRun | null>(null);
  const [testing, setTesting] = useState(false);
  const [pickerFor, setPickerFor] = useState<{ sourceId?: string; handle?: string } | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [sample, setSample] = useState<Record<string, string>>({ name: "Test Lead", company: "Sample Co", email: "", phone: "", score: "85" });
  const [wfActive, setWfActive] = useState<Record<string, boolean>>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== workflowKey;
  const focusRef = useRef<{ key: string; el: HTMLInputElement | HTMLTextAreaElement } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apply = (g: WorkflowGraph) => {
      if (cancelled) return;
      setNodes(toFlowNodes(g.nodes));
      setEdges(toFlowEdges(g.edges));
      setTestResult(null); setSelectedId(null); setPickerFor(null); setDirty(false);
      setLoadedKey(workflowKey);
    };
    getWorkflowGraph(workflowKey, getAccessToken()).then(apply).catch(() => apply(emptyGraph(workflowKey)));
    return () => { cancelled = true; };
  }, [workflowKey]);

  // Database is the source of truth for on/off (falls back to this browser's cache in demo mode).
  useEffect(() => {
    let cancelled = false;
    getWorkflows(getAccessToken()).then((rows) => {
      if (cancelled || !rows.length) return;
      setWfActive(Object.fromEntries(rows.map((w) => [w.key, w.active])));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const isOn = wfActive[workflowKey] ?? isActive(workflowKey);
  const toggleOn = async () => {
    const next = !isOn;
    setWfActive((m) => ({ ...m, [workflowKey]: next }));
    const ok = await toggleWorkflowActive(workflowKey, next, getAccessToken());
    if (!ok) { setWfActive((m) => ({ ...m, [workflowKey]: !next })); alert("Your role isn't allowed to switch workflows on or off."); }
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    if (changes.some((c) => c.type === "position" || c.type === "remove" || c.type === "add")) setDirty(true);
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    if (changes.some((c) => c.type === "remove" || c.type === "add")) setDirty(true);
  }, []);
  // The interpreter follows one path per output, so a handle keeps a single edge.
  const onConnect = useCallback((conn: Connection) => {
    setEdges((eds) => addEdge(
      { ...conn, ...edgeStyle(conn.sourceHandle) },
      eds.filter((e) => !(e.source === conn.source && (e.sourceHandle ?? null) === (conn.sourceHandle ?? null))),
    ));
    setDirty(true);
  }, []);
  const isValidConnection = useCallback((c: Connection | Edge) => {
    if (c.source === c.target) return false;
    return nodes.find((n) => n.id === c.target)?.type !== "trigger";
  }, [nodes]);

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
  const hasTrigger = nodes.some((n) => n.type === "trigger");
  // Is this canvas wired to fire by itself? (live event + something connected after the trigger)
  const liveInfo = useMemo(() => {
    const trig = nodes.find((n) => n.type === "trigger");
    if (!trig) return { live: false, text: "No trigger — add one" };
    const td = trig.data as unknown as TriggerNodeData;
    const connected = edges.some((e) => e.source === trig.id);
    if (td.kind === "manual") return { live: false, text: "Manual — runs on Test run only" };
    if (!LIVE_TRIGGERS.includes(td.kind)) return { live: false, text: `“${td.label}” isn't auto-fired — Test run only` };
    if (!connected) return { live: false, text: "Connect a node after the trigger to go live" };
    if (!isOn) return { live: false, text: "Paused — switch the workflow on to run automatically" };
    return td.sendMode === "live"
      ? { live: true, text: `Live: runs on “${td.label}” and SENDS for real` }
      : { live: true, text: `Live: runs on “${td.label}” in safe mode (logs only, sends nothing)` };
  }, [nodes, edges, isOn]);
  const used = useMemo(() => new Set(edges.map((e) => `${e.source}:${e.sourceHandle ?? ""}`)), [edges]);
  const status = useMemo(() => {
    const m: Record<string, { ok: boolean; detail?: string }> = {};
    testResult?.steps.forEach((s) => { if (s.nodeId) m[s.nodeId] = { ok: s.ok, detail: s.detail }; });
    return m;
  }, [testResult]);
  const customFields = useMemo(() => {
    const keys: string[] = [];
    nodes.forEach((n) => {
      const d = n.data as unknown as ActionNodeData;
      if (n.type === "action" && d.kind === "set_field" && d.params?.key && /^\w+$/.test(d.params.key)) keys.push(d.params.key);
    });
    return keys;
  }, [nodes]);
  const allFields = useMemo(() => Array.from(new Set([...CONTEXT_FIELDS, ...customFields, "http_status", "http_body"])), [customFields]);

  const patchNode = (id: string, patch: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    setDirty(true);
  };
  const patchParam = (id: string, key: string, value: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== id) return n;
      const d = n.data as unknown as ActionNodeData;
      return { ...n, data: { ...n.data, params: { ...(d.params ?? {}), [key]: value } } };
    }));
    setDirty(true);
  };

  // Add a catalog node; wire it to `source` (or the selected node's first free output).
  const addFromCatalog = (entry: CatalogEntry) => {
    const id = newNodeId(entry.type);
    let source = pickerFor?.sourceId;
    let handle = pickerFor?.handle;
    if (!source && selectedId && entry.type !== "trigger") {
      const sel = nodes.find((n) => n.id === selectedId);
      if (sel) {
        const outs: (string | undefined)[] = sel.type === "condition" ? ["true", "false"] : [undefined];
        const idx = outs.findIndex((h) => !used.has(`${sel.id}:${h ?? ""}`));
        if (idx >= 0) { source = sel.id; handle = outs[idx]; }
      }
    }
    const src = nodes.find((n) => n.id === source);
    const position = src
      ? { x: src.position.x + 290, y: src.position.y + (handle === "true" ? -70 : handle === "false" ? 70 : 0) }
      : { x: nodes.length ? Math.max(...nodes.map((n) => n.position.x)) + 290 : 80, y: 160 };
    setNodes((nds) => [...nds, { id, type: entry.type, position, data: defaultData(entry) }]);
    if (src && source) {
      setEdges((eds) => addEdge({ id: `e-${source}-${id}`, source, target: id, sourceHandle: handle, ...edgeStyle(handle) }, eds));
    }
    setSelectedId(id);
    setPickerFor(null);
    setDirty(true);
    setTimeout(() => fitView({ duration: 300, padding: 0.35, maxZoom: 1 }), 60);
  };

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
    setDirty(true);
  };
  const duplicateNode = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    if (!n || n.type === "trigger") return;
    const nid = newNodeId(n.type as GraphNodeType);
    setNodes((nds) => [...nds, { ...n, id: nid, selected: false, position: { x: n.position.x + 40, y: n.position.y + 70 }, data: structuredClone(n.data) }]);
    setSelectedId(nid);
    setDirty(true);
  };

  const buildGraph = (): WorkflowGraph => ({
    workflowKey,
    version: 1,
    nodes: nodes.map((n) => ({ id: n.id, type: n.type as GraphNodeType, position: n.position, data: n.data as unknown as GraphNode["data"] })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined })),
  });

  const save = async (confirmLive = true): Promise<boolean> => {
    // Saving a canvas that sends for real arms it immediately — make that explicit.
    const trig = nodes.find((n) => n.type === "trigger");
    const td = trig?.data as unknown as TriggerNodeData | undefined;
    if (confirmLive && td?.sendMode === "live" && LIVE_TRIGGERS.includes(td.kind) && isOn && trig && edges.some((e) => e.source === trig.id)) {
      const outbound = nodes.filter((n) => n.type === "action" && ["send_whatsapp", "send_sms", "send_email", "http_request"].includes((n.data as unknown as ActionNodeData).kind));
      if (outbound.length && !window.confirm(
        `This workflow is LIVE: every time “${td.label}” happens it will automatically run ${outbound.length} sending step${outbound.length > 1 ? "s" : ""} ` +
        `(${outbound.map((n) => String((n.data as unknown as ActionNodeData).label)).join(", ")}) for real, to real leads.\n\nSave and keep it live?`,
      )) return false;
    }
    setSaving("saving");
    const res = await saveWorkflowGraph(buildGraph(), getAccessToken());
    setSaving(res.ok ? "saved" : "error");
    if (res.ok) { setDirty(false); setTimeout(() => setSaving("idle"), 1800); }
    return res.ok;
  };

  const testRun = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (!(await save(false))) return;
      const data: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(sample)) if (v.trim()) data[k] = k === "score" && !isNaN(Number(v)) ? Number(v) : v.trim();
      setTestResult(await testWorkflowGraph(workflowKey, sample.company?.trim() || "Sample Co", getAccessToken(), data));
    } finally {
      setTesting(false);
    }
  };

  const insertField = (field: string) => {
    const f = focusRef.current;
    if (!f || !selectedId) return;
    const el = f.el;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = `${el.value.slice(0, start)}{{${field}}}${el.value.slice(end)}`;
    if (selected?.type === "condition") patchNode(selectedId, { value: next, label: condLabel((selected.data as unknown as ConditionNodeData).field, (selected.data as unknown as ConditionNodeData).op, next) });
    else patchParam(selectedId, f.key, next);
  };

  const ctxValue = useMemo<BuilderCtx>(() => ({
    onAdd: (sourceId, handle) => { setSelectedId(sourceId); setPickerFor({ sourceId, handle }); },
    used, status,
  }), [used, status]);

  // ── properties panel ──
  const renderParam = (f: ParamField, d: ActionNodeData) => {
    const val = d.params?.[f.key] ?? f.default ?? "";
    const common = {
      value: val,
      onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { focusRef.current = { key: f.key, el: e.currentTarget }; },
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => patchParam(selectedId!, f.key, e.target.value),
      placeholder: f.placeholder,
      className: inputCls,
    };
    return (
      <div key={f.key}>
        <label className="mb-1 block text-[10px] text-slate-500">{f.label}</label>
        {f.type === "select" ? (
          <select value={val} onChange={common.onChange} className={inputCls}>
            {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : f.type === "textarea" ? (
          <textarea rows={4} {...common} className={cn(inputCls, "resize-y leading-relaxed")} />
        ) : (
          <input {...common} />
        )}
        {f.hint && <p className="mt-0.5 text-[9px] text-slate-600">{f.hint}</p>}
      </div>
    );
  };

  const chips = (
    <div>
      <p className="mb-1 text-[9px] text-slate-500">Click a field to insert it where your cursor is:</p>
      <div className="flex flex-wrap gap-1">
        {allFields.map((f) => (
          <button
            key={f} type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertField(f)}
            className="rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#D4AF37] hover:bg-[#D4AF37]/20"
          >{`{{${f}}}`}</button>
        ))}
      </div>
    </div>
  );

  const selType = selected?.type ?? "";
  const selData = (selected?.data ?? {}) as Record<string, unknown>;
  const selKind = selType === "condition" ? "if" : String(selData.kind ?? "");
  const selMeta = selected ? metaFor(selType, selKind) : null;
  const selStatus = selectedId ? status[selectedId] : undefined;
  const saveLabel = saving === "saving" ? "Saving…" : saving === "saved" ? "Saved!" : saving === "error" ? "Save failed" : "Save";

  return (
    <BuilderContext.Provider value={ctxValue}>
      <div className="flex h-full flex-col">
        {/* header */}
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={workflowKey}
                onChange={(e) => setWorkflowKey(e.target.value)}
                className="appearance-none rounded-lg border border-white/10 bg-white/[0.05] py-1.5 pl-3 pr-7 text-xs text-slate-200 outline-none"
              >
                {AUTO_WORKFLOWS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <span title="Switch the workflow on/off in the My Workflows tab" className={cn("hidden items-center gap-1 text-[10px] sm:flex", liveInfo.live ? "text-emerald-400" : "text-slate-500")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", liveInfo.live ? "bg-emerald-400" : "bg-slate-500")} /> {liveInfo.text}
            </span>
            <button
              type="button" onClick={() => void toggleOn()} role="switch" aria-checked={isOn}
              title="Switch this workflow on/off (same switch as in the Executions tab)"
              className={cn("flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] transition-colors", isOn ? "border-emerald-500/40 text-emerald-400" : "border-white/10 text-slate-500")}
            >
              <span className={cn("relative h-3 w-6 rounded-full transition-colors", isOn ? "bg-emerald-500/60" : "bg-slate-600")}>
                <span className={cn("absolute top-0.5 h-2 w-2 rounded-full bg-white transition-all", isOn ? "left-3.5" : "left-0.5")} />
              </span>
              {isOn ? "Active" : "Paused"}
            </button>
            {dirty && <span className="flex items-center gap-1 text-[10px] text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Unsaved</span>}
          </div>
          <div className="relative flex items-center gap-1.5">
            <button onClick={() => setShowSample((v) => !v)} className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-[10px] text-slate-300 transition-colors hover:bg-white/[0.09]">
              Test data
            </button>
            <button
              onClick={testRun} disabled={testing}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-[10px] text-slate-300 transition-colors hover:bg-white/[0.09] disabled:opacity-40"
            >
              <FlaskConical size={11} /> {testing ? "Running…" : "Test run"}
            </button>
            <button
              onClick={() => void save(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-black transition-all"
              style={{ background: "linear-gradient(135deg,#c9a84c,#e8c96d)" }}
            >
              <Save size={11} /> {saveLabel}
            </button>
            {showSample && (
              <div className="absolute right-0 top-full z-30 mt-2 w-64 space-y-2 rounded-xl border p-3 shadow-2xl" style={{ background: "var(--surface, #0d1424)", borderColor: "var(--border-col, #1e2d45)" }}>
                <p className="text-[10px] font-semibold text-slate-200">Sample record for Test run</p>
                {SAMPLE_FIELDS.map((k) => (
                  <div key={k}>
                    <label className="mb-0.5 block text-[9px] capitalize text-slate-500">{k}</label>
                    <input value={sample[k] ?? ""} onChange={(e) => setSample((s) => ({ ...s, [k]: e.target.value }))} className={inputCls} />
                  </div>
                ))}
                <p className="flex gap-1 text-[9px] leading-snug text-amber-500/90">
                  <TriangleAlert size={11} className="mt-px flex-shrink-0" />
                  Send nodes really send. Leave phone / email empty to test without messaging anyone.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="relative flex flex-1 overflow-hidden">
          {/* canvas */}
          <div className="relative flex-1">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">Loading graph…</div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onNodeClick={(_, n) => { setSelectedId(n.id); setPickerFor(null); }}
                onPaneClick={() => { setSelectedId(null); setPickerFor(null); }}
                nodeTypes={NODE_TYPES}
                colorMode={darkMode ? "dark" : "light"}
                deleteKeyCode={["Backspace", "Delete"]}
                fitView
                fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={20} color={darkMode ? "#ffffff14" : "#00000018"} />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable maskColor="rgba(0,0,0,0.45)" />
              </ReactFlow>
            )}
            {!loading && (
              <button
                onClick={() => { setPickerFor({}); }}
                className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-black shadow-lg"
                style={{ background: "linear-gradient(135deg,#c9a84c,#e8c96d)" }}
              >
                <Plus size={13} /> Add node
              </button>
            )}
            {!loading && nodes.length <= 1 && (
              <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-3 py-1.5 text-[10px] text-slate-300">
                Click the + next to a node to add the next step.
              </p>
            )}
          </div>

          {/* properties */}
          <div className="w-72 flex-shrink-0 overflow-y-auto border-l border-white/[0.06]">
            <div className="border-b border-white/[0.06] p-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Properties</p></div>
            {!selected || !selMeta ? (
              <div className="space-y-2 p-4 text-[10px] leading-relaxed text-slate-500">
                <p>Click a node to configure it.</p>
                <p>Use <b className="text-slate-300">{"{{field}}"}</b> in any text box to insert the lead&apos;s data, e.g. <span className="font-mono text-[#D4AF37]">{"Hi {{name}}"}</span>.</p>
                <p>Drag from a node&apos;s right dot to another node to connect. An <b className="text-slate-300">IF</b> node has TRUE and FALSE outputs.</p>
              </div>
            ) : (
              <div className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${selMeta.color}22`, color: selMeta.color }}><selMeta.Icon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={String(selData.label ?? "")}
                      onChange={(e) => patchNode(selected.id, { label: e.target.value })}
                      className="w-full bg-transparent text-xs font-semibold text-slate-100 outline-none focus:border-b focus:border-[#D4AF37]/60"
                      aria-label="Node name"
                    />
                    <p className="text-[9px] capitalize text-slate-500">{selType}</p>
                  </div>
                </div>

                {selType === "trigger" && (
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-500">Event</label>
                    <select
                      value={(selected.data as unknown as TriggerNodeData).kind}
                      onChange={(e) => { const t = TRIGGER_KINDS.find((t) => t.kind === e.target.value)!; patchNode(selected.id, { kind: t.kind, label: t.label }); }}
                      className={inputCls}
                    >
                      {TRIGGER_KINDS.map((t) => <option key={t.kind} value={t.kind}>{t.label}</option>)}
                    </select>
                    <p className="mt-1 text-[9px] leading-snug text-slate-600">
                      {(selected.data as unknown as TriggerNodeData).kind === "manual"
                        ? "Runs only when you press Test run."
                        : LIVE_TRIGGERS.includes((selected.data as unknown as TriggerNodeData).kind)
                          ? "Fires automatically when this happens in the CRM (while the workflow is Active). A canvas saved for this workflow replaces its built-in steps."
                          : "Not fired automatically — use Test run."}
                    </p>
                    {LIVE_TRIGGERS.includes((selected.data as unknown as TriggerNodeData).kind) && (
                      <div className="mt-3">
                        <label className="mb-1 block text-[10px] text-slate-500">Automatic runs</label>
                        <select
                          value={(selected.data as unknown as TriggerNodeData).sendMode === "live" ? "live" : "dry"}
                          onChange={(e) => patchNode(selected.id, { sendMode: e.target.value })}
                          className={inputCls}
                        >
                          <option value="dry">Safe mode — log what would be sent</option>
                          <option value="live">Live — send messages for real</option>
                        </select>
                        <p className="mt-1 text-[9px] leading-snug text-slate-600">
                          Safe mode still creates tasks and notes, but WhatsApp / SMS / Email / HTTP steps are only written to the Executions log as “would send…”. Check a few runs there, then switch to Live. Live also never messages the same person twice in an hour from one step, and stops after 100 messages/hour.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selType === "condition" && (() => {
                  const c = selected.data as unknown as ConditionNodeData;
                  const set = (patch: Partial<ConditionNodeData>) => {
                    const n = { ...c, ...patch };
                    patchNode(selected.id, { ...patch, label: condLabel(n.field, n.op, n.value) });
                  };
                  return (
                    <>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">Field</label>
                        <input list="gb-fields" value={c.field} onChange={(e) => set({ field: e.target.value })} placeholder="e.g. score" className={inputCls} />
                        <datalist id="gb-fields">{allFields.map((f) => <option key={f} value={f} />)}</datalist>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">Operator</label>
                        <select value={c.op} onChange={(e) => set({ op: e.target.value as ConditionNodeData["op"] })} className={inputCls}>
                          {CONDITION_OPS.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">Value</label>
                        <input
                          value={c.value}
                          onFocus={(e) => { focusRef.current = { key: "value", el: e.currentTarget }; }}
                          onChange={(e) => set({ value: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      {chips}
                      <p className="text-[9px] text-slate-600">Connect the green TRUE and red FALSE outputs to different next steps.</p>
                    </>
                  );
                })()}

                {selType === "action" && (() => {
                  const a = selected.data as unknown as ActionNodeData;
                  return (
                    <>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">Action</label>
                        <select
                          value={a.kind}
                          onChange={(e) => { const k = ACTION_KINDS.find((k) => k.kind === e.target.value)!; patchNode(selected.id, { kind: k.kind, label: k.label, params: {} }); }}
                          className={inputCls}
                        >
                          {ACTION_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
                        </select>
                      </div>
                      {ACTION_FIELDS[a.kind as ActionKind]?.map((f) => renderParam(f, a))}
                      {chips}
                    </>
                  );
                })()}

                {selStatus && (
                  <div className={cn("rounded-lg border p-2 text-[10px]", selStatus.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400")}>
                    <p className="font-semibold">{selStatus.ok ? "Last run: success" : "Last run: failed"}</p>
                    {selStatus.detail && <p className="mt-0.5 opacity-90">{selStatus.detail}</p>}
                  </div>
                )}

                <div className="flex gap-1.5 border-t border-white/[0.06] pt-3">
                  {selType !== "trigger" && (
                    <button onClick={() => duplicateNode(selected.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-[10px] text-slate-300 hover:bg-white/[0.06]">
                      <Copy size={11} /> Duplicate
                    </button>
                  )}
                  <button onClick={() => deleteNode(selected.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 py-1.5 text-[10px] text-red-400 hover:bg-red-500/10">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {pickerFor && <NodePicker hasTrigger={hasTrigger} onPick={addFromCatalog} onClose={() => setPickerFor(null)} />}
        </div>

        {/* test result strip */}
        {testResult && (
          <div className="max-h-32 flex-shrink-0 overflow-y-auto border-t border-white/[0.06] px-4 py-2.5" style={{ background: "var(--surface, #0a0f1a)" }}>
            <div className="mb-1 flex items-center justify-between">
              <span className={cn("text-[10px] font-semibold", testResult.ok ? "text-emerald-400" : "text-red-400")}>
                {testResult.ok ? "Test run succeeded" : "Test run had failures"} · {testResult.steps.length} step{testResult.steps.length === 1 ? "" : "s"}
              </span>
              <button onClick={() => setTestResult(null)} className="text-slate-500 hover:text-slate-300"><X size={12} /></button>
            </div>
            <ol className="space-y-0.5">
              {testResult.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[10px]">
                  <span className={cn("mt-px flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full text-white", s.ok ? "bg-emerald-500" : "bg-red-500")}>
                    {s.ok ? <Check size={8} strokeWidth={3} /> : <X size={8} strokeWidth={3} />}
                  </span>
                  <span className="text-slate-300">{s.label}</span>
                  {s.detail && <span className="text-slate-500">— {s.detail}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </BuilderContext.Provider>
  );
}

export default function GraphBuilder() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}
