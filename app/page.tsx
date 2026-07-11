"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/crm/Sidebar";
import TopNav from "@/components/crm/TopNav";
import AIAssistant from "@/components/crm/AIAssistant";
import Auth, { type AuthUser } from "@/components/crm/Auth";
import LandingPage from "@/components/crm/LandingPage";
import CommandPalette from "@/components/crm/CommandPalette";
import { ToastProvider } from "@/components/crm/ToastSystem";
import Dashboard from "@/components/crm/sections/Dashboard";
import Leads from "@/components/crm/sections/Leads";
import Customers from "@/components/crm/sections/Customers";
import Deals from "@/components/crm/sections/Deals";
import Pipeline from "@/components/crm/sections/Pipeline";
import Tasks from "@/components/crm/sections/Tasks";
import Calendar from "@/components/crm/sections/Calendar";
import WhatsApp from "@/components/crm/sections/WhatsApp";
import Email from "@/components/crm/sections/Email";
import Team from "@/components/crm/sections/Team";
import Reports from "@/components/crm/sections/Reports";
import Finance from "@/components/crm/sections/Finance";
import Automation from "@/components/crm/sections/Automation";
import AIInsights from "@/components/crm/sections/AIInsights";
import Settings from "@/components/crm/sections/Settings";
import Marketing from "@/components/crm/sections/Marketing";
import Social from "@/components/crm/sections/Social";
import SEO from "@/components/crm/sections/SEO";
import AdminPanel from "@/components/crm/sections/AdminPanel";
import SuperAdminPanel from "@/components/crm/sections/SuperAdminPanel";
import KVlChat from "@/components/crm/sections/KVlChat";
import KVlMail from "@/components/crm/sections/KVlMail";
import KVlHelpdesk from "@/components/crm/sections/KVlHelpdesk";
import KVlCommerce from "@/components/crm/sections/KVlCommerce";
import KVlPages from "@/components/crm/sections/KVlPages";
import PlanGate from "@/components/crm/PlanGate";
import { loadSAConfig, getEffectiveFeatures, type FeatureKey } from "@/lib/superAdmin";

const sectionMap: Record<string, React.ComponentType> = {
  dashboard:   Dashboard,
  leads:       Leads,
  customers:   Customers,
  deals:       Deals,
  pipeline:    Pipeline,
  tasks:       Tasks,
  calendar:    Calendar,
  whatsapp:    WhatsApp,
  email:       Email,
  team:        Team,
  reports:     Reports,
  finance:     Finance,
  automation:  Automation,
  ai:          AIInsights,
  marketing:   Marketing,
  social:      Social,
  seo:         SEO,
  settings:    Settings,
  admin:       AdminPanel,
  superadmin:  SuperAdminPanel,
  velorachat:  KVlChat,
  veloramail:  KVlMail,
  helpdesk:    KVlHelpdesk,
  commerce:    KVlCommerce,
  velorapages: KVlPages,
};

// sections that map directly to a plan feature key
const SECTION_FEATURE_MAP: Record<string, FeatureKey> = {
  leads: "leads", customers: "customers", deals: "deals",
  pipeline: "pipeline", tasks: "tasks", calendar: "calendar",
  whatsapp: "whatsapp", email: "email", team: "team",
  reports: "reports", finance: "finance", automation: "automation",
  ai: "ai", marketing: "email",
};

type AppView = "landing" | "auth" | "app";

export default function CRMApp() {
  const [user, setUser]                     = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked]       = useState(false);
  const [view, setView]                     = useState<AppView>("landing");
  const [activeSection, setActiveSection]   = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiOpen, setAiOpen]                 = useState(false);
  const [darkMode, setDarkMode]             = useState(true);
  const [saConfig, setSaConfig]             = useState(() => loadSAConfig());

  /* Restore session + theme from localStorage on mount */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_user");
      if (saved) { setUser(JSON.parse(saved)); setView("app"); }
      const theme = localStorage.getItem("kvl_theme");
      if (theme) setDarkMode(theme === "dark");
    } catch { /* ignore */ }
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("crm_user");
    setUser(null);
    setActiveSection("dashboard");
    setView("landing");
  };

  /* Wait for localStorage check before rendering anything */
  if (!authChecked) return null;

  /* ── Landing Page ── */
  if (view === "landing") {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="landing"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-screen overflow-y-auto"
        >
          <LandingPage onGetStarted={() => setView("auth")} />
        </motion.div>
      </AnimatePresence>
    );
  }

  /* ── Auth Screen ── */
  if (view === "auth" || !user) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="auth"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-screen overflow-y-auto"
        >
          <Auth onAuth={(u) => { setUser(u); setView("app"); }} onBack={() => setView("landing")} />
        </motion.div>
      </AnimatePresence>
    );
  }

  const Section = sectionMap[activeSection] ?? Dashboard;

  // Plan-based feature gate
  const effectiveFeatures = user ? getEffectiveFeatures(user.id, saConfig) : null;
  const featureKey = SECTION_FEATURE_MAP[activeSection] as FeatureKey | undefined;
  const isPlanLocked =
    featureKey != null &&
    effectiveFeatures != null &&
    !effectiveFeatures[featureKey] &&
    user?.role !== "Super Admin" &&
    user?.role !== "Admin";

  const userPlanId = user ? (saConfig.userPlans[user.id]?.planId ?? "starter") : "starter";

  /* ── CRM App ── */
  return (
    <AnimatePresence mode="wait">
      <motion.div key="app"
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className={`flex h-screen w-screen overflow-hidden ${darkMode ? "dark" : "light"}`}
        style={{ background: darkMode ? "#080c14" : "#F8F6F1", transition: "background 0.3s ease" }}
      >
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          user={user}
          onLogout={handleLogout}
          effectiveFeatures={effectiveFeatures}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopNav
            activeSection={activeSection}
            onToggleAI={() => setAiOpen((p) => !p)}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((p) => { localStorage.setItem("kvl_theme", !p ? "dark" : "light"); return !p; })}
            user={user}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-y-auto"
              >
                {isPlanLocked && featureKey ? (
                  <PlanGate
                    feature={featureKey}
                    currentPlan={userPlanId}
                    planMatrix={saConfig.planMatrix}
                    onUpgrade={() => setActiveSection("settings")}
                  />
                ) : (
                  <Section />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
        <CommandPalette onNavigate={setActiveSection} onOpenAI={() => setAiOpen(true)} />
      </motion.div>
    </AnimatePresence>
  );
}
