"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, AlertTriangle } from "lucide-react";
import Sidebar from "@/components/crm/Sidebar";
import TopNav from "@/components/crm/TopNav";
import { ThemeProvider, useTheme } from "@/components/crm/ThemeContext";
import AIAssistant from "@/components/crm/AIAssistant";
import InstallPrompt from "@/components/crm/InstallPrompt";
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
import WebsiteAnalyzer from "@/components/crm/sections/WebsiteAnalyzer";
import OpportunityFinder from "@/components/crm/sections/OpportunityFinder";
import SalesAssistant from "@/components/crm/sections/SalesAssistant";
import ProposalGenerator from "@/components/crm/sections/ProposalGenerator";
import AcquisitionOverview from "@/components/crm/sections/AcquisitionOverview";
import Reputation from "@/components/crm/sections/Reputation";
import Membership from "@/components/crm/sections/Membership";
import Affiliates from "@/components/crm/sections/Affiliates";
import Developers from "@/components/crm/sections/Developers";
import Forms from "@/components/crm/sections/Forms";
import Webinars from "@/components/crm/sections/Webinars";
import PlanGate from "@/components/crm/PlanGate";
import AccessDenied from "@/components/crm/AccessDenied";
import { loadSAConfig, getEffectiveFeatures, type FeatureKey } from "@/lib/superAdmin";
import { can } from "@/lib/security/rbac";

// RBAC is enforced only for these core CRUD resources (mirrors lib/security/rbac.ts's
// RESOURCES). "settings" is deliberately excluded — it's a personal-account page
// (profile/password/2FA) every logged-in user needs, not an org-admin resource, so
// gating it here would regress access rather than fix a gap. "dashboard" is read-
// granted to every role in ROLE_MATRIX, so including it is a harmless no-op.
const RBAC_SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard", leads: "Leads", customers: "Customers", deals: "Deals",
  pipeline: "Sales Pipeline", tasks: "Tasks", calendar: "Calendar", whatsapp: "WhatsApp CRM",
  email: "Email Marketing", team: "Team", reports: "Reports", finance: "Finance",
  automation: "Automation", ai: "Smart Insights",
};

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
  analyzer:    WebsiteAnalyzer,
  opportunity: OpportunityFinder,
  salesassistant: SalesAssistant,
  proposals:   ProposalGenerator,
  acquisition: AcquisitionOverview,
  reputation:  Reputation,
  membership:  Membership,
  affiliates:  Affiliates,
  developers:  Developers,
  forms:       Forms,
  webinars:    Webinars,
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
  return (
    <ThemeProvider>
      <CRMAppInner />
    </ThemeProvider>
  );
}

function CRMAppInner() {
  const [user, setUser]                     = useState<AuthUser | null>(null);
  const [view, setView]                     = useState<AppView>("landing");
  const [activeSection, setActiveSection]   = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiOpen, setAiOpen]                 = useState(false);
  const { darkMode, toggleDark } = useTheme();
  const [saConfig, setSaConfig]             = useState(() => loadSAConfig());

  /* Restore session from localStorage on mount (theme itself is restored by
     ThemeProvider). Deliberately NOT gated behind a "checked yet?" flag that
     blanks the first render — the landing page renders immediately (real
     server-rendered HTML for SEO/scanners/perceived load), and swaps to the
     dashboard a moment later for an already-logged-in visitor. */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_user");
      if (saved) { setUser(JSON.parse(saved)); setView("app"); }
    } catch { /* ignore */ }
  }, []);

  /* Land on Settings after the Razorpay Connect OAuth redirect so the connection banner is visible */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("razorpay")) setActiveSection("settings");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("crm_user");
    setUser(null);
    setActiveSection("dashboard");
    setView("landing");
  };

  /* ── Global kill switch: disabling this blocks all logins ── */
  if (!saConfig.globalEnabled && user?.role !== "Super Admin") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#080c14] text-center px-6">
        <div className="max-w-sm">
          <Globe size={40} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-lg font-black text-white mb-2">Platform Unavailable</h1>
          <p className="text-sm text-slate-500">This platform has been temporarily disabled by the administrator. Please check back later.</p>
        </div>
      </div>
    );
  }

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

  /* ── Maintenance mode: shows maintenance page to all non-super-admin users ── */
  if (saConfig.maintenanceMode && user?.role !== "Super Admin") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#080c14] text-center px-6">
        <div className="max-w-sm">
          <AlertTriangle size={40} className="mx-auto mb-4 text-amber-400" />
          <h1 className="text-lg font-black text-white mb-2">Under Maintenance</h1>
          <p className="text-sm text-slate-500">We&apos;re performing scheduled maintenance. Please check back shortly.</p>
        </div>
      </div>
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

  // Role-based access control — checked before the plan gate so an unauthorized
  // role sees "you don't have permission" rather than an upsell prompt.
  const rbacLabel = RBAC_SECTION_LABELS[activeSection];
  const isAccessDenied = rbacLabel != null && user != null && !can(user.role, activeSection, "read");

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
            onToggleDark={toggleDark}
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
                {isAccessDenied ? (
                  <AccessDenied section={rbacLabel} role={user?.role ?? "Unknown"} />
                ) : isPlanLocked && featureKey ? (
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
        <InstallPrompt />
      </motion.div>
    </AnimatePresence>
  );
}
