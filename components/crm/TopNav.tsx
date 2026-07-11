"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Sparkles, ChevronDown, Sun, Moon, Command, X, LogOut, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

const sectionTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Overview & Analytics" },
  leads: { title: "Lead Management", subtitle: "Track & convert your leads" },
  customers: { title: "Customers", subtitle: "Manage customer relationships" },
  deals: { title: "Deals", subtitle: "Track your deals & opportunities" },
  tasks: { title: "Tasks", subtitle: "Manage your workflow" },
  calendar: { title: "Calendar", subtitle: "Schedule & appointments" },
  pipeline: { title: "Sales Pipeline", subtitle: "Visual deal management" },
  whatsapp: { title: "WhatsApp CRM", subtitle: "Customer conversations" },
  email: { title: "Email Marketing", subtitle: "Campaigns & analytics" },
  team: { title: "Team", subtitle: "Manage your sales team" },
  reports: { title: "Reports & Analytics", subtitle: "Business intelligence" },
  finance: { title: "Finance", subtitle: "Revenue & invoicing" },
  automation: { title: "Automation", subtitle: "Workflow automation" },
  ai: { title: "AI Insights", subtitle: "Intelligent recommendations" },
  settings: { title: "Settings", subtitle: "Configure your workspace" },
};

interface AuthUser { name: string; email: string; role: string; avatar: string }

interface TopNavProps {
  activeSection: string;
  onToggleAI: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
}

export default function TopNav({ activeSection, onToggleAI, darkMode, onToggleDark, user, onLogout }: TopNavProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const info = sectionTitles[activeSection] || { title: activeSection, subtitle: "" };

  const notifications = [
    { id: 1, text: "Deal closed: SkyNet Robotics — $520K", time: "5m ago", dot: "bg-emerald-500" },
    { id: 2, text: "New lead from HealthTech AI", time: "18m ago", dot: "bg-blue-500" },
    { id: 3, text: "Invoice INV-2025-005 is overdue", time: "1h ago", dot: "bg-rose-500" },
    { id: 4, text: "Task due: RetailPro contract", time: "2h ago", dot: "bg-amber-500" },
  ];

  return (
    <header className="h-14 flex items-center gap-4 px-5 border-b flex-shrink-0" style={{ background: "var(--nav-bg)", borderColor: "var(--border-col)" }}>
      {/* Page Title */}
      <div className="min-w-0 flex-shrink-0">
        <h1 className="text-sm font-semibold text-slate-100 leading-tight">{info.title}</h1>
        <p className="text-[11px] text-slate-500 leading-tight">{info.subtitle}</p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <motion.div
        animate={{ width: searchFocused ? 280 : 200 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative flex items-center gap-2 px-3 h-8 rounded-lg border transition-colors",
          searchFocused ? "border-blue-500/50 bg-white/[0.06]" : "border-crm-border bg-white/[0.03]"
        )}
      >
        <Search size={13} className="text-slate-500 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search or press ⌘K..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchFocused(false); } }}
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none"
        />
        {searchFocused && (
          <div className="flex items-center gap-1 text-[10px] text-slate-600 border border-crm-border rounded px-1">
            <Command size={9} />K
          </div>
        )}
      </motion.div>

      {/* Notification */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center border border-crm-border bg-white/[0.03] hover:bg-white/[0.06] hover:border-blue-500/30 transition-all"
        >
          <Bell size={15} className="text-slate-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
        </button>
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 w-80 glass-card rounded-xl border z-50 overflow-hidden"
              style={{ borderColor: "var(--border-col)" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-crm-border">
                <p className="text-sm font-semibold text-slate-200">Notifications</p>
                <button onClick={() => setShowNotifications(false)}>
                  <X size={14} className="text-slate-500 hover:text-slate-300" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer border-b border-crm-border/50 last:border-0">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", n.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300">{n.text}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 text-center">
                <button className="text-xs text-blue-400 hover:text-blue-300">View all notifications</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assistant Button */}
      <button
        onClick={onToggleAI}
        className="flex items-center gap-2 px-3 h-8 rounded-lg text-white text-xs font-bold hover:opacity-90 transition-all"
        style={{ background:"linear-gradient(135deg,#D4AF37,#F5C842)", boxShadow:"0 2px 12px rgba(212,175,55,0.4)" }}
      >
        <Sparkles size={13} />
        <span>Assistant</span>
      </button>

      {/* Dark Mode */}
      <button
        onClick={onToggleDark}
        className="w-8 h-8 rounded-lg border border-crm-border flex items-center justify-center hover:bg-white/[0.06] transition-all"
      >
        {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-400" />}
      </button>

      {/* User Avatar + Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(p => !p)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
        >
          <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-[11px] font-bold text-white">
            {user?.avatar ?? "U"}
          </div>
          {user && <span className="text-xs text-slate-300 hidden xl:inline">{user.name}</span>}
          <ChevronDown size={12} className={cn("text-slate-500 transition-transform", showUserMenu && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 w-56 glass-card rounded-xl border z-50 overflow-hidden"
              style={{ borderColor: "var(--border-col)" }}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-crm-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {user?.avatar ?? "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <span className="mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {user?.role}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 transition-colors">
                  <User size={13} /> My Profile
                </button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 transition-colors">
                  <Settings size={13} /> Settings
                </button>
              </div>

              <div className="border-t border-crm-border py-1">
                <button
                  onClick={() => { setShowUserMenu(false); onLogout?.(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut size={13} /> Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
