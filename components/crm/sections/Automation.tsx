"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, ChevronRight, Layers, FlaskConical, Activity, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOWS as AUTO_WORKFLOWS, runWorkflowTest } from "@/lib/automation/engine";
import { getRuns, isActive, setActive, timeAgo, AUTOMATION_EVENT, type WorkflowRun } from "@/lib/automation/store";
import { getWorkflowRuns, getWorkflows } from "@/lib/actions/workflows";
import { getAccessToken } from "@/lib/security/clientSession";
import GraphBuilder from "./automation/GraphBuilder";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Executions (REAL run log) ────────────────────────────────────────────────

function ExecutionsView() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [active, setActiveState] = useState<Record<string, boolean>>({});

  const refresh = () => setRuns(getRuns());
  useEffect(() => {
    refresh();
    setActiveState(Object.fromEntries(AUTO_WORKFLOWS.map((w) => [w.id, isActive(w.id)])));

    // Phase 19: merge in the DB-persisted, cross-device view on top of the
    // local/localStorage one above — best-effort, never blocks first render.
    const token = getAccessToken();
    getWorkflowRuns(200, token).then((dbRuns) => {
      if (!dbRuns.length) return;
      setRuns((local) => {
        const seen = new Set(local.map((r) => r.id));
        return [...local, ...dbRuns.filter((r) => !seen.has(r.id))].sort((a, b) => b.at - a.at).slice(0, 200);
      });
    }).catch(() => {});
    getWorkflows(token).then((dbWorkflows) => {
      if (!dbWorkflows.length) return;
      setActiveState((m) => {
        const next = { ...m };
        for (const w of dbWorkflows) next[w.key] = w.active;
        return next;
      });
    }).catch(() => {});

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
              <GraphBuilder />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
