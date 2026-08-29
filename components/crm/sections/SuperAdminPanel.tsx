"use client";
import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Users, LayoutGrid, Shield, Settings, Save, Check,
  ChevronDown, ChevronUp, Search, RefreshCw, Zap,
  Globe, AlertTriangle, Edit2,
  Star, BarChart3, X, Info, Palette, Building2,
  Mail, Phone, MapPin, Link, Type, FileText,
  Layers, Plus, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadSAConfig, saveSAConfig,
  type SuperAdminConfig, type PlanId, type FeatureKey,
  ALL_FEATURES, FEATURE_LABELS, PLAN_LABELS, PLAN_PRICES,
  PLAN_COLORS, PLAN_ORDER, DEFAULT_PLAN_MATRIX,
  getEffectiveFeatures, countEnabledFeatures,
  loadWhiteLabel, saveWhiteLabel, type WhiteLabelConfig, DEFAULT_WHITE_LABEL,
} from "@/lib/superAdmin";
import PricingManager from "@/components/crm/sections/PricingManager";
import { loadUsers, type ManagedUser } from "@/lib/appConfig";
import Modal from "@/components/ui/modal";
import { getTenants, saveTenant, deleteTenant } from "@/lib/whitelabel/store";
import type { Tenant } from "@/lib/whitelabel/types";

/* ── small helpers ── */
function Toggle({ on, onChange, color = "#3b82f6" }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? color : "rgba(255,255,255,0.08)" }}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
      />
    </button>
  );
}

function PlanBadge({ planId, onClick }: { planId: PlanId; onClick?: () => void }) {
  const c = PLAN_COLORS[planId];
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all hover:opacity-80"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {PLAN_LABELS[planId]}
      {onClick && <ChevronDown size={10} />}
    </button>
  );
}

function Card({ title, icon: Icon, children, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5", className)}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Icon size={14} className="text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── feature categories for grouping ── */
const FEATURE_GROUPS: { label: string; keys: FeatureKey[] }[] = [
  { label: "Core CRM",      keys: ["dashboard","leads","customers","deals","pipeline","tasks","calendar"] },
  { label: "Communication", keys: ["whatsapp","email"] },
  { label: "Management",    keys: ["team","settings"] },
  { label: "Intelligence",  keys: ["reports","finance","automation","ai"] },
];

/* ═══════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════ */
const TABS = [
  { id: "overview",    label: "Overview",      icon: LayoutGrid },
  { id: "clients",     label: "Clients",       icon: Users },
  { id: "matrix",      label: "Plan Matrix",   icon: BarChart3 },
  { id: "pricing",     label: "Pricing",       icon: Star },
  { id: "whitelabel",  label: "White Label",   icon: Palette },
  { id: "tenants",     label: "Workspaces",    icon: Layers },
  { id: "system",      label: "System",        icon: Settings },
] as const;
type TabId = typeof TABS[number]["id"];

/* ── Tenants (multi-workspace) form shape ── */
type TenantFormState = {
  slug: string;
  brandName: string;
  tagline: string;
  domain: string;
  supportEmail: string;
  plan: string;
  primaryColor: string;
};
const emptyTenantForm: TenantFormState = {
  slug: "", brandName: "", tagline: "", domain: "", supportEmail: "", plan: "", primaryColor: "",
};
const tenantInputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors";

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function SuperAdminPanel() {
  const [tab,     setTab]     = useState<TabId>("overview");
  const [cfg,     setCfg]     = useState<SuperAdminConfig>(loadSAConfig());
  const [wl,      setWl]      = useState<WhiteLabelConfig>(loadWhiteLabel());
  const [users,   setUsers]   = useState<ManagedUser[]>([]);
  const [saved,   setSaved]   = useState(false);
  const [search,  setSearch]  = useState("");
  const [planFilter, setPlanFilter] = useState<PlanId | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantForm, setTenantForm] = useState<TenantFormState>(emptyTenantForm);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  useEffect(() => {
    setCfg(loadSAConfig());
    setWl(loadWhiteLabel());
    setUsers(loadUsers());
    setTenants(getTenants());
  }, []);

  const handleSave = () => {
    saveSAConfig(cfg);
    saveWhiteLabel(wl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── stat helpers ── */
  const allUsers = users;
  const planCounts = PLAN_ORDER.reduce((acc, p) => {
    acc[p] = Object.values(cfg.userPlans).filter(u => u.planId === p).length;
    return acc;
  }, {} as Record<PlanId, number>);
  const totalEnabled = Object.values(cfg.planMatrix.growth).filter(Boolean).length;

  /* ── client helpers ── */
  const filteredUsers = allUsers.filter(u => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "all" ||
      (cfg.userPlans[u.id]?.planId ?? "starter") === planFilter;
    return matchSearch && matchPlan;
  });

  function setUserPlan(userId: string, planId: PlanId) {
    setCfg(c => ({
      ...c,
      userPlans: {
        ...c.userPlans,
        [userId]: {
          ...(c.userPlans[userId] ?? { userId, featureOverrides: {}, assignedAt: new Date().toISOString().split("T")[0], notes: "" }),
          planId,
        },
      },
    }));
    setEditingPlan(null);
  }

  function toggleUserFeatureOverride(userId: string, feature: FeatureKey) {
    const planId  = cfg.userPlans[userId]?.planId ?? "starter";
    const planVal = cfg.planMatrix[planId][feature];
    const overrides = cfg.userPlans[userId]?.featureOverrides ?? {};
    const hasOverride = feature in overrides;
    let newOverrides: Partial<Record<FeatureKey, boolean>>;

    if (hasOverride) {
      // remove override → revert to plan default
      const { [feature]: _, ...rest } = overrides;
      newOverrides = rest;
    } else {
      // add override (flip from plan default)
      newOverrides = { ...overrides, [feature]: !planVal };
    }

    setCfg(c => ({
      ...c,
      userPlans: {
        ...c.userPlans,
        [userId]: { ...c.userPlans[userId], featureOverrides: newOverrides },
      },
    }));
  }

  function resetOverrides(userId: string) {
    setCfg(c => ({
      ...c,
      userPlans: {
        ...c.userPlans,
        [userId]: { ...c.userPlans[userId], featureOverrides: {} },
      },
    }));
  }

  function togglePlanFeature(planId: PlanId, feature: FeatureKey) {
    setCfg(c => ({
      ...c,
      planMatrix: {
        ...c.planMatrix,
        [planId]: { ...c.planMatrix[planId], [feature]: !c.planMatrix[planId][feature] },
      },
    }));
  }

  /* ── tenant (workspace) helpers ── */
  function refreshTenants() {
    setTenants(getTenants());
  }

  function openAddTenant() {
    setEditingTenantId(null);
    setTenantForm(emptyTenantForm);
    setShowTenantModal(true);
  }

  function openEditTenant(t: Tenant) {
    setEditingTenantId(t.id);
    setTenantForm({
      slug: t.slug,
      brandName: t.brandName,
      tagline: t.tagline ?? "",
      domain: t.domain ?? "",
      supportEmail: t.supportEmail ?? "",
      plan: t.plan ?? "",
      primaryColor: t.primaryColor ?? "",
    });
    setShowTenantModal(true);
  }

  function closeTenantModal() {
    setShowTenantModal(false);
    setTenantForm(emptyTenantForm);
    setEditingTenantId(null);
  }

  const setTenantField = (k: keyof TenantFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setTenantForm(f => ({ ...f, [k]: e.target.value }));

  function saveTenantForm() {
    if (!tenantForm.slug.trim() || !tenantForm.brandName.trim()) return;
    const existing = editingTenantId ? tenants.find(t => t.id === editingTenantId) : undefined;
    const tenant: Tenant = {
      id: editingTenantId ?? `t_${Date.now()}_${tenantForm.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      slug: tenantForm.slug.trim(),
      brandName: tenantForm.brandName.trim(),
      tagline: tenantForm.tagline.trim() || undefined,
      domain: tenantForm.domain.trim() || undefined,
      supportEmail: tenantForm.supportEmail.trim() || undefined,
      plan: tenantForm.plan.trim() || undefined,
      primaryColor: tenantForm.primaryColor.trim() || undefined,
      active: existing?.active ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    saveTenant(tenant);
    refreshTenants();
    closeTenantModal();
  }

  function removeTenant(t: Tenant) {
    if (t.id === "default") return;
    if (!window.confirm(`Delete tenant "${t.brandName}"? This cannot be undone.`)) return;
    deleteTenant(t.id);
    refreshTenants();
  }

  function toggleTenantActive(t: Tenant) {
    saveTenant({ ...t, active: !t.active });
    refreshTenants();
  }

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="p-5 max-w-6xl mx-auto space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.05))", border: "1px solid rgba(212,175,55,0.3)" }}>
            <Crown size={18} style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-2">
              Super Admin Panel
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
                SUPER ADMIN
              </span>
            </h1>
            <p className="text-xs text-slate-500">Platform-level control — plans, features, clients</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-black"
          style={{ background: saved ? "linear-gradient(135deg,#00843D,#00A86B)" : "linear-gradient(135deg,#D4AF37,#F5C842)" }}
        >
          {saved ? <Check size={15} /> : <Save size={15} />}
          {saved ? "Saved!" : "Save Changes"}
        </motion.button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06] bg-white/[0.02] w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                tab === t.id
                  ? "text-white bg-white/[0.08] shadow"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════ OVERVIEW ══════════════ */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Clients", val: allUsers.length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              { label: "Active Plans",  val: Object.keys(cfg.userPlans).length, icon: Star, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
              { label: "Modules Active", val: `${totalEnabled}/${ALL_FEATURES.length}`, icon: Zap, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
              { label: "System Status", val: cfg.globalEnabled ? "Online" : "Offline", icon: Globe, color: cfg.globalEnabled ? "text-emerald-400" : "text-red-400", bg: cfg.globalEnabled ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20", text: true },
            ].map(s => { const Icon = s.icon; return (
              <div key={s.label} className={cn("rounded-xl border p-4", s.bg)}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className={s.color} />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
                </div>
                <p className={cn("text-xl font-black", s.color)}>{s.val}</p>
              </div>
            ); })}
          </div>

          {/* Plan distribution */}
          <Card title="Plan Distribution" icon={BarChart3}>
            <div className="space-y-3">
              {PLAN_ORDER.map(planId => {
                const count = planCounts[planId] ?? 0;
                const pct   = allUsers.length > 0 ? Math.round((count / Math.max(allUsers.length, 1)) * 100) : 0;
                const c     = PLAN_COLORS[planId];
                return (
                  <div key={planId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-300">{PLAN_LABELS[planId]}</span>
                        <span className="text-[10px] text-slate-600">{PLAN_PRICES[planId]}</span>
                      </div>
                      <span className="text-xs text-slate-400">{count} client{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: c.text }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Feature matrix summary */}
          <Card title="Plan Feature Summary" icon={Shield}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-3 py-2 text-slate-500 font-semibold">Module</th>
                    {PLAN_ORDER.map(p => (
                      <th key={p} className="px-3 py-2 text-center min-w-[70px]">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border"
                          style={{ background: PLAN_COLORS[p].bg, color: PLAN_COLORS[p].text, borderColor: PLAN_COLORS[p].border }}>
                          {PLAN_LABELS[p]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_FEATURES.map((f, fi) => (
                    <tr key={f} className={cn("border-t border-white/[0.04] hover:bg-white/[0.02]", fi % 2 === 0 && "bg-white/[0.01]")}>
                      <td className="px-3 py-2 text-slate-300">{FEATURE_LABELS[f]}</td>
                      {PLAN_ORDER.map(p => (
                        <td key={p} className="px-3 py-2 text-center">
                          {cfg.planMatrix[p][f]
                            ? <Check size={13} className="inline text-emerald-400" />
                            : <X size={11} className="inline text-slate-700" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ CLIENTS ══════════════ */}
      {tab === "clients" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl text-xs text-slate-200 outline-none placeholder-slate-600 focus:border-violet-500/40"
              />
            </div>
            <div className="flex gap-1">
              {(["all", ...PLAN_ORDER] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPlanFilter(p as PlanId | "all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
                    planFilter === p
                      ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                      : "text-slate-500 border-transparent hover:text-slate-300",
                  )}
                >
                  {p === "all" ? "All" : PLAN_LABELS[p as PlanId]}
                </button>
              ))}
            </div>
          </div>

          {/* Client table */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Client</th>
                  <th className="px-4 py-3 text-slate-500 font-semibold text-center">Plan</th>
                  <th className="px-4 py-3 text-slate-500 font-semibold text-center hidden md:table-cell">Features</th>
                  <th className="px-4 py-3 text-slate-500 font-semibold text-center hidden md:table-cell">Overrides</th>
                  <th className="px-4 py-3 text-slate-500 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 text-slate-500 font-semibold text-center">Expand</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, ui) => {
                  const isExpanded   = expanded === u.id;
                  const planId       = cfg.userPlans[u.id]?.planId ?? "starter";
                  const effFeatures  = getEffectiveFeatures(u.id, cfg);
                  const enabledCount = countEnabledFeatures(effFeatures);
                  const overrides    = cfg.userPlans[u.id]?.featureOverrides ?? {};
                  const overrideCount = Object.keys(overrides).length;
                  const isEditingThisPlan = editingPlan === u.id;

                  return (
                    <Fragment key={u.id}>
                      <tr
                        className={cn(
                          "border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors",
                          ui % 2 === 0 && "bg-white/[0.01]",
                          isExpanded && "bg-white/[0.04]",
                        )}
                      >
                        {/* Client */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black text-black flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)" }}>
                              {u.avatar}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-200">{u.name}</p>
                              <p className="text-slate-600 text-[10px]">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Plan badge + dropdown */}
                        <td className="px-4 py-3 text-center">
                          <div className="relative inline-block">
                            <PlanBadge planId={planId} onClick={() => setEditingPlan(isEditingThisPlan ? null : u.id)} />
                            <AnimatePresence>
                              {isEditingThisPlan && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1.5 w-36 rounded-xl border border-white/[0.1] bg-[#0d1424] shadow-2xl overflow-hidden"
                                >
                                  {PLAN_ORDER.map(p => (
                                    <button
                                      key={p}
                                      onClick={() => setUserPlan(u.id, p)}
                                      className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold hover:bg-white/[0.05] transition-colors",
                                        p === planId ? "bg-white/[0.04]" : "",
                                      )}
                                      style={{ color: PLAN_COLORS[p].text }}
                                    >
                                      {PLAN_LABELS[p]}
                                      {p === planId && <Check size={10} />}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>

                        {/* Features count */}
                        <td className="px-4 py-3 text-center text-slate-400 hidden md:table-cell">
                          <span className="font-bold text-slate-200">{enabledCount}</span>/{ALL_FEATURES.length}
                        </td>

                        {/* Overrides */}
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {overrideCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {overrideCount} override{overrideCount > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            u.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20",
                          )}>
                            {u.status}
                          </span>
                        </td>

                        {/* Expand */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpanded(isExpanded ? null : u.id)}
                            className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mx-auto hover:bg-white/[0.06] transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-500" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded: feature overrides */}
                      {isExpanded && (
                        <tr key={`${u.id}-exp`}>
                          <td colSpan={6} className="px-4 pb-4 pt-2 bg-white/[0.02] border-t border-white/[0.04]">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                                <Edit2 size={11} className="text-amber-400" />
                                Feature Access for <span className="text-amber-400">{u.name}</span>
                                <span className="text-slate-600 font-normal ml-1">
                                  (Plan defaults shown — gold = override)
                                </span>
                              </p>
                              <button
                                onClick={() => resetOverrides(u.id)}
                                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                <RefreshCw size={10} /> Reset overrides
                              </button>
                            </div>
                            {FEATURE_GROUPS.map(group => (
                              <div key={group.label} className="mb-3">
                                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">{group.label}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {group.keys.map(fk => {
                                    const planVal   = cfg.planMatrix[planId][fk];
                                    const overrideVal = (overrides as Record<string,boolean>)[fk];
                                    const hasOverride = fk in overrides;
                                    const effectiveVal = hasOverride ? overrideVal : planVal;

                                    return (
                                      <motion.button
                                        key={fk}
                                        whileHover={{ scale: 1.02 }}
                                        onClick={() => toggleUserFeatureOverride(u.id, fk)}
                                        className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-medium transition-all border"
                                        style={{
                                          background: effectiveVal
                                            ? hasOverride ? "rgba(212,175,55,0.08)" : "rgba(16,185,129,0.06)"
                                            : "rgba(255,255,255,0.02)",
                                          borderColor: effectiveVal
                                            ? hasOverride ? "rgba(212,175,55,0.3)" : "rgba(16,185,129,0.2)"
                                            : "rgba(255,255,255,0.06)",
                                          color: effectiveVal
                                            ? hasOverride ? "#D4AF37" : "#34d399"
                                            : "#475569",
                                        }}
                                      >
                                        {FEATURE_LABELS[fk]}
                                        <div className={cn(
                                          "w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 ml-1",
                                          effectiveVal
                                            ? hasOverride ? "bg-amber-500/20" : "bg-emerald-500/20"
                                            : "bg-white/[0.04]",
                                        )}>
                                          {effectiveVal
                                            ? <Check size={9} style={{ color: hasOverride ? "#D4AF37" : "#34d399" }} />
                                            : <X size={9} className="text-slate-700" />}
                                        </div>
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-10 text-slate-600 text-sm">No clients match the filter.</div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ PLAN MATRIX ══════════════ */}
      {tab === "matrix" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/05 border border-amber-500/20">
            <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              Changes here affect <strong>all users on that plan</strong> (unless they have a per-user override on the Clients tab).
              Click a cell to toggle a feature for a plan. Press <strong>Save Changes</strong> to persist.
            </p>
          </div>

          <Card title="Feature × Plan Toggle Matrix" icon={LayoutGrid}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold sticky left-0 bg-[#0d1424] min-w-[160px]">Module</th>
                    {PLAN_ORDER.map(p => (
                      <th key={p} className="px-4 py-3 text-center min-w-[100px]">
                        <div>
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black border"
                            style={{ background: PLAN_COLORS[p].bg, color: PLAN_COLORS[p].text, borderColor: PLAN_COLORS[p].border }}>
                            {PLAN_LABELS[p]}
                          </span>
                          <p className="text-slate-600 text-[10px] mt-0.5">{PLAN_PRICES[p]}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_GROUPS.map(group => (
                    <Fragment key={group.label}>
                      <tr>
                        <td colSpan={5} className="px-4 pt-4 pb-1">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">{group.label}</p>
                        </td>
                      </tr>
                      {group.keys.map((fk, fi) => (
                        <tr key={fk} className={cn("hover:bg-white/[0.02] transition-colors", fi % 2 === 0 && "bg-white/[0.01]")}>
                          <td className="px-4 py-2.5 text-slate-300 sticky left-0 bg-inherit">{FEATURE_LABELS[fk]}</td>
                          {PLAN_ORDER.map(p => {
                            const on = cfg.planMatrix[p][fk];
                            return (
                              <td key={p} className="px-4 py-2.5 text-center">
                                <Toggle
                                  on={on}
                                  onChange={() => togglePlanFeature(p, fk)}
                                  color={PLAN_COLORS[p].text}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ PRICING ══════════════ */}
      {tab === "pricing" && <PricingManager />}

      {/* ══════════════ WHITE LABEL ══════════════ */}
      {tab === "whitelabel" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-start gap-3">
            <Palette size={15} className="text-violet-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-violet-300">
              Yahan se website ka brand customize karein. Save Changes dabao — sidebar, title, aur footer turant update ho jayega.
            </p>
          </div>

          {/* Brand Identity */}
          <Card title="Brand Identity" icon={Building2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "brandName",  label: "Brand Name",  icon: Type,     placeholder: "Maxness" },
                { key: "tagline",    label: "Tagline",     icon: Type,     placeholder: "Premium Sales Suite" },
                { key: "logoUrl",    label: "Logo URL",    icon: Link,     placeholder: "https://..." },
                { key: "website",    label: "Website",     icon: Globe,    placeholder: "kvlcrm.com" },
              ].map(f => (
                <div key={f.key}>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-medium">
                    <f.icon size={11} /> {f.label}
                  </label>
                  <input
                    value={wl[f.key as keyof WhiteLabelConfig]}
                    onChange={e => setWl(w => ({ ...w, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Contact Info */}
          <Card title="Contact & Address" icon={MapPin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "supportEmail", label: "Support Email", icon: Mail,  placeholder: "support@kvlcrm.com" },
                { key: "salesEmail",   label: "Sales Email",   icon: Mail,  placeholder: "sales@kvlcrm.com" },
                { key: "phone",        label: "Phone",         icon: Phone, placeholder: "+91 98765 43210" },
                { key: "address",      label: "Address",       icon: MapPin, placeholder: "123 Business Park, City, Country" },
              ].map(f => (
                <div key={f.key}>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-medium">
                    <f.icon size={11} /> {f.label}
                  </label>
                  <input
                    value={wl[f.key as keyof WhiteLabelConfig]}
                    onChange={e => setWl(w => ({ ...w, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Footer */}
          <Card title="Footer Text" icon={FileText}>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Footer copyright line</label>
            <input
              value={wl.footerText}
              onChange={e => setWl(w => ({ ...w, footerText: e.target.value }))}
              placeholder="© 2025 Maxness · FreedomWithAI. All rights reserved."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </Card>

          {/* Preview */}
          <Card title="Live Preview" icon={Palette}>
            <div className="rounded-xl border border-white/[0.08] bg-[#0a0f1a] p-4 space-y-3">
              <div className="flex items-center gap-2">
                {wl.logoUrl ? (
                  <img src={wl.logoUrl} alt="logo" className="w-7 h-7 rounded-lg object-cover" onError={e => (e.currentTarget.style.display="none")} />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white font-black text-xs">
                    {(wl.brandName || "K").charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-white">{wl.brandName || "Maxness"}</p>
                  <p className="text-[10px] text-slate-500">{wl.tagline || "Premium Sales Suite"}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5 pt-2 border-t border-white/[0.05]">
                {wl.supportEmail && <p>✉ {wl.supportEmail}</p>}
                {wl.phone        && <p>📞 {wl.phone}</p>}
                {wl.address      && <p>📍 {wl.address}</p>}
                {wl.website      && <p>🌐 {wl.website}</p>}
              </div>
              <p className="text-[10px] text-slate-600 pt-2 border-t border-white/[0.05]">{wl.footerText}</p>
            </div>
          </Card>

          {/* Reset */}
          <button
            onClick={() => setWl(DEFAULT_WHITE_LABEL)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={11} /> Default par reset karein
          </button>
        </div>
      )}

      {/* ══════════════ TENANTS / WORKSPACES ══════════════ */}
      {tab === "tenants" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/05 border border-violet-500/20 flex-1 min-w-[240px]">
              <Info size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-violet-300">
                Manage multiple branded workspaces (tenants) running under this CRM instance. The <strong>Default</strong> workspace mirrors the global White Label config and cannot be deleted.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={openAddTenant}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white gradient-bg flex-shrink-0"
            >
              <Plus size={14} /> Add Tenant
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tenants.map(t => {
              const isDefault = t.id === "default";
              return (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-2xl border p-4",
                    isDefault ? "border-amber-500/25 bg-amber-500/[0.03]" : "border-white/[0.07] bg-white/[0.025]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: t.primaryColor || "linear-gradient(135deg,#7c3aed,#a78bfa)" }}
                      >
                        {(t.brandName || t.slug || "T").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate flex items-center gap-1.5">
                          {t.brandName}
                          {isDefault && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              DEFAULT
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">/{t.slug}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0",
                        t.active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20",
                      )}
                    >
                      {t.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500 mb-3">
                    {t.domain && (
                      <p className="flex items-center gap-1.5"><Globe size={10} /> {t.domain}</p>
                    )}
                    {t.supportEmail && (
                      <p className="flex items-center gap-1.5"><Mail size={10} /> {t.supportEmail}</p>
                    )}
                    {t.plan && (
                      <p className="flex items-center gap-1.5"><Star size={10} /> {t.plan}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                    <Toggle on={t.active} onChange={() => toggleTenantActive(t)} color="#00843D" />
                    <span className="text-[10px] text-slate-500 flex-1">{t.active ? "Enabled" : "Disabled"}</span>
                    <button
                      onClick={() => openEditTenant(t)}
                      className="w-7 h-7 rounded-lg bg-slate-500/15 border border-slate-500/20 flex items-center justify-center hover:bg-slate-500/25 transition-colors"
                    >
                      <Edit2 size={11} className="text-slate-400" />
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => removeTenant(t)}
                        className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/25 transition-colors"
                      >
                        <Trash2 size={11} className="text-rose-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {tenants.length === 0 && (
            <div className="text-center py-10 text-slate-600 text-sm">No tenants yet.</div>
          )}
        </div>
      )}

      {/* ══════════════ SYSTEM ══════════════ */}
      {tab === "system" && (
        <div className="space-y-4">
          <Card title="Platform Controls" icon={Globe}>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div>
                  <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", cfg.globalEnabled ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
                    Global Platform
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Master switch — disabling this blocks all logins</p>
                </div>
                <Toggle on={cfg.globalEnabled} onChange={v => setCfg(c => ({ ...c, globalEnabled: v }))} color="#00843D" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div>
                  <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    Maintenance Mode
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Shows maintenance page to all non-super-admin users</p>
                </div>
                <Toggle on={cfg.maintenanceMode} onChange={v => setCfg(c => ({ ...c, maintenanceMode: v }))} color="#f59e0b" />
              </div>
            </div>
          </Card>

          <Card title="Super Admin Credentials" icon={Shield}>
            <div className="space-y-2 text-xs">
              {[
                { label: "Login Email",    val: "kamaralam137@gmail.com" },
                { label: "Password",       val: "••••••••••" },
                { label: "Role",           val: "Super Admin" },
                { label: "Plan",           val: "Enterprise (all features)" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="text-slate-200 font-mono font-semibold">{r.val}</span>
                </div>
              ))}
              <p className="text-[10px] text-slate-600 pt-1">
                Passwords are hidden for security. Manage them from the Users tab in the Admin Panel.
              </p>
            </div>
          </Card>

          <Card title="Client Accounts" icon={Users}>
            <div className="space-y-2 text-xs">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                  <span className="font-mono text-slate-400">{u.email}</span>
                  <span className="font-bold text-slate-300">{PLAN_LABELS[cfg.userPlans[u.id]?.planId ?? "starter"]}</span>
                </div>
              ))}
              {allUsers.length === 0 && (
                <p className="text-slate-600 py-2">No client accounts yet.</p>
              )}
            </div>
          </Card>

          {cfg.maintenanceMode && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300">
                <strong>Maintenance mode is ON.</strong> All non-super-admin users see a maintenance screen. Remember to save and turn it off when done.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Tenant modal ── */}
      <Modal
        open={showTenantModal}
        onClose={closeTenantModal}
        title={editingTenantId ? "Edit Tenant" : "Add Tenant"}
        wide
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Slug *</label>
              <input className={tenantInputCls} placeholder="acme-co" value={tenantForm.slug} onChange={setTenantField("slug")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Brand Name *</label>
              <input className={tenantInputCls} placeholder="Acme Co" value={tenantForm.brandName} onChange={setTenantField("brandName")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Tagline</label>
              <input className={tenantInputCls} placeholder="Premium Sales Suite" value={tenantForm.tagline} onChange={setTenantField("tagline")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Domain</label>
              <input className={tenantInputCls} placeholder="acme.kvlcrm.com" value={tenantForm.domain} onChange={setTenantField("domain")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Support Email</label>
              <input className={tenantInputCls} placeholder="support@acme.com" type="email" value={tenantForm.supportEmail} onChange={setTenantField("supportEmail")} />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Plan</label>
              <input className={tenantInputCls} placeholder="growth" value={tenantForm.plan} onChange={setTenantField("plan")} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 mb-1 block">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(tenantForm.primaryColor) ? tenantForm.primaryColor : "#7c3aed"}
                onChange={setTenantField("primaryColor")}
                className="w-9 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer flex-shrink-0"
              />
              <input className={tenantInputCls} placeholder="#7c3aed" value={tenantForm.primaryColor} onChange={setTenantField("primaryColor")} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={closeTenantModal}
              className="flex-1 py-2 rounded-xl border border-white/[0.08] text-xs text-slate-400 hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveTenantForm}
              disabled={!tenantForm.slug.trim() || !tenantForm.brandName.trim()}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-black disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)" }}
            >
              {editingTenantId ? "Save Changes" : "Add Tenant"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
