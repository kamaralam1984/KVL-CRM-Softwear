"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, Play, Pause, Filter, Mail, MessageSquare,
  CheckSquare, UserCheck, Bell, Edit3, ChevronRight,
  ArrowDown, Layers, Settings, FlaskConical, Save,
  ToggleRight, Tag, TrendingDown, CreditCard, Trophy,
  Users, DollarSign, X, ChevronDown, Activity, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOWS as AUTO_WORKFLOWS, runWorkflowTest } from "@/lib/automation/engine";
import { getRuns, isActive, setActive, timeAgo, AUTOMATION_EVENT, type WorkflowRun } from "@/lib/automation/store";

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockType = "trigger" | "condition" | "action";

interface WorkflowBlock {
  id: string;
  type: BlockType;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;          // tailwind color key
  borderColor: string;
  bgColor: string;
  textColor: string;
}

interface Workflow {
  id: number;
  name: string;
  trigger: string;
  steps: number;
  runs: number;
  success: number;
  active: boolean;
  category: "Lead" | "Deal" | "Customer" | "Finance";
}

// ─── Static data ─────────────────────────────────────────────────────────────

const WORKFLOWS: Workflow[] = [
  { id: 1, name: "New Lead Welcome Sequence",   trigger: "New Lead Created",    steps: 5, runs: 284, success: 97, active: true,  category: "Lead"     },
  { id: 2, name: "High-Score Lead Fast Track",  trigger: "Lead Score > 80",     steps: 4, runs: 143, success: 94, active: true,  category: "Lead"     },
  { id: 3, name: "Deal Won Celebration",         trigger: "Deal Closed Won",     steps: 3, runs:  48, success: 100,active: true,  category: "Deal"     },
  { id: 4, name: "Churn Risk Alert",             trigger: "Health Score Drop",   steps: 4, runs:  12, success: 83, active: false, category: "Customer" },
  { id: 5, name: "Invoice Overdue Reminder",     trigger: "Payment Overdue",     steps: 3, runs:  31, success: 90, active: false, category: "Finance"  },
  { id: 6, name: "Demo Follow-Up Sequence",      trigger: "Demo Completed",      steps: 5, runs: 156, success: 88, active: true,  category: "Deal"     },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Lead:     { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30"    },
  Deal:     { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/30"  },
  Customer: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  Finance:  { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30"   },
};

const CANVAS_BLOCKS: WorkflowBlock[] = [
  {
    id: "trigger-1",
    type: "trigger",
    label: "New Lead Created",
    subtitle: "When a lead is added",
    icon: Zap,
    color: "blue",
    borderColor: "border-blue-500/60",
    bgColor: "bg-blue-500/15",
    textColor: "text-blue-400",
  },
  {
    id: "condition-1",
    type: "condition",
    label: "IF Lead Score > 80",
    subtitle: "Check qualification",
    icon: Filter,
    color: "violet",
    borderColor: "border-violet-500/60",
    bgColor: "bg-violet-500/15",
    textColor: "text-violet-400",
  },
  {
    id: "action-assign",
    type: "action",
    label: "Assign Owner",
    subtitle: "Set sales rep",
    icon: UserCheck,
    color: "yellow",
    borderColor: "border-yellow-500/60",
    bgColor: "bg-yellow-500/15",
    textColor: "text-yellow-400",
  },
  {
    id: "action-email",
    type: "action",
    label: "Send Email",
    subtitle: "Welcome sequence",
    icon: Mail,
    color: "blue",
    borderColor: "border-sky-500/60",
    bgColor: "bg-sky-500/15",
    textColor: "text-sky-400",
  },
  {
    id: "action-whatsapp",
    type: "action",
    label: "Send WhatsApp",
    subtitle: "Instant outreach",
    icon: MessageSquare,
    color: "green",
    borderColor: "border-green-500/60",
    bgColor: "bg-green-500/15",
    textColor: "text-green-400",
  },
  {
    id: "action-task",
    type: "action",
    label: "Create Task",
    subtitle: "Schedule follow-up",
    icon: CheckSquare,
    color: "amber",
    borderColor: "border-amber-500/60",
    bgColor: "bg-amber-500/15",
    textColor: "text-amber-400",
  },
  {
    id: "action-notify",
    type: "action",
    label: "Notify Manager",
    subtitle: "Escalate alert",
    icon: Bell,
    color: "red",
    borderColor: "border-red-500/60",
    bgColor: "bg-red-500/15",
    textColor: "text-red-400",
  },
  {
    id: "action-update",
    type: "action",
    label: "Update Field",
    subtitle: "Set CRM data",
    icon: Edit3,
    color: "gray",
    borderColor: "border-slate-500/60",
    bgColor: "bg-slate-500/15",
    textColor: "text-slate-400",
  },
];

const SIDEBAR_TRIGGERS = [
  { label: "New Lead",           icon: Zap,          color: "text-blue-400"    },
  { label: "Deal Won",           icon: Trophy,        color: "text-yellow-400"  },
  { label: "Deal Lost",          icon: X,             color: "text-red-400"     },
  { label: "Payment Received",   icon: CreditCard,    color: "text-green-400"   },
  { label: "Health Score Drop",  icon: TrendingDown,  color: "text-rose-400"    },
];

const SIDEBAR_ACTIONS = [
  { label: "Send Email",         icon: Mail,          color: "text-sky-400"     },
  { label: "Send WhatsApp",      icon: MessageSquare, color: "text-green-400"   },
  { label: "Create Task",        icon: CheckSquare,   color: "text-amber-400"   },
  { label: "Assign Owner",       icon: UserCheck,     color: "text-yellow-400"  },
  { label: "Add Tag",            icon: Tag,           color: "text-violet-400"  },
  { label: "Update Field",       icon: Edit3,         color: "text-slate-400"   },
  { label: "Send Notification",  icon: Bell,          color: "text-red-400"     },
  { label: "Create Deal",        icon: DollarSign,    color: "text-emerald-400" },
  { label: "Move Stage",         icon: Layers,        color: "text-indigo-400"  },
];

// ─── Animated connector ──────────────────────────────────────────────────────

function Connector() {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div className="w-px h-5 bg-gradient-to-b from-white/20 to-white/5 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 w-px bg-gradient-to-b from-transparent via-[#c9a84c] to-transparent"
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-white/20" />
    </div>
  );
}

// ─── Canvas Block ─────────────────────────────────────────────────────────────

function CanvasBlock({
  block,
  isSelected,
  onClick,
  isRunning,
  runStep,
  index,
}: {
  block: WorkflowBlock;
  isSelected: boolean;
  onClick: () => void;
  isRunning: boolean;
  runStep: number;
  index: number;
}) {
  const Icon = block.icon;
  const active = isRunning && runStep === index;
  const done = isRunning && runStep > index;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative w-44 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
        "bg-[#0d1420] shadow-lg cursor-pointer",
        isSelected
          ? "border-[#c9a84c] shadow-[0_0_18px_rgba(201,168,76,0.35)]"
          : block.borderColor,
        done && "opacity-70",
      )}
    >
      {/* running pulse */}
      {active && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-[#c9a84c]"
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.04, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
        />
      )}
      {done && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <span className="text-[8px] text-white font-bold">✓</span>
        </div>
      )}
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", block.bgColor)}>
        <Icon size={15} className={block.textColor} />
      </div>
      <p className="text-[11px] font-semibold text-slate-100 leading-tight">{block.label}</p>
      <p className="text-[9px] text-slate-500 mt-0.5">{block.subtitle}</p>
      <div className={cn("mt-1.5 text-[8px] font-medium px-1.5 py-0.5 rounded-md inline-block", block.bgColor, block.textColor)}>
        {block.type.toUpperCase()}
      </div>
    </motion.button>
  );
}

// ─── Properties Panel ─────────────────────────────────────────────────────────

function PropertiesPanel({ block }: { block: WorkflowBlock | null }) {
  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
          <Settings size={20} className="text-slate-600" />
        </div>
        <p className="text-xs text-slate-500">Click a block to configure it</p>
      </div>
    );
  }

  const Icon = block.icon;

  return (
    <motion.div
      key={block.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="p-4 space-y-4"
    >
      {/* header */}
      <div className={cn("flex items-center gap-2.5 p-3 rounded-xl border", block.bgColor, block.borderColor)}>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-black/20")}>
          <Icon size={15} className={block.textColor} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-100">{block.label}</p>
          <p className="text-[9px] text-slate-500">{block.type}</p>
        </div>
      </div>

      {/* condition config */}
      {block.type === "condition" && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Condition</p>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 block">Field</label>
            <div className="relative">
              <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                <option>Lead Score</option>
                <option>Deal Value</option>
                <option>Health Score</option>
                <option>Days Since Contact</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                <option>Greater than</option>
                <option>Less than</option>
                <option>Equals</option>
                <option>Contains</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <input
              defaultValue="80"
              className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none focus:border-violet-500/50"
              placeholder="Value"
            />
          </div>
          <div className="flex gap-1.5">
            <button className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">TRUE path</button>
            <button className="flex-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">FALSE path</button>
          </div>
        </div>
      )}

      {/* trigger config */}
      {block.type === "trigger" && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Trigger Settings</p>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 block">Event</label>
            <div className="relative">
              <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                <option>New Lead Created</option>
                <option>Deal Won</option>
                <option>Deal Lost</option>
                <option>Payment Received</option>
                <option>Health Score Drop</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <label className="text-[10px] text-slate-500 block">Filter (optional)</label>
            <input
              className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none focus:border-blue-500/50"
              placeholder="e.g. Source = Website"
            />
          </div>
        </div>
      )}

      {/* action configs */}
      {block.type === "action" && block.id === "action-email" && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Email Settings</p>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 block">Template</label>
            <div className="relative">
              <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                <option>Welcome Email</option>
                <option>Follow-up #1</option>
                <option>Demo Invite</option>
                <option>Re-engagement</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <label className="text-[10px] text-slate-500 block">Delay</label>
            <div className="flex gap-1.5">
              <input defaultValue="0" className="w-16 px-2 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none text-center" />
              <div className="relative flex-1">
                <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                  <option>Hours</option>
                  <option>Days</option>
                  <option>Immediately</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {block.type === "action" && block.id === "action-assign" && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Assignment</p>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 block">Assign To</label>
            <div className="relative">
              <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                <option>Round Robin</option>
                <option>Sarah Chen</option>
                <option>Mike Johnson</option>
                <option>Team Lead</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <label className="text-[10px] text-slate-500 block">Priority</label>
            <div className="relative">
              <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {block.type === "action" && block.id === "action-whatsapp" && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">WhatsApp Settings</p>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 block">Message Template</label>
            <div className="relative">
              <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                <option>Quick Intro</option>
                <option>Meeting Request</option>
                <option>Demo Confirmation</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <label className="text-[10px] text-slate-500 block">Send As</label>
            <div className="relative">
              <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                <option>Assigned Rep</option>
                <option>Company Number</option>
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {block.type === "action" && !["action-email","action-assign","action-whatsapp"].includes(block.id) && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Configuration</p>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] text-slate-500">
            Configure this action's parameters here.
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 block">Delay before executing</label>
            <div className="flex gap-1.5">
              <input defaultValue="0" className="w-16 px-2 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none text-center" />
              <div className="relative flex-1">
                <select className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-200 outline-none appearance-none pr-6">
                  <option>Minutes</option>
                  <option>Hours</option>
                  <option>Days</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── My Workflows View ────────────────────────────────────────────────────────

function WorkflowsView({
  workflows,
  onToggle,
  onNew,
  onEdit,
}: {
  workflows: Workflow[];
  onToggle: (id: number) => void;
  onNew: () => void;
  onEdit: (id: number) => void;
}) {
  const [filter, setFilter] = useState<string>("All");
  const categories = ["All", "Lead", "Deal", "Customer", "Finance"];

  const filtered = filter === "All" ? workflows : workflows.filter((w) => w.category === filter);
  const activeCount = workflows.filter((w) => w.active).length;
  const totalRuns = workflows.reduce((s, w) => s + w.runs, 0);
  const avgSuccess = Math.round(workflows.reduce((s, w) => s + w.success, 0) / workflows.length);

  return (
    <div className="flex flex-col h-full">
      {/* top stats */}
      <div className="px-5 pt-5 pb-4 grid grid-cols-3 gap-3 flex-shrink-0">
        {[
          { label: "Active", value: activeCount,    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Total Runs",  value: totalRuns, color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
          { label: "Avg Success", value: `${avgSuccess}%`, color: "text-[#c9a84c]", bg: "bg-[#c9a84c]/10", border: "border-[#c9a84c]/20" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border p-3 text-center", s.bg, s.border)}>
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="px-5 flex items-center justify-between gap-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all",
                filter === c
                  ? "bg-[#c9a84c] text-black"
                  : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-black flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #c9a84c, #e8c96d)" }}
        >
          <Plus size={11} /> New Workflow
        </motion.button>
      </div>

      {/* cards */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2.5">
        <AnimatePresence>
          {filtered.map((wf, i) => {
            const cat = CATEGORY_COLORS[wf.category];
            return (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "rounded-2xl border p-4 transition-all duration-200",
                  "bg-[#0d1420]",
                  wf.active ? "border-white/[0.08] hover:border-white/[0.14]" : "border-white/[0.04] opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* icon */}
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", cat.bg, cat.border, "border")}>
                    <Zap size={15} className={cat.text} />
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-xs font-semibold text-slate-100 truncate">{wf.name}</p>
                      <span className={cn("flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded-md font-medium", cat.bg, cat.text)}>
                        {wf.category}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 mb-2">Trigger: <span className="text-slate-400">{wf.trigger}</span></p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Steps",   value: wf.steps        },
                        { label: "Runs",    value: wf.runs         },
                        { label: "Success", value: `${wf.success}%` },
                      ].map((m) => (
                        <div key={m.label} className="bg-white/[0.03] rounded-lg p-1.5 text-center">
                          <p className="text-[10px] font-bold text-slate-200">{m.value}</p>
                          <p className="text-[8px] text-slate-600">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* controls */}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    {/* toggle */}
                    <button
                      onClick={() => onToggle(wf.id)}
                      className={cn(
                        "w-8 h-4 rounded-full relative transition-colors duration-200",
                        wf.active ? "bg-emerald-500" : "bg-white/10"
                      )}
                    >
                      <motion.div
                        animate={{ x: wf.active ? 16 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow"
                      />
                    </button>
                    <span className={cn("text-[8px]", wf.active ? "text-emerald-400" : "text-slate-600")}>
                      {wf.active ? "On" : "Off"}
                    </span>
                    <button
                      onClick={() => onEdit(wf.id)}
                      className="mt-1 w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center transition-colors"
                    >
                      <ChevronRight size={10} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Builder View ─────────────────────────────────────────────────────────────

function BuilderView({ onBack }: { onBack: () => void }) {
  const [selectedBlock, setSelectedBlock] = useState<WorkflowBlock | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runStep, setRunStep] = useState(-1);
  const [isSaved, setIsSaved] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const runTest = () => {
    setIsRunning(true);
    setRunStep(0);
    let step = 0;
    const tick = setInterval(() => {
      step++;
      if (step >= CANVAS_BLOCKS.length) {
        clearInterval(tick);
        setTimeout(() => { setIsRunning(false); setRunStep(-1); }, 1200);
      } else {
        setRunStep(step);
      }
    }, 600);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* builder header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] flex items-center justify-center transition-colors"
          >
            <ChevronRight size={12} className="text-slate-400 rotate-180" />
          </button>
          <div>
            <p className="text-xs font-semibold text-slate-100">High-Score Lead Fast Track</p>
            <p className="text-[9px] text-slate-500">8 blocks · Draft</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[8px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            >
              LIVE
            </motion.span>
          )}
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: sidebar */}
        <div className="w-36 border-r border-white/[0.06] flex flex-col overflow-y-auto flex-shrink-0">
          {/* Triggers */}
          <div className="p-3">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Triggers</p>
            <div className="space-y-1">
              {SIDEBAR_TRIGGERS.map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.label}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/[0.05] cursor-grab active:cursor-grabbing transition-colors group"
                    title={`Add: ${t.label}`}
                  >
                    <Icon size={11} className={t.color} />
                    <span className="text-[9px] text-slate-400 group-hover:text-slate-300 leading-tight">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/[0.06] p-3">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Actions</p>
            <div className="space-y-1">
              {SIDEBAR_ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.label}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/[0.05] cursor-grab active:cursor-grabbing transition-colors group"
                    title={`Add: ${a.label}`}
                  >
                    <Icon size={11} className={a.color} />
                    <span className="text-[9px] text-slate-400 group-hover:text-slate-300 leading-tight">{a.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER: canvas */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {/* grid bg */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, #ffffff18 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex flex-col items-center py-6 px-4 gap-0">
            {CANVAS_BLOCKS.map((block, i) => (
              <div key={block.id} className="flex flex-col items-center">
                <CanvasBlock
                  block={block}
                  isSelected={selectedBlock?.id === block.id}
                  onClick={() => setSelectedBlock(selectedBlock?.id === block.id ? null : block)}
                  isRunning={isRunning}
                  runStep={runStep}
                  index={i}
                />
                {i < CANVAS_BLOCKS.length - 1 && <Connector />}
              </div>
            ))}
          </div>

          {/* test run overlay */}
          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]/40 flex items-center gap-1.5"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-2.5 h-2.5 border border-[#c9a84c] border-t-transparent rounded-full"
                />
                <span className="text-[9px] text-[#c9a84c] font-medium">Running test…</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: properties */}
        <div className="w-44 border-l border-white/[0.06] overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-white/[0.06]">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Properties</p>
          </div>
          <PropertiesPanel block={selectedBlock} />
        </div>
      </div>

      {/* BOTTOM toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/[0.06] flex-shrink-0 bg-[#080c14]">
        <button
          onClick={runTest}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[10px] text-slate-300 hover:bg-white/[0.09] transition-colors disabled:opacity-40"
        >
          <FlaskConical size={11} /> Test
        </button>
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[10px] text-slate-300 hover:bg-white/[0.09] transition-colors"
          >
            <Save size={11} />
            {isSaved ? <span className="text-emerald-400">Saved!</span> : "Save Draft"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsActive((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-black transition-all"
            style={{ background: isActive ? "linear-gradient(135deg,#10b981,#34d399)" : "linear-gradient(135deg,#c9a84c,#e8c96d)" }}
          >
            <ToggleRight size={11} />
            {isActive ? "Deactivate" : "Activate"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ─── Executions (REAL run log) ────────────────────────────────────────────────

function ExecutionsView() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [active, setActiveState] = useState<Record<string, boolean>>({});

  const refresh = () => setRuns(getRuns());
  useEffect(() => {
    refresh();
    setActiveState(Object.fromEntries(AUTO_WORKFLOWS.map((w) => [w.id, isActive(w.id)])));
    const onRun = () => refresh();
    window.addEventListener(AUTOMATION_EVENT, onRun);
    return () => window.removeEventListener(AUTOMATION_EVENT, onRun);
  }, []);

  const total = runs.length;
  const okCount = runs.filter((r) => r.ok).length;
  const successRate = total ? Math.round((okCount / total) * 1000) / 10 : 100;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const today = runs.filter((r) => r.at >= startOfDay.getTime()).length;

  const toggleActive = (id: string) => {
    const next = !active[id];
    setActive(id, next);
    setActiveState((m) => ({ ...m, [id]: next }));
  };
  const test = (def: typeof AUTO_WORKFLOWS[number]) => { runWorkflowTest(def); refresh(); };

  const stats = [
    { label: "Total runs", value: String(total), color: "#c9a84c" },
    { label: "Runs today", value: String(today), color: "#3b82f6" },
    { label: "Success rate", value: `${successRate}%`, color: "#10b981" },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Left: workflows + controls */}
      <div className="xl:col-span-1 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {AUTO_WORKFLOWS.map((w) => (
          <div key={w.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-200">{w.name}</p>
              <button
                onClick={() => toggleActive(w.id)}
                className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border",
                  active[w.id] ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-slate-500/10 text-slate-500 border-white/10")}
              >
                {active[w.id] ? "● Active" : "○ Off"}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">Trigger: {w.trigger}</p>
            <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">{w.description}</p>
            <button
              onClick={() => test(w)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-[#c9a84c] hover:text-[#e0c266] transition-colors"
            >
              <FlaskConical size={11} /> Test run
            </button>
          </div>
        ))}
      </div>

      {/* Right: live execution log */}
      <div className="xl:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-[#c9a84c]" />
            <p className="text-xs font-bold text-slate-200">Live Execution Log</p>
          </div>
          <span className="flex items-center gap-1 text-[9px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        </div>
        {runs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <Zap size={26} className="text-slate-700 mb-2" />
            <p className="text-xs text-slate-500">No executions yet.</p>
            <p className="text-[10px] text-slate-600 mt-1">Add a lead (Leads → Add Lead) or hit “Test run” to fire a workflow.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {runs.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-semibold text-slate-200 truncate">{r.trigger}</p>
                  <span className="text-[9px] text-slate-600 flex-shrink-0 ml-2">{timeAgo(r.at)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.steps.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/15">
                      <CheckCircle2 size={8} /> {s.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function Automation() {
  const [view, setView] = useState<"list" | "builder" | "executions">("list");
  const [workflows, setWorkflows] = useState<Workflow[]>(WORKFLOWS);

  const toggle = (id: number) => {
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, active: !w.active } : w));
  };

  return (
    <div className="h-full flex flex-col bg-[#080c14] overflow-hidden">
      {/* view tabs */}
      <div className="flex items-center gap-0.5 px-4 pt-4 pb-0 flex-shrink-0">
        {(["list", "executions", "builder"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "relative px-4 py-2 text-[10px] font-semibold rounded-t-xl transition-all",
              view === v
                ? "text-[#c9a84c] bg-[#0d1420] border-t border-l border-r border-white/[0.08]"
                : "text-slate-500 hover:text-slate-400",
            )}
          >
            {v === "list" ? (
              <span className="flex items-center gap-1.5"><Layers size={10} /> My Workflows</span>
            ) : v === "executions" ? (
              <span className="flex items-center gap-1.5"><Activity size={10} /> Executions</span>
            ) : (
              <span className="flex items-center gap-1.5"><Zap size={10} /> Builder</span>
            )}
          </button>
        ))}
        {/* count badge */}
        {view === "list" && (
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#c9a84c]/15 text-[#c9a84c] text-[8px] font-bold">
            {workflows.filter((w) => w.active).length} active
          </span>
        )}
      </div>

      {/* content */}
      <div className="flex-1 overflow-hidden bg-[#0d1420] border border-white/[0.06] rounded-b-2xl rounded-tr-2xl mx-4 mb-4">
        <AnimatePresence mode="wait">
          {view === "list" ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <WorkflowsView
                workflows={workflows}
                onToggle={toggle}
                onNew={() => setView("builder")}
                onEdit={() => setView("builder")}
              />
            </motion.div>
          ) : view === "executions" ? (
            <motion.div
              key="executions"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <ExecutionsView />
            </motion.div>
          ) : (
            <motion.div
              key="builder"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <BuilderView onBack={() => setView("list")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
