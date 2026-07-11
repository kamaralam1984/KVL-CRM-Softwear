"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Briefcase, CheckSquare, Calendar,
  GitBranch, MessageCircle, Mail, UserCheck, BarChart3,
  Wallet, Zap, Brain, Settings, ChevronLeft, ChevronRight,
  TrendingUp, Sparkles, LogOut, Bell, Shield, Lock, Crown, Megaphone, Search, Share2, MessageSquare, Inbox, Headphones, ShoppingBag, Layout,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { PlanFeatureMap, FeatureKey } from "@/lib/superAdmin";
import { loadWhiteLabel, type WhiteLabelConfig, DEFAULT_WHITE_LABEL } from "@/lib/superAdmin";

const SECTION_TO_FEATURE: Record<string, FeatureKey> = {
  leads: "leads", customers: "customers", deals: "deals",
  pipeline: "pipeline", tasks: "tasks", calendar: "calendar",
  whatsapp: "whatsapp", email: "email", team: "team",
  reports: "reports", finance: "finance", automation: "automation",
  ai: "ai",
};
import { cn } from "@/lib/utils";

const menuSections = [
  {
    label: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "leads", label: "Leads", icon: Users, badge: 12 },
      { id: "customers", label: "Customers", icon: UserCheck },
      { id: "deals", label: "Deals", icon: Briefcase },
      { id: "tasks", label: "Tasks", icon: CheckSquare, badge: 5 },
      { id: "calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Sales",
    items: [
      { id: "pipeline",  label: "Sales Pipeline", icon: GitBranch },
      { id: "whatsapp",  label: "WhatsApp CRM",   icon: MessageCircle, badge: 3 },
      { id: "email",     label: "Email Marketing", icon: Mail },
      { id: "marketing", label: "Marketing Hub",   icon: Megaphone },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "team", label: "Team", icon: Users },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "finance", label: "Finance", icon: Wallet },
      { id: "automation", label: "Automation", icon: Zap },
      { id: "ai",     label: "Smart Insights", icon: Brain  },
      { id: "seo",    label: "SEO Suite",      icon: Search },
      { id: "social", label: "Social Media",   icon: Share2 },
    ],
  },
  {
    label: "System",
    items: [
      { id: "velorachat", label: "KVl Chat", icon: MessageSquare },
      { id: "veloramail", label: "KVl Mail", icon: Inbox },
      { id: "helpdesk",    label: "Helpdesk",     icon: Headphones },
      { id: "commerce",    label: "Commerce",     icon: ShoppingBag },
      { id: "velorapages", label: "KVl Pages", icon: Layout },
      { id: "settings",    label: "Settings",     icon: Settings },
    ],
  },
];

const adminSection      = { id: "admin",      label: "Admin Panel",       icon: Shield };
const superAdminSection = { id: "superadmin", label: "Super Admin",        icon: Crown  };

interface AuthUser { id: string; name: string; email: string; role: string; avatar: string }

interface SidebarProps {
  activeSection: string;
  onSectionChange: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
  effectiveFeatures?: PlanFeatureMap | null;
}

export default function Sidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, user, onLogout, effectiveFeatures }: SidebarProps) {
  const isSuperAdmin = user?.role === "Super Admin";
  const isAdmin      = user?.role === "Admin" || isSuperAdmin;
  const [wl, setWl]  = useState<WhiteLabelConfig>(DEFAULT_WHITE_LABEL);

  useEffect(() => {
    setWl(loadWhiteLabel());
    const handler = () => setWl(loadWhiteLabel());
    window.addEventListener("whitelabel-updated", handler);
    return () => window.removeEventListener("whitelabel-updated", handler);
  }, []);

  function isLocked(sectionId: string): boolean {
    if (isAdmin) return false;
    const fk = SECTION_TO_FEATURE[sectionId];
    if (!fk || !effectiveFeatures) return false;
    return !effectiveFeatures[fk];
  }
  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex-shrink-0 h-full flex flex-col glass border-r z-20"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border-col)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-crm-border">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 glow-animate flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#006B3C,#00843D)", boxShadow: "0 4px 16px rgba(0,132,61,0.4)" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }} transition={{ duration:0.15 }} className="overflow-hidden">
              <p className="text-sm font-black gradient-text whitespace-nowrap">{wl.brandName || "KVl CRM"}</p>
              <p className="text-[10px] text-slate-500 whitespace-nowrap">{wl.tagline || "Premium Sales Suite"}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Workspace Selector */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 my-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-crm-border cursor-pointer hover:border-red-500/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded flex-shrink-0" style={{ background:"linear-gradient(135deg,#DC143C,#FF1744)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">KVl</p>
                <p className="text-[10px] text-slate-500">Premium Workspace</p>
              </div>
              <TrendingUp size={12} className="text-slate-500" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {menuSections.map((section) => (
          <div key={section.label} className="mb-3">
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 pb-1"
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "sidebar-item w-full flex items-center gap-3 px-2.5 py-2 mb-0.5",
                    isActive ? "active" : "",
                    collapsed ? "justify-center" : ""
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    size={17}
                    className="flex-shrink-0 transition-colors"
                    style={{ color: isActive ? "#D4AF37" : undefined }}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "flex-1 text-sm whitespace-nowrap text-left",
                          isActive ? "font-semibold" : "text-slate-400"
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!collapsed && "badge" in item && item.badge && !isLocked(item.id) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:"rgba(212,175,55,0.15)", color:"#D4AF37", border:"1px solid rgba(212,175,55,0.3)" }}>
                      {item.badge}
                    </span>
                  )}
                  {!collapsed && isLocked(item.id) && (
                    <Lock size={11} className="text-slate-700 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Admin Panel — Admin + Super Admin */}
      {isAdmin && (
        <div className="px-3 mb-2">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 pb-1">Admin</p>
          )}
          {(() => {
            const Icon = adminSection.icon;
            const isActive = activeSection === adminSection.id;
            return (
              <button
                onClick={() => onSectionChange(adminSection.id)}
                className={cn(
                  "sidebar-item w-full flex items-center gap-3 px-2.5 py-2",
                  isActive ? "active" : "",
                  collapsed ? "justify-center" : ""
                )}
                title={collapsed ? adminSection.label : undefined}
              >
                <Icon size={17} className="flex-shrink-0 transition-colors" style={{ color: isActive ? "#D4AF37" : undefined }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}
                      className={cn("flex-1 text-sm whitespace-nowrap text-left", !isActive && "text-slate-400")}
                      style={{ color: isActive ? "#D4AF37" : undefined, fontWeight: isActive ? 600 : undefined }}
                    >
                      {adminSection.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })()}
        </div>
      )}

      {/* Super Admin — only for Super Admin role */}
      {isSuperAdmin && (
        <div className="px-3 mb-2">
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pb-1" style={{ color:"rgba(212,175,55,0.5)" }}>Super Admin</p>
          )}
          {(() => {
            const Icon = superAdminSection.icon;
            const isActive = activeSection === superAdminSection.id;
            return (
              <button
                onClick={() => onSectionChange(superAdminSection.id)}
                className={cn(
                  "sidebar-item w-full flex items-center gap-3 px-2.5 py-2",
                  isActive ? "active" : "",
                  collapsed ? "justify-center" : ""
                )}
                title={collapsed ? superAdminSection.label : undefined}
                style={!isActive ? { borderColor:"rgba(212,175,55,0.15)" } : undefined}
              >
                <Icon size={17} className="flex-shrink-0" style={{ color: isActive ? "#D4AF37" : "rgba(212,175,55,0.6)" }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }} transition={{ duration:0.15 }}
                      className="flex-1 text-sm whitespace-nowrap text-left font-semibold"
                      style={{ color: isActive ? "#D4AF37" : "rgba(212,175,55,0.7)" }}
                    >
                      {superAdminSection.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })()}
        </div>
      )}

      {/* User Profile */}
      <div className="border-t border-crm-border p-3 space-y-1">
        <div className={cn("flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors", collapsed ? "justify-center" : "")}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background:"linear-gradient(135deg,#006B3C,#00843D)" }}>
            {user?.avatar ?? "U"}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.name ?? "User"}</p>
                <p className="text-[10px] text-slate-500">{user?.role ?? "Member"} · Pro</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all",
              collapsed ? "justify-center" : ""
            )}
          >
            <LogOut size={13} className="flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full glass border flex items-center justify-center hover:border-red-500/40 transition-colors z-30"
        style={{ background: "var(--surface, #0d1424)", borderColor: "var(--border-col)" }}
      >
        {collapsed ? <ChevronRight size={12} className="text-slate-400" /> : <ChevronLeft size={12} className="text-slate-400" />}
      </button>
    </motion.aside>
  );
}
