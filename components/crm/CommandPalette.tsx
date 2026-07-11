"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, Users, Briefcase, CheckSquare, Calendar,
  GitBranch, MessageCircle, Mail, UserCheck, BarChart3, Wallet,
  Zap, Brain, Settings, Shield, Plus,
  Sparkles, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leads, customers, deals } from "@/lib/data";

interface CommandItem {
  id: string;
  label: string;
  category: "navigate" | "create" | "action" | "recent" | "lead" | "customer" | "deal";
  icon: React.ElementType;
  color: string;
  shortcut?: string;
  section?: string;
  sub?: string;
}

const NAV_COMMANDS: CommandItem[] = [
  { id: "nav-dashboard",   label: "Go to Dashboard",        category: "navigate", icon: LayoutDashboard, color: "text-blue-400",   section: "dashboard" },
  { id: "nav-leads",       label: "Go to Leads",            category: "navigate", icon: Users,           color: "text-cyan-400",   section: "leads" },
  { id: "nav-customers",   label: "Go to Customers",        category: "navigate", icon: UserCheck,       color: "text-emerald-400",section: "customers" },
  { id: "nav-deals",       label: "Go to Deals",            category: "navigate", icon: Briefcase,       color: "text-violet-400", section: "deals" },
  { id: "nav-pipeline",    label: "Go to Sales Pipeline",   category: "navigate", icon: GitBranch,       color: "text-blue-400",   section: "pipeline" },
  { id: "nav-tasks",       label: "Go to Tasks",            category: "navigate", icon: CheckSquare,     color: "text-amber-400",  section: "tasks" },
  { id: "nav-calendar",    label: "Go to Calendar",         category: "navigate", icon: Calendar,        color: "text-pink-400",   section: "calendar" },
  { id: "nav-whatsapp",    label: "Go to WhatsApp CRM",     category: "navigate", icon: MessageCircle,   color: "text-green-400",  section: "whatsapp" },
  { id: "nav-email",       label: "Go to Email Marketing",  category: "navigate", icon: Mail,            color: "text-orange-400", section: "email" },
  { id: "nav-reports",     label: "Go to Reports",          category: "navigate", icon: BarChart3,       color: "text-indigo-400", section: "reports" },
  { id: "nav-finance",     label: "Go to Finance",          category: "navigate", icon: Wallet,          color: "text-green-400",  section: "finance" },
  { id: "nav-automation",  label: "Go to Automation",       category: "navigate", icon: Zap,             color: "text-yellow-400", section: "automation" },
  { id: "nav-ai",          label: "Go to AI Insights",      category: "navigate", icon: Brain,           color: "text-violet-400", section: "ai" },
  { id: "nav-team",        label: "Go to Team",             category: "navigate", icon: Users,           color: "text-sky-400",    section: "team" },
  { id: "nav-settings",    label: "Go to Settings",         category: "navigate", icon: Settings,        color: "text-slate-400",  section: "settings" },
  { id: "nav-admin",       label: "Go to Admin Panel",      category: "navigate", icon: Shield,          color: "text-violet-400", section: "admin" },
];

const CREATE_COMMANDS: CommandItem[] = [
  { id: "create-lead",     label: "Create New Lead",        category: "create",   icon: Plus,            color: "text-cyan-400",   section: "leads",   shortcut: "N L" },
  { id: "create-deal",     label: "Create New Deal",        category: "create",   icon: Plus,            color: "text-violet-400", section: "deals",   shortcut: "N D" },
  { id: "create-task",     label: "Create New Task",        category: "create",   icon: Plus,            color: "text-amber-400",  section: "tasks",   shortcut: "N T" },
  { id: "create-customer", label: "Create New Customer",    category: "create",   icon: Plus,            color: "text-emerald-400",section: "customers", shortcut: "N C" },
  { id: "create-invoice",  label: "Create New Invoice",     category: "create",   icon: Plus,            color: "text-green-400",  section: "finance" },
  { id: "create-campaign", label: "Create Email Campaign",  category: "create",   icon: Plus,            color: "text-orange-400", section: "email" },
];

const ACTION_COMMANDS: CommandItem[] = [
  { id: "ai-open",         label: "Open AI Assistant",      category: "action",   icon: Sparkles,        color: "text-blue-400",   shortcut: "⌘ A" },
  { id: "report-gen",      label: "Generate Monthly Report",category: "action",   icon: BarChart3,       color: "text-indigo-400", section: "reports" },
  { id: "pipeline-view",   label: "View Pipeline Kanban",   category: "action",   icon: GitBranch,       color: "text-blue-400",   section: "pipeline" },
];

const ALL_COMMANDS = [...CREATE_COMMANDS, ...NAV_COMMANDS, ...ACTION_COMMANDS];

const LEAD_COMMANDS: CommandItem[] = leads.map((l) => ({
  id: `lead-${l.id}`,
  label: l.name,
  sub: `${l.company} · ${l.stage} · $${(l.value / 1000).toFixed(0)}K`,
  category: "lead",
  icon: Users,
  color: "text-cyan-400",
  section: "leads",
}));

const CUSTOMER_COMMANDS: CommandItem[] = customers.map((c) => ({
  id: `customer-${c.id}`,
  label: c.name,
  sub: `${c.segment} · Health ${c.health}%`,
  category: "customer",
  icon: UserCheck,
  color: "text-emerald-400",
  section: "customers",
}));

const DEAL_COMMANDS: CommandItem[] = deals.map((d) => ({
  id: `deal-${d.id}`,
  label: d.name,
  sub: `${d.company} · ${d.stage} · $${(d.value / 1000).toFixed(0)}K`,
  category: "deal",
  icon: Briefcase,
  color: "text-violet-400",
  section: "deals",
}));

interface CommandPaletteProps {
  onNavigate: (section: string) => void;
  onOpenAI: () => void;
}

export default function CommandPalette({ onNavigate, onOpenAI }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? [
        ...ALL_COMMANDS,
        ...LEAD_COMMANDS,
        ...CUSTOMER_COMMANDS,
        ...DEAL_COMMANDS,
      ].filter((c) => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.category.includes(q) ||
          (c.sub?.toLowerCase().includes(q) ?? false)
        );
      })
    : ALL_COMMANDS.slice(0, 12);

  const execute = useCallback((cmd: CommandItem) => {
    setOpen(false);
    setQuery("");
    if (cmd.id === "ai-open") { onOpenAI(); return; }
    if (cmd.section) onNavigate(cmd.section);
  }, [onNavigate, onOpenAI]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); setQuery(""); setSelected(0); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && filtered[selected]) execute(filtered[selected]);
  };

  const categoryLabel: Record<string, string> = {
    navigate: "Navigation", create: "Create", action: "Actions", recent: "Recent",
    lead: "Leads", customer: "Customers", deal: "Deals",
  };

  let lastCat = "";

  return (
    <>
      {/* Trigger hint in search bar — users see Cmd+K */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xl bg-[#0d1424] rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden"
              style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.08)" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
                <Search size={16} className="text-slate-500 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Search commands, sections, actions..."
                  className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
                />
                <kbd className="text-[10px] text-slate-600 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-[380px] overflow-y-auto py-2">
                {filtered.length === 0 && (
                  <div className="py-8 text-center text-slate-500 text-sm">No commands found for "{query}"</div>
                )}
                {filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  const showHeader = cmd.category !== lastCat;
                  if (showHeader) lastCat = cmd.category;
                  return (
                    <div key={cmd.id}>
                      {showHeader && (
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-4 py-1.5 mt-1">
                          {categoryLabel[cmd.category]}
                        </p>
                      )}
                      <button
                        onMouseEnter={() => setSelected(i)}
                        onClick={() => execute(cmd)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                          selected === i ? "bg-blue-600/20" : "hover:bg-white/[0.03]"
                        )}
                      >
                        <div className={cn("w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center flex-shrink-0", selected === i && "border-blue-500/30 bg-blue-500/10")}>
                          <Icon size={14} className={cmd.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-300">{cmd.label}</span>
                          {cmd.sub && <p className="text-[10px] text-slate-600 truncate">{cmd.sub}</p>}
                        </div>
                        {cmd.shortcut && <kbd className="text-[10px] text-slate-600 border border-white/10 rounded px-1.5 py-0.5">{cmd.shortcut}</kbd>}
                        {selected === i && <ChevronRight size={13} className="text-blue-400 flex-shrink-0" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-600">
                <div className="flex gap-3">
                  <span><kbd className="border border-white/10 rounded px-1">↑↓</kbd> navigate</span>
                  <span><kbd className="border border-white/10 rounded px-1">↵</kbd> select</span>
                  <span><kbd className="border border-white/10 rounded px-1">esc</kbd> close</span>
                </div>
                <div className="flex items-center gap-1"><Sparkles size={9} className="text-blue-400" /> KVl CRM</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
