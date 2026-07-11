"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Globe, Server, Users, CreditCard, Key, Check,
  AlertTriangle, Settings, Save, RefreshCw, Trash2, Plus, Edit2,
  X, Activity, Lock, Package, DollarSign, Eye, EyeOff, Search,
  LayoutDashboard, FileText, BarChart3, LogIn, LogOut, FilePlus,
  Pencil, Download, Cpu, Filter, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AppConfig, type SaasPlan, type ManagedUser, type RolePermissions, type ActivityEntry,
  loadConfig, saveConfig, loadUsers, saveUsers, loadPermissions, savePermissions,
  loadLogs, clearLogs, ALL_SECTIONS,
} from "@/lib/appConfig";

/* ───────────── helpers ───────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className={cn("relative w-10 h-5 rounded-full transition-colors flex-shrink-0", on ? "bg-blue-600" : "bg-white/10")}>
      <motion.div animate={{ x: on ? 20 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow" />
    </button>
  );
}

function Card({ title, icon: Icon, children, className = "" }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5", className)}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Icon size={14} className="text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const ROLES = ["Admin", "Manager", "Senior AE", "Sales Rep", "Marketing", "Finance", "Support", "Viewer"];

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard", leads: "Leads", customers: "Customers", deals: "Deals",
  pipeline: "Pipeline", tasks: "Tasks", calendar: "Calendar", whatsapp: "WhatsApp",
  email: "Email", team: "Team", reports: "Reports", finance: "Finance",
  automation: "Automation", ai: "AI Insights", settings: "Settings",
};

const roleColors: Record<string, string> = {
  Admin: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Manager: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Senior AE": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Sales Rep": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Marketing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Finance: "bg-green-500/10 text-green-400 border-green-500/20",
  Support: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Viewer: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const logTypeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  login:  { icon: LogIn,       color: "text-emerald-400 bg-emerald-500/10" },
  logout: { icon: LogOut,      color: "text-slate-400 bg-slate-500/10" },
  create: { icon: FilePlus,    color: "text-blue-400 bg-blue-500/10" },
  update: { icon: Pencil,      color: "text-amber-400 bg-amber-500/10" },
  delete: { icon: Trash2,      color: "text-rose-400 bg-rose-500/10" },
  view:   { icon: Eye,         color: "text-sky-400 bg-sky-500/10" },
  export: { icon: Download,    color: "text-teal-400 bg-teal-500/10" },
  system: { icon: Cpu,         color: "text-violet-400 bg-violet-500/10" },
};

/* ───────────── User Modal ───────────── */
function UserModal({ user, onSave, onClose, mode }: {
  user: Partial<ManagedUser> | null; onSave: (u: ManagedUser) => void; onClose: () => void; mode: "create" | "edit";
}) {
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? "Sales Rep", password: user?.password ?? "", status: (user?.status ?? "active") as "active"|"inactive" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const submit = () => {
    if (!form.name.trim()) { setErr("Name required"); return; }
    if (!form.email.includes("@")) { setErr("Valid email required"); return; }
    if (mode === "create" && form.password.length < 4) { setErr("Password min 4 chars"); return; }
    const av = form.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
    onSave({ id: user?.id ?? Date.now().toString(), name: form.name.trim(), email: form.email.toLowerCase().trim(), role: form.role, avatar: av, password: form.password || user?.password || "", status: form.status, createdAt: user?.createdAt ?? new Date().toLocaleDateString(), lastLogin: user?.lastLogin ?? null });
    onClose();
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1424] p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white">{mode === "create" ? "Create New User" : "Edit User"}</h3>
          <button onClick={onClose}><X size={16} className="text-slate-500 hover:text-white" /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Full Name *", key: "name", placeholder: "John Smith", type: "text" },
            { label: "Email Address *", key: "email", placeholder: "user@company.com", type: "email" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} type={f.type}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50 placeholder-slate-600" />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Role *</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full bg-[#0d1424] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{mode === "create" ? "Password *" : "New Password (blank = keep)"}</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={mode === "edit" ? "••••••••" : "min 4 chars"}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 outline-none focus:border-blue-500/50 placeholder-slate-600" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs text-slate-400">Status</label>
            <div className="flex items-center gap-2"><span className="text-xs text-slate-500">{form.status === "active" ? "Active" : "Inactive"}</span>
              <Toggle on={form.status === "active"} onChange={v => setForm({ ...form, status: v ? "active" : "inactive" })} />
            </div>
          </div>
          {err && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertTriangle size={11} />{err}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={submit} className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white">{mode === "create" ? "Create User" : "Save Changes"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────── Password Modal ───────────── */
function PasswordModal({ user, onSave, onClose }: { user: ManagedUser; onSave: (id: string, pw: string) => void; onClose: () => void }) {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [show, setShow] = useState(false); const [err, setErr] = useState("");
  const submit = () => { if (pw.length < 4) { setErr("Min 4 chars"); return; } if (pw !== pw2) { setErr("No match"); return; } onSave(user.id, pw); onClose(); };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1424] p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Change Password — {user.name}</h3>
          <button onClick={onClose}><X size={15} className="text-slate-500 hover:text-white" /></button>
        </div>
        <div className="space-y-3">
          {["New Password", "Confirm Password"].map((lbl, i) => (
            <div key={lbl}>
              <label className="text-xs text-slate-500 mb-1 block">{lbl}</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={i === 0 ? pw : pw2} onChange={e => i === 0 ? setPw(e.target.value) : setPw2(e.target.value)} placeholder="••••••••"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 outline-none focus:border-blue-500/50 placeholder-slate-600" />
                {i === 0 && <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{show ? <EyeOff size={13} /> : <Eye size={13} />}</button>}
              </div>
            </div>
          ))}
          {err && <p className="text-xs text-rose-400">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={submit} className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white">Update</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN ADMIN PANEL
═══════════════════════════════════════════ */
export default function AdminPanel() {
  const [config, setConfig]   = useState<AppConfig>(loadConfig);
  const [users, setUsers]     = useState<ManagedUser[]>(() => loadUsers());
  const [perms, setPerms]     = useState<RolePermissions>(() => loadPermissions());
  const [logs, setLogs]       = useState<ActivityEntry[]>(() => loadLogs());
  const [saved, setSaved]     = useState(false);
  const [tab, setTab]         = useState<"overview"|"users"|"roles"|"logs"|"features"|"plans"|"system">("overview");

  /* user modal state */
  const [userModal, setUserModal] = useState<{ mode: "create"|"edit"; user: Partial<ManagedUser>|null }|null>(null);
  const [pwModal, setPwModal]     = useState<ManagedUser|null>(null);
  const [delConfirm, setDelConfirm] = useState<string|null>(null);
  const [userSearch, setUserSearch] = useState("");

  /* log filters */
  const [logSearch, setLogSearch]   = useState("");
  const [logType, setLogType]       = useState("all");
  const [logUser, setLogUser]       = useState("all");

  /* plan editor */
  const [editPlan, setEditPlan]   = useState<SaasPlan|null>(null);
  const [planForm, setPlanForm]   = useState<SaasPlan|null>(null);

  const handleSave = () => { saveConfig(config); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const saveUsersState = (u: ManagedUser[]) => { setUsers(u); saveUsers(u); };

  const savePermsState = (p: RolePermissions) => { setPerms(p); savePermissions(p); };

  const tabs = [
    { id: "overview",  label: "Overview",        icon: LayoutDashboard },
    { id: "users",     label: "Users",            icon: Users },
    { id: "roles",     label: "Roles & Perms",   icon: Shield },
    { id: "logs",      label: "Activity Log",    icon: FileText },
    { id: "features",  label: "Features",         icon: Zap },
    { id: "plans",     label: "SaaS Plans",       icon: Package },
    { id: "system",    label: "System",           icon: Settings },
  ] as const;

  const filteredLogs = logs.filter(l => {
    if (logType !== "all" && l.type !== logType) return false;
    if (logUser !== "all" && l.userName !== logUser) return false;
    if (logSearch && !l.action.toLowerCase().includes(logSearch.toLowerCase()) && !l.detail.toLowerCase().includes(logSearch.toLowerCase()) && !l.userName.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2"><Shield size={18} className="text-blue-400" /> Admin Control Panel</h1>
          <p className="text-xs text-slate-500 mt-0.5">Complete website control — users, roles, features, logs, system</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border", config.mode === "saas" ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300")}>
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", config.mode === "saas" ? "bg-blue-400" : "bg-emerald-400")} />
            {config.mode === "saas" ? "SaaS Mode" : "Standalone"}
          </div>
          <button onClick={handleSave} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all", saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white")}>
            {saved ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save</>}
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
        {tabs.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
              tab === t.id ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:text-slate-300")}>
            <Icon size={13} />{t.label}
          </button>
        );})}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

          {/* ══════════════ OVERVIEW ══════════════ */}
          {tab === "overview" && (
            <div className="space-y-5">
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Users",     val: users.length,                                          icon: Users,     color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
                  { label: "Active Users",    val: users.filter(u => u.status === "active").length,       icon: Check,     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                  { label: "Roles Defined",   val: ROLES.length,                                          icon: Shield,    color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
                  { label: "Log Entries",     val: logs.length,                                           icon: FileText,  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
                  { label: "Features Active", val: Object.values(config.features).filter(Boolean).length, icon: Zap,       color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
                  { label: "SaaS Plans",      val: config.saas.plans.filter(p => p.active).length,        icon: CreditCard,color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20" },
                  { label: "Mode",            val: config.mode === "saas" ? "SaaS" : "Standalone",        icon: Globe,     color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20", text: true },
                  { label: "Trial Days",      val: config.saas.trialEnabled ? config.trialDays : "Off",   icon: Lock,      color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20", text: true },
                ].map(s => { const Icon = s.icon; return (
                  <div key={s.label} className={cn("rounded-xl border p-4", s.bg)}>
                    <div className="flex items-center justify-between mb-2">
                      <Icon size={15} className={s.color} />
                      <span className="text-[10px] text-slate-500">{s.label}</span>
                    </div>
                    <p className={cn("text-2xl font-black", s.color)}>{s.val}</p>
                  </div>
                );})}
              </div>

              {/* Role distribution */}
              <Card title="Role Distribution" icon={Shield}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ROLES.map(role => {
                    const count = users.filter(u => u.role === role).length;
                    return (
                      <div key={role} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", roleColors[role] ?? roleColors["Viewer"])}>{role}</span>
                        <span className="text-sm font-bold text-slate-300">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Recent logs */}
              <Card title="Recent Activity" icon={Activity}>
                <div className="space-y-2">
                  {logs.slice(0, 6).map(l => {
                    const { icon: Icon, color } = logTypeIcons[l.type] ?? logTypeIcons.view;
                    return (
                      <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", color.split(" ")[1])}>
                          <Icon size={12} className={color.split(" ")[0]} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 truncate"><span className="font-semibold">{l.userName}</span> — {l.action}</p>
                          <p className="text-[10px] text-slate-600">{l.detail}</p>
                        </div>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">{l.timestamp.split(" ")[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════ USERS ══════════════ */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-200 outline-none focus:border-blue-500/50 placeholder-slate-600" />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
                <button onClick={() => setUserModal({ mode: "create", user: null })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors flex-shrink-0">
                  <Plus size={14} /> Add User
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total", val: users.length, c: "text-white" },
                  { label: "Active", val: users.filter(u => u.status === "active").length, c: "text-emerald-400" },
                  { label: "Inactive", val: users.filter(u => u.status === "inactive").length, c: "text-slate-500" },
                  { label: "Admins", val: users.filter(u => u.role === "Admin").length, c: "text-violet-400" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-center">
                    <p className={`text-2xl font-black ${s.c}`}>{s.val}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                  {["User", "Role", "Status", "Joined", "Actions"].map((h, i) => (
                    <p key={h} className={cn("text-[11px] font-semibold text-slate-500 uppercase tracking-wider", [4,2,2,2,2][i] && `col-span-${[4,2,2,2,2][i]}`, i===4 && "text-right")}>{h}</p>
                  ))}
                </div>
                {users.filter(u => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                  <motion.div key={u.id} layout className="grid grid-cols-12 items-center px-4 py-3 hover:bg-white/[0.03] border-t border-white/[0.04] transition-colors">
                    <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{u.avatar}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <select value={u.role} onChange={e => saveUsersState(users.map(x => x.id === u.id ? { ...x, role: e.target.value } : x))}
                        className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-transparent cursor-pointer outline-none", roleColors[u.role] ?? roleColors["Viewer"])}>
                        {ROLES.map(r => <option key={r} value={r} className="bg-[#0d1424] text-slate-200">{r}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <button onClick={() => saveUsersState(users.map(x => x.id === u.id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x))}
                        className={cn("flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors",
                          u.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", u.status === "active" ? "bg-emerald-400" : "bg-slate-500")} />
                        {u.status === "active" ? "Active" : "Inactive"}
                      </button>
                    </div>
                    <div className="col-span-2"><p className="text-xs text-slate-500">{u.createdAt}</p></div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button title="Edit" onClick={() => setUserModal({ mode: "edit", user: u })} className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.06] hover:border-blue-500/30 transition-colors"><Edit2 size={12} className="text-slate-400" /></button>
                      <button title="Password" onClick={() => setPwModal(u)} className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.06] hover:border-amber-500/30 transition-colors"><Key size={12} className="text-slate-400" /></button>
                      <button title="Delete" onClick={() => setDelConfirm(u.id)} className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"><Trash2 size={12} className="text-rose-400/60 hover:text-rose-400" /></button>
                    </div>
                  </motion.div>
                ))}
                {users.filter(u => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                  <div className="py-10 text-center text-slate-500 text-sm">No users found</div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════ ROLES & PERMISSIONS ══════════════ */}
          {tab === "roles" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Toggle which sections each role can access. Changes apply immediately on next login.</p>
                <button onClick={() => savePermsState(loadPermissions())} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <RefreshCw size={11} /> Reset defaults
                </button>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider sticky left-0 bg-[#0d1424] min-w-[120px]">Section</th>
                      {ROLES.map(r => (
                        <th key={r} className="px-3 py-3 text-center min-w-[80px]">
                          <span className={cn("inline-block px-2 py-0.5 rounded-full border font-semibold text-[10px]", roleColors[r] ?? roleColors["Viewer"])}>{r}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_SECTIONS.map((sec, si) => (
                      <tr key={sec} className={cn("border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors", si % 2 === 0 && "bg-white/[0.01]")}>
                        <td className="px-4 py-2.5 text-slate-300 font-medium sticky left-0 bg-inherit capitalize">{SECTION_LABELS[sec]}</td>
                        {ROLES.map(role => {
                          const allowed = perms[role]?.[sec] ?? false;
                          return (
                            <td key={role} className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => {
                                  const updated = { ...perms, [role]: { ...(perms[role] ?? {}), [sec]: !allowed } };
                                  savePermsState(updated);
                                }}
                                className={cn(
                                  "w-6 h-6 rounded-lg border flex items-center justify-center mx-auto transition-all",
                                  allowed ? "bg-blue-600 border-blue-500 hover:bg-blue-500" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                                )}
                              >
                                {allowed && <Check size={11} className="text-white" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quick presets */}
              <Card title="Quick Presets" icon={Shield}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Full Access",    desc: "All sections on",    action: () => savePermsState(Object.fromEntries(ROLES.map(r => [r, Object.fromEntries(ALL_SECTIONS.map(s => [s, true]))]))) },
                    { label: "Restricted",     desc: "Viewers: dashboard only", action: () => savePermsState({ ...perms, Viewer: Object.fromEntries(ALL_SECTIONS.map(s => [s, s === "dashboard"])) }) },
                    { label: "Sales Only",     desc: "Sales sections on",  action: () => savePermsState({ ...perms, "Sales Rep": Object.fromEntries(ALL_SECTIONS.map(s => [s, ["dashboard","leads","deals","pipeline","tasks"].includes(s)])) }) },
                    { label: "Reset All",      desc: "Back to defaults",   action: () => { savePermissions(loadPermissions()); setPerms(loadPermissions()); } },
                  ].map(p => (
                    <button key={p.label} onClick={p.action}
                      className="text-left p-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
                      <p className="text-xs font-semibold text-slate-200">{p.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════ ACTIVITY LOG ══════════════ */}
          {tab === "logs" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                  <input value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search logs..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 pl-9 text-sm text-slate-200 outline-none focus:border-blue-500/50 placeholder-slate-600" />
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
                <select value={logType} onChange={e => setLogType(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 bg-[#080c14]">
                  <option value="all">All Types</option>
                  {Object.keys(logTypeIcons).map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
                <select value={logUser} onChange={e => setLogUser(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50 bg-[#080c14]">
                  <option value="all">All Users</option>
                  {[...new Set(logs.map(l => l.userName))].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={() => { clearLogs(); setLogs([]); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/20 text-rose-400 text-xs hover:bg-rose-500/10 transition-colors">
                  <Trash2 size={12} /> Clear Logs
                </button>
              </div>

              {/* Log stats */}
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(logTypeIcons).slice(0, 4).map(([type, { icon: Icon, color }]) => (
                  <div key={type} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color.split(" ")[1])}>
                      <Icon size={14} className={color.split(" ")[0]} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{logs.filter(l => l.type === type).length}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{type}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Log table */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <p className="col-span-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</p>
                  <p className="col-span-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">User</p>
                  <p className="col-span-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Role</p>
                  <p className="col-span-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Action</p>
                  <p className="col-span-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Detail</p>
                  <p className="col-span-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Time</p>
                </div>
                <div className="max-h-[480px] overflow-y-auto divide-y divide-white/[0.03]">
                  {filteredLogs.length === 0 && <div className="py-12 text-center text-slate-500 text-sm">No logs found</div>}
                  {filteredLogs.map(l => {
                    const { icon: Icon, color } = logTypeIcons[l.type] ?? logTypeIcons.view;
                    return (
                      <div key={l.id} className="grid grid-cols-12 items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                        <div className="col-span-1">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", color.split(" ")[1])}>
                            <Icon size={11} className={color.split(" ")[0]} />
                          </div>
                        </div>
                        <div className="col-span-2"><p className="text-xs text-slate-300 font-medium truncate">{l.userName}</p></div>
                        <div className="col-span-2">
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", roleColors[l.userRole] ?? roleColors["Viewer"])}>{l.userRole}</span>
                        </div>
                        <div className="col-span-3"><p className="text-xs text-slate-400 truncate">{l.action}</p></div>
                        <div className="col-span-2"><p className="text-[10px] text-slate-600 truncate">{l.detail}</p></div>
                        <div className="col-span-2 text-right"><p className="text-[10px] text-slate-600">{l.timestamp}</p></div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-2 border-t border-white/[0.05] flex items-center justify-between">
                  <p className="text-xs text-slate-600">{filteredLogs.length} entries shown</p>
                  <p className="text-xs text-slate-600">Total: {logs.length} logs stored</p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ FEATURES ══════════════ */}
          {tab === "features" && (
            <div className="space-y-5">
              {/* Mode toggle */}
              <div className="grid md:grid-cols-2 gap-4">
                {(["saas","standalone"] as const).map(m => (
                  <button key={m} onClick={() => setConfig(c => ({ ...c, mode: m }))}
                    className={cn("relative text-left p-5 rounded-xl border-2 transition-all",
                      config.mode === m ? (m === "saas" ? "border-blue-500 bg-blue-500/10" : "border-emerald-500 bg-emerald-500/10") : "border-white/[0.07] bg-white/[0.02] hover:border-white/20")}>
                    {config.mode === m && <div className={cn("absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center", m === "saas" ? "bg-blue-600" : "bg-emerald-600")}><Check size={11} className="text-white" /></div>}
                    {m === "saas" ? <Globe size={18} className="text-blue-400 mb-2" /> : <Server size={18} className="text-emerald-400 mb-2" />}
                    <h4 className="text-sm font-bold text-white">{m === "saas" ? "SaaS Mode" : "Standalone Mode"}</h4>
                    <p className="text-xs text-slate-500 mt-1">{m === "saas" ? "Multi-tenant with subscription plans" : "Self-hosted, all features unlocked"}</p>
                  </button>
                ))}
              </div>

              {/* Feature toggles */}
              <Card title="Module Feature Control" icon={Zap}>
                <p className="text-xs text-slate-500 mb-4">Disabled modules are hidden from all users regardless of role.</p>
                <div className="space-y-1">
                  {([
                    { key: "whatsapp",       label: "WhatsApp CRM",        desc: "Customer conversations & broadcasts" },
                    { key: "emailMarketing", label: "Email Marketing",      desc: "Email campaigns & analytics" },
                    { key: "ai",             label: "AI Insights",          desc: "Revenue intelligence & lead scoring" },
                    { key: "finance",        label: "Finance & Invoicing",  desc: "Invoices, payments, expenses" },
                    { key: "automation",     label: "Workflow Automation",  desc: "Trigger-based automation sequences" },
                    { key: "pipeline",       label: "Sales Pipeline",       desc: "Visual drag-and-drop pipeline" },
                    { key: "reports",        label: "Reports & Analytics",  desc: "Business intelligence reports" },
                  ] as { key: keyof AppConfig["features"]; label: string; desc: string }[]).map(f => (
                    <div key={f.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/[0.05]">
                      <div className="flex items-center gap-3">
                        <span className={cn("w-2 h-2 rounded-full", config.features[f.key] ? "bg-emerald-400" : "bg-slate-600")} />
                        <div>
                          <p className="text-sm text-slate-200">{f.label}</p>
                          <p className="text-xs text-slate-600">{f.desc}</p>
                        </div>
                      </div>
                      <Toggle on={config.features[f.key]} onChange={v => setConfig(c => ({ ...c, features: { ...c.features, [f.key]: v } }))} />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Access settings */}
              <Card title="Access Settings" icon={Lock}>
                <div className="space-y-3">
                  {[
                    { label: "Trial Period", desc: "Days for free trial (SaaS)", field: "trialDays", isToggle: false },
                    { label: "Max Users", desc: "Global user cap (blank = unlimited)", field: "maxUsers", isToggle: false },
                  ].map(s => (
                    <div key={s.field} className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                      <div><p className="text-sm text-slate-200">{s.label}</p><p className="text-xs text-slate-500">{s.desc}</p></div>
                      <input type="number" value={(config as any)[s.field] ?? ""}
                        onChange={e => setConfig(c => ({ ...c, [s.field]: e.target.value ? +e.target.value : null }))}
                        placeholder="∞" className="w-20 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-slate-200 text-center outline-none focus:border-blue-500/50 placeholder-slate-600" />
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2">
                    <div><p className="text-sm text-slate-200">Free Trial Enabled</p><p className="text-xs text-slate-500">Allow trial signups</p></div>
                    <Toggle on={config.saas.trialEnabled} onChange={v => setConfig(c => ({ ...c, saas: { ...c.saas, trialEnabled: v } }))} />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════ PLANS ══════════════ */}
          {tab === "plans" && (
            <div className="space-y-4">
              {config.mode !== "saas" && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <AlertTriangle size={15} className="text-amber-400" />
                  <p className="text-xs text-amber-300">Plans are only active in <strong>SaaS Mode</strong>. Go to Features tab to switch mode.</p>
                </div>
              )}
              <Card title="Subscription Plans" icon={CreditCard}>
                <div className="space-y-3">
                  {config.saas.plans.map(plan => (
                    <div key={plan.id} className={cn("rounded-xl border p-4", plan.highlighted ? "border-blue-500/30 bg-blue-950/20" : "border-white/[0.07] bg-white/[0.02]", !plan.active && "opacity-50")}>
                      {editPlan?.id === plan.id && planForm ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {[["Name","name"],["Monthly ($)","price"],["Annual ($)","annualPrice"],["Max Users","maxUsers"]].map(([lbl,fld]) => (
                              <div key={fld}>
                                <label className="text-[10px] text-slate-500 mb-1 block">{lbl}</label>
                                <input type={fld==="name"?"text":"number"} value={(planForm as any)[fld] ?? ""}
                                  onChange={e => setPlanForm({ ...planForm, [fld]: fld==="name" ? e.target.value : (e.target.value ? +e.target.value : null) } as SaasPlan)}
                                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditPlan(null); setPlanForm(null); }} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={() => { setConfig(c => ({ ...c, saas: { ...c.saas, plans: c.saas.plans.map(p => p.id===planForm!.id ? planForm! : p) } })); setEditPlan(null); setPlanForm(null); }}
                              className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white", plan.id==="starter"?"bg-slate-600":plan.id==="growth"?"bg-blue-600":"bg-violet-600")}>{plan.name[0]}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{plan.name}</p>
                                {plan.highlighted && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Popular</span>}
                              </div>
                              <p className="text-xs text-slate-500">${plan.price}/mo · ${plan.annualPrice}/mo annual · {plan.maxUsers ?? "∞"} users</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Toggle on={plan.active} onChange={v => setConfig(c => ({ ...c, saas: { ...c.saas, plans: c.saas.plans.map(p => p.id===plan.id ? { ...p, active: v } : p) } }))} />
                            <button onClick={() => { setEditPlan(plan); setPlanForm({ ...plan }); }}
                              className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.06] transition-colors"><Edit2 size={12} className="text-slate-400" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Billing Settings" icon={DollarSign}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                    <div><p className="text-sm text-slate-200">Stripe Integration</p><p className="text-xs text-slate-500">Enable live payments</p></div>
                    <Toggle on={config.saas.stripeEnabled} onChange={v => setConfig(c => ({ ...c, saas: { ...c.saas, stripeEnabled: v } }))} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div><p className="text-sm text-slate-200">Free Trial</p><p className="text-xs text-slate-500">{config.trialDays}-day trial for new signups</p></div>
                    <Toggle on={config.saas.trialEnabled} onChange={v => setConfig(c => ({ ...c, saas: { ...c.saas, trialEnabled: v } }))} />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ══════════════ SYSTEM ══════════════ */}
          {tab === "system" && (
            <div className="space-y-5">
              <Card title="System Identity" icon={Settings}>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Company / App Name</label>
                  <input value={config.companyName} onChange={e => setConfig(c => ({ ...c, companyName: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
                </div>
              </Card>
              <Card title="System Info" icon={Activity}>
                <div className="space-y-1">
                  {[
                    ["Mode",          config.mode === "saas" ? "SaaS (Multi-tenant)" : "Standalone (Self-hosted)"],
                    ["Company",       config.companyName],
                    ["Config Updated",new Date(config.updatedAt).toLocaleString()],
                    ["Total Users",   users.length.toString()],
                    ["Active Plans",  `${config.saas.plans.filter(p=>p.active).length} of ${config.saas.plans.length}`],
                    ["Log Entries",   logs.length.toString()],
                  ].map(([k,v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <span className="text-xs text-slate-500">{k}</span>
                      <span className="text-xs text-slate-300 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Danger Zone" icon={AlertTriangle} className="border-rose-500/20">
                <div className="space-y-2">
                  <button onClick={() => { if (confirm("Reset all config to defaults?")) { const def = loadConfig(); saveConfig(def); setConfig(def); }}}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-sm hover:bg-rose-500/10 transition-colors">
                    <RefreshCw size={14} /> Reset Config to Defaults
                  </button>
                  <button onClick={() => { if (confirm("Clear all activity logs?")) { clearLogs(); setLogs([]); }}}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-sm hover:bg-rose-500/10 transition-colors">
                    <Trash2 size={14} /> Clear All Activity Logs
                  </button>
                </div>
              </Card>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {userModal && <UserModal mode={userModal.mode} user={userModal.user} onSave={u => saveUsersState(userModal.mode==="create" ? [...users,u] : users.map(x=>x.id===u.id?u:x))} onClose={() => setUserModal(null)} />}
        {pwModal && <PasswordModal user={pwModal} onSave={(id,pw) => saveUsersState(users.map(u=>u.id===id?{...u,password:pw}:u))} onClose={() => setPwModal(null)} />}
        {delConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setDelConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-rose-500/20 bg-[#0d1424] p-6 text-center" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-rose-400" /></div>
              <h3 className="text-base font-bold text-white mb-2">Delete User?</h3>
              <p className="text-sm text-slate-400 mb-6">{users.find(u=>u.id===delConfirm)?.name} will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDelConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/[0.04]">Cancel</button>
                <button onClick={() => { saveUsersState(users.filter(u=>u.id!==delConfirm)); setDelConfirm(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
