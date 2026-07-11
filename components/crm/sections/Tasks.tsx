"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, CheckCircle2, Circle, Clock, Sparkles, Flag } from "lucide-react";
import { tasks as initialTasks } from "@/lib/data";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/modal";

const priorityStyles = {
  high: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", dot: "bg-rose-500" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" },
  low: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", dot: "bg-slate-400" },
};

const inputCls = "w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-crm-border text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors";
const selectCls = "w-full px-3 py-2 rounded-xl bg-[#0a1628] border border-crm-border text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors";

type TaskForm = { title: string; priority: string; due: string; assignee: string; company: string };
const emptyForm: TaskForm = { title: "", priority: "medium", due: "", assignee: "", company: "" };

export default function Tasks() {
  const [taskList, setTaskList] = useState(initialTasks);
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TaskForm>(emptyForm);

  const set = (k: keyof TaskForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const toggleTask = (id: number) => {
    setTaskList((prev) =>
      prev.map((t) => t.id === id ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t)
    );
  };

  const addTask = () => {
    if (!form.title.trim()) return;
    setTaskList((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: form.title,
        priority: form.priority as "high" | "medium" | "low",
        due: form.due || "No due date",
        assignee: form.assignee || "Unassigned",
        status: "pending" as const,
        tags: [],
        company: form.company || "Internal",
      },
    ]);
    setShowModal(false);
    setForm(emptyForm);
  };

  const filtered = taskList.filter((t) => filter === "All" || t.status === filter.toLowerCase().replace(" ", "-"));

  const counts = {
    all: taskList.length,
    pending: taskList.filter((t) => t.status === "pending").length,
    "in-progress": taskList.filter((t) => t.status === "in-progress").length,
    completed: taskList.filter((t) => t.status === "completed").length,
  };

  return (
    <>
      <div className="p-5 h-full overflow-y-auto space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Tasks", value: counts.all, color: "text-blue-400" },
            { label: "Pending", value: counts.pending, color: "text-amber-400" },
            { label: "In Progress", value: counts["in-progress"], color: "text-cyan-400" },
            { label: "Completed", value: counts.completed, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl border border-crm-border p-3 text-center">
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-violet-500/20" style={{ background: "rgba(109,40,217,0.1)" }}>
          <Sparkles size={13} className="text-violet-400 flex-shrink-0" />
          <p className="text-xs text-slate-300"><span className="text-violet-300 font-medium">AI Suggestion:</span> 3 high-priority tasks are due today. Start with &quot;Follow up with TechNova&quot; — it&apos;s linked to a $45K deal currently in Qualified stage.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {["All", "Pending", "In Progress", "Completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn("text-xs px-3 py-1.5 rounded-lg transition-all", filter === f ? "gradient-bg text-white" : "text-slate-400 border border-crm-border hover:bg-white/[0.04]")}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-bg text-white text-xs ml-auto"
          >
            <Plus size={12} /> Add Task
          </button>
        </div>

        <div className="space-y-2">
          {filtered.map((task, i) => {
            const pr = priorityStyles[task.priority as keyof typeof priorityStyles];
            const done = task.status === "completed";
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn("glass-card rounded-xl border p-3.5 flex items-start gap-3 hover:border-blue-500/30 transition-all cursor-pointer group", done ? "opacity-60 border-crm-border" : "border-crm-border")}
              >
                <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                  {done ? <CheckCircle2 size={17} className="text-emerald-500" /> : <Circle size={17} className="text-slate-600 hover:text-blue-400 transition-colors" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium leading-tight", done ? "line-through text-slate-500" : "text-slate-200")}>{task.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock size={9} /> {task.due}
                    </div>
                    <span className="text-[10px] text-slate-600">{task.company}</span>
                    <span className="text-[10px] text-slate-600">{task.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {task.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-crm-border text-slate-500">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("badge border flex items-center gap-1", pr.bg, pr.text, pr.border)}>
                    <Flag size={9} /> {task.priority}
                  </span>
                  <span className={cn("badge text-[10px]",
                    task.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    task.status === "in-progress" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                    "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  )}>
                    {task.status}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Task">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Task Title *</label>
            <input className={inputCls} placeholder="Follow up with client..." value={form.title} onChange={set("title")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Priority</label>
              <select className={selectCls} value={form.priority} onChange={set("priority")}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Due Date</label>
              <input className={inputCls} placeholder="Today 5:00 PM" value={form.due} onChange={set("due")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Assignee</label>
              <input className={inputCls} placeholder="Sarah Chen" value={form.assignee} onChange={set("assignee")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Company</label>
              <input className={inputCls} placeholder="TechNova Inc" value={form.company} onChange={set("company")} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-2 rounded-xl border border-crm-border text-xs text-slate-400 hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addTask}
              disabled={!form.title.trim()}
              className="flex-1 py-2 rounded-xl gradient-bg text-white text-xs font-medium disabled:opacity-40"
            >
              Add Task
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
