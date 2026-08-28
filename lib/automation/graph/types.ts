// Phase 20 — Visual Drag-Drop Workflow Builder.
// A persisted trigger→condition→action graph, shaped 1:1 to @xyflow/react's
// own node/edge model so the canvas can read/write these types directly with
// no translation layer. This sits ALONGSIDE lib/automation/engine.ts's 5
// hardcoded trigger functions — it doesn't replace them; new workflows authored
// visually run through lib/automation/graph/interpreter.ts instead.

export type TriggerKind =
  | "lead_created"
  | "high_intent_visitor"
  | "lead_score_spike"
  | "deal_won"
  | "customer_health_drop";

export type ConditionOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";

export type ActionKind =
  | "create_task"
  | "log_activity"
  | "send_whatsapp"
  | "send_email"
  | "send_sms";

export const TRIGGER_KINDS: { kind: TriggerKind; label: string }[] = [
  { kind: "lead_created", label: "New Lead Created" },
  { kind: "high_intent_visitor", label: "High-Intent Visitor" },
  { kind: "lead_score_spike", label: "Lead Score Spike" },
  { kind: "deal_won", label: "Deal Won" },
  { kind: "customer_health_drop", label: "Customer Health Drop" },
];

export const ACTION_KINDS: { kind: ActionKind; label: string }[] = [
  { kind: "create_task", label: "Create Task" },
  { kind: "log_activity", label: "Log Activity" },
  { kind: "send_whatsapp", label: "Send WhatsApp" },
  { kind: "send_email", label: "Send Email" },
  { kind: "send_sms", label: "Send SMS" },
];

export const CONDITION_OPS: { op: ConditionOp; label: string }[] = [
  { op: "gt", label: "greater than" },
  { op: "gte", label: "greater or equal" },
  { op: "lt", label: "less than" },
  { op: "lte", label: "less or equal" },
  { op: "eq", label: "equals" },
  { op: "neq", label: "not equals" },
  { op: "contains", label: "contains" },
];

export interface TriggerNodeData {
  kind: TriggerKind;
  label: string;
}

export interface ConditionNodeData {
  field: string;
  op: ConditionOp;
  value: string;
  label: string;
}

export interface ActionNodeData {
  kind: ActionKind;
  label: string;
  params: Record<string, string>;
}

export type GraphNodeType = "trigger" | "condition" | "action";

export type GraphNodeData = TriggerNodeData | ConditionNodeData | ActionNodeData;

// Mirrors @xyflow/react's Node<T> shape closely enough to pass through
// directly — `type` selects trigger/condition/action, `data` carries the
// kind-specific fields above.
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  position: { x: number; y: number };
  data: GraphNodeData;
}

// Mirrors @xyflow/react's Edge shape. sourceHandle is "true"/"false" when the
// source is a condition node (branching); undefined otherwise.
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface WorkflowGraph {
  workflowKey: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  version: number;
}

export function emptyGraph(workflowKey: string): WorkflowGraph {
  return {
    workflowKey,
    version: 1,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 60, y: 160 },
        data: { kind: "lead_created", label: "New Lead Created" },
      },
    ],
    edges: [],
  };
}
