// Phase 20 — Visual Drag-Drop Workflow Builder.
// A persisted trigger→condition→action graph, shaped 1:1 to @xyflow/react's
// own node/edge model so the canvas can read/write these types directly with
// no translation layer. This sits ALONGSIDE lib/automation/engine.ts's 5
// hardcoded trigger functions — it doesn't replace them; new workflows authored
// visually run through lib/automation/graph/interpreter.ts instead.

export type TriggerKind =
  | "manual"
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
  | "send_sms"
  | "set_field"
  | "http_request";

export const TRIGGER_KINDS: { kind: TriggerKind; label: string }[] = [
  { kind: "manual", label: "Manual Trigger" },
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
  { kind: "set_field", label: "Set Field" },
  { kind: "http_request", label: "HTTP Request" },
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

// ── n8n-style node parameters ────────────────────────────────────────────────
// Every action node is configured through a small schema-driven form. Any text
// value may contain {{field}} expressions that the interpreter fills from the
// running record (and from earlier Set Field / HTTP Request nodes).
export interface ParamField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  /** Value used when the param was never edited (kept in sync with the interpreter). */
  default?: string;
}

export const ACTION_FIELDS: Record<ActionKind, ParamField[]> = {
  send_whatsapp: [
    { key: "to", label: "To (phone)", type: "text", placeholder: "{{phone}}", hint: "Empty = the record's phone number" },
    { key: "body", label: "Message", type: "textarea", placeholder: "Hi {{name}}, thanks for your interest in…" },
  ],
  send_sms: [
    { key: "to", label: "To (phone)", type: "text", placeholder: "{{phone}}", hint: "Empty = the record's phone number" },
    { key: "body", label: "Message", type: "textarea", placeholder: "Hi {{name}}, …" },
  ],
  send_email: [
    { key: "to", label: "To (email)", type: "text", placeholder: "{{email}}", hint: "Empty = the record's email" },
    { key: "subject", label: "Subject", type: "text", placeholder: "Following up, {{name}}" },
    { key: "body", label: "Body", type: "textarea", placeholder: "Hi {{name}},\n\n…" },
  ],
  create_task: [
    { key: "title", label: "Task title", type: "text", placeholder: "Follow up with {{company}}" },
    { key: "priority", label: "Priority", type: "select", default: "medium", options: [
      { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" } ] },
    { key: "due", label: "Due", type: "text", placeholder: "Today", default: "Today" },
    { key: "assignee", label: "Assignee", type: "text", placeholder: "{{owner}}", hint: "Empty = Unassigned" },
  ],
  log_activity: [
    { key: "text", label: "Activity text", type: "textarea", placeholder: "Automation ran for {{company}}" },
  ],
  set_field: [
    { key: "key", label: "Field name", type: "text", placeholder: "priority_label", hint: "Letters, numbers and _ only" },
    { key: "value", label: "Value", type: "text", placeholder: "VIP – {{company}}", hint: "Use it in later nodes as {{priority_label}}" },
  ],
  http_request: [
    { key: "method", label: "Method", type: "select", default: "POST", options: [
      { value: "GET", label: "GET" }, { value: "POST", label: "POST" } ] },
    { key: "url", label: "URL", type: "text", placeholder: "https://example.com/webhook" },
    { key: "body", label: "JSON body (POST)", type: "textarea", placeholder: '{"company":"{{company}}","score":"{{score}}"}' },
  ],
};

/** Fields every run knows about — offered as click-to-insert chips + condition suggestions. */
export const CONTEXT_FIELDS = ["name", "company", "email", "phone", "score", "owner"];

export type NodeGroup = "Trigger" | "Logic" | "Messaging" | "CRM" | "Developer";

export interface CatalogEntry {
  type: GraphNodeType;
  kind: string;
  label: string;
  desc: string;
  group: NodeGroup;
}

/** The "What happens next?" picker — one row per node a user can add. */
export const NODE_CATALOG: CatalogEntry[] = [
  { type: "trigger", kind: "manual", label: "Manual Trigger", desc: "Start by clicking Test run", group: "Trigger" },
  { type: "trigger", kind: "lead_created", label: "New Lead Created", desc: "When a lead is added to the CRM", group: "Trigger" },
  { type: "trigger", kind: "high_intent_visitor", label: "High-Intent Visitor", desc: "A website visitor shows buying intent", group: "Trigger" },
  { type: "trigger", kind: "lead_score_spike", label: "Lead Score Spike", desc: "A lead's score jumps", group: "Trigger" },
  { type: "trigger", kind: "deal_won", label: "Deal Won", desc: "A deal moves to Closed Won", group: "Trigger" },
  { type: "trigger", kind: "customer_health_drop", label: "Customer Health Drop", desc: "A customer's health score drops below 60", group: "Trigger" },
  { type: "condition", kind: "if", label: "IF", desc: "Split into TRUE / FALSE paths", group: "Logic" },
  { type: "action", kind: "set_field", label: "Set Field", desc: "Create a value to use in later nodes", group: "Logic" },
  { type: "action", kind: "send_whatsapp", label: "Send WhatsApp", desc: "Message the lead on WhatsApp", group: "Messaging" },
  { type: "action", kind: "send_email", label: "Send Email", desc: "Email the lead", group: "Messaging" },
  { type: "action", kind: "send_sms", label: "Send SMS", desc: "Text the lead", group: "Messaging" },
  { type: "action", kind: "create_task", label: "Create Task", desc: "Add a to-do for your team", group: "CRM" },
  { type: "action", kind: "log_activity", label: "Log Activity", desc: "Write to the activity feed", group: "CRM" },
  { type: "action", kind: "http_request", label: "HTTP Request", desc: "Call any external API / webhook", group: "Developer" },
];

export interface TriggerNodeData {
  kind: TriggerKind;
  label: string;
  /** Automatic runs only. "live" sends messages / calls URLs for real; anything else (default) logs what WOULD happen. */
  sendMode?: "dry" | "live";
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

/** The CRM event each built-in workflow listens to — also the default trigger of its canvas. */
export const WORKFLOW_TRIGGER: Record<string, TriggerKind> = {
  "lead-nurture": "lead_created",
  "deal-won": "deal_won",
  "churn-alert": "customer_health_drop",
  "high-intent-visitor": "high_intent_visitor",
  "hot-lead-alert": "lead_score_spike",
};

/** Events the CRM really fires into saved canvases today. */
export const LIVE_TRIGGERS: TriggerKind[] = ["lead_created", "high_intent_visitor", "lead_score_spike", "deal_won", "customer_health_drop"];

export function emptyGraph(workflowKey: string): WorkflowGraph {
  const kind = WORKFLOW_TRIGGER[workflowKey] ?? "lead_created";
  const label = TRIGGER_KINDS.find((t) => t.kind === kind)?.label ?? "New Lead Created";
  return {
    workflowKey,
    version: 1,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 60, y: 160 },
        data: { kind, label },
      },
    ],
    edges: [],
  };
}
