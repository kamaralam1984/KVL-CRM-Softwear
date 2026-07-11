export type PlanId = "starter" | "growth" | "scale" | "enterprise";

export type FeatureKey =
  | "dashboard" | "leads" | "customers" | "deals" | "pipeline"
  | "tasks" | "calendar" | "whatsapp" | "email" | "team"
  | "reports" | "finance" | "automation" | "ai" | "settings";

export const ALL_FEATURES: FeatureKey[] = [
  "dashboard","leads","customers","deals","pipeline",
  "tasks","calendar","whatsapp","email","team",
  "reports","finance","automation","ai","settings",
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dashboard:  "Dashboard",
  leads:      "Leads",
  customers:  "Customers",
  deals:      "Deals",
  pipeline:   "Sales Pipeline",
  tasks:      "Tasks",
  calendar:   "Calendar",
  whatsapp:   "WhatsApp CRM",
  email:      "Email Marketing",
  team:       "Team Management",
  reports:    "Reports & Analytics",
  finance:    "Finance & Invoicing",
  automation: "Workflow Automation",
  ai:         "AI / Smart Insights",
  settings:   "Settings",
};

export const PLAN_LABELS: Record<PlanId, string> = {
  starter:    "Starter",
  growth:     "Growth",
  scale:      "Scale",
  enterprise: "Enterprise",
};

export const PLAN_PRICES: Record<PlanId, string> = {
  starter:    "$29/mo",
  growth:     "$79/mo",
  scale:      "$149/mo",
  enterprise: "Custom",
};

export const PLAN_COLORS: Record<PlanId, { bg: string; text: string; border: string }> = {
  starter:    { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" },
  growth:     { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)" },
  scale:      { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa", border: "rgba(139,92,246,0.3)" },
  enterprise: { bg: "rgba(212,175,55,0.15)",  text: "#D4AF37", border: "rgba(212,175,55,0.3)" },
};

export const PLAN_ORDER: PlanId[] = ["starter","growth","scale","enterprise"];

export type PlanFeatureMap = Record<FeatureKey, boolean>;
export type PlanMatrix    = Record<PlanId, PlanFeatureMap>;

export const DEFAULT_PLAN_MATRIX: PlanMatrix = {
  starter: {
    dashboard: true,  leads: true,   customers: true,  deals: true,
    pipeline: true,   tasks: true,   calendar: true,
    whatsapp: true,   email: true,   team: true,
    reports: true,    finance: true,  automation: true,  ai: true,
    settings: true,
  },
  growth: {
    dashboard: true,  leads: true,   customers: true,  deals: true,
    pipeline: true,   tasks: true,   calendar: true,
    whatsapp: true,   email: true,   team: true,
    reports: true,    finance: true,  automation: true,  ai: true,
    settings: true,
  },
  scale: {
    dashboard: true,  leads: true,   customers: true,  deals: true,
    pipeline: true,   tasks: true,   calendar: true,
    whatsapp: true,   email: true,   team: true,
    reports: true,    finance: true,  automation: true,  ai: true,
    settings: true,
  },
  enterprise: {
    dashboard: true,  leads: true,   customers: true,  deals: true,
    pipeline: true,   tasks: true,   calendar: true,
    whatsapp: true,   email: true,   team: true,
    reports: true,    finance: true,  automation: true,  ai: true,
    settings: true,
  },
};

export interface UserPlanEntry {
  userId:           string;
  planId:           PlanId;
  featureOverrides: Partial<PlanFeatureMap>;
  assignedAt:       string;
  notes:            string;
}

export interface SuperAdminConfig {
  planMatrix:      PlanMatrix;
  userPlans:       Record<string, UserPlanEntry>;
  globalEnabled:   boolean;
  maintenanceMode: boolean;
  updatedAt:       string;
}

const SA_KEY = "crm_superadmin_config";

const DEFAULT_SA_CONFIG: SuperAdminConfig = {
  planMatrix: DEFAULT_PLAN_MATRIX,
  userPlans: {
    "sa": { userId: "sa", planId: "enterprise", featureOverrides: {}, assignedAt: "2025-01-01", notes: "Super Admin" },
    "1":  { userId: "1",  planId: "enterprise", featureOverrides: {}, assignedAt: "2025-01-01", notes: "Platform owner" },
    "2":  { userId: "2",  planId: "growth",     featureOverrides: {}, assignedAt: "2025-02-10", notes: "" },
    "3":  { userId: "3",  planId: "starter",    featureOverrides: {}, assignedAt: "2025-03-15", notes: "" },
  },
  globalEnabled:   true,
  maintenanceMode: false,
  updatedAt:       "",
};

export function loadSAConfig(): SuperAdminConfig {
  if (typeof window === "undefined") return DEFAULT_SA_CONFIG;
  try {
    const raw = localStorage.getItem(SA_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      // Deep merge per plan per feature — DEFAULT true always wins
      const planMatrix = {} as PlanMatrix;
      for (const plan of PLAN_ORDER) {
        planMatrix[plan] = {} as PlanFeatureMap;
        for (const feature of ALL_FEATURES) {
          const def = DEFAULT_PLAN_MATRIX[plan][feature];
          const saved = p.planMatrix?.[plan]?.[feature];
          planMatrix[plan][feature] = def || saved || false;
        }
      }
      return {
        ...DEFAULT_SA_CONFIG,
        ...p,
        planMatrix,
        userPlans: { ...DEFAULT_SA_CONFIG.userPlans, ...p.userPlans },
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_SA_CONFIG;
}

export function saveSAConfig(cfg: SuperAdminConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SA_KEY, JSON.stringify({ ...cfg, updatedAt: new Date().toISOString() }));
}

export function getEffectiveFeatures(userId: string, cfg: SuperAdminConfig): PlanFeatureMap {
  const entry  = cfg.userPlans[userId];
  const planId: PlanId = entry?.planId ?? "starter";
  const base   = cfg.planMatrix[planId];
  return { ...base, ...(entry?.featureOverrides ?? {}) };
}

export function getUserPlan(userId: string, cfg: SuperAdminConfig): PlanId {
  return cfg.userPlans[userId]?.planId ?? "starter";
}

export function minPlanForFeature(feature: FeatureKey, matrix: PlanMatrix): PlanId | null {
  return PLAN_ORDER.find(p => matrix[p][feature]) ?? null;
}

export function countEnabledFeatures(features: PlanFeatureMap): number {
  return Object.values(features).filter(Boolean).length;
}

/* ══════════════════════════════════════════════════════════
   PRICING CONFIG
══════════════════════════════════════════════════════════ */
export interface PricingPlan {
  id:           string;
  name:         string;
  price:        number;
  annual:       number;
  isCustom:     boolean;
  badge:        string;
  desc:         string;
  features:     string[];
  notIncluded:  string[];
  cta:          string;
  discount:     number;
  offerLabel:   string;
  isPopular:    boolean;
  isHidden:     boolean;
  color:        string;
}

export interface PricingConfig {
  plans:             PricingPlan[];
  annualSavePercent: number;
  trialDays:         number;
}

export const DEFAULT_PRICING: PricingConfig = {
  annualSavePercent: 30,
  trialDays: 14,
  plans: [
    {
      id: "starter", name: "Starter", price: 29, annual: 20, isCustom: false,
      badge: "", desc: "Perfect for small sales teams getting started with CRM.",
      features: ["Up to 5 users","1,000 contacts","Basic sales pipeline","Email campaigns (500/mo)","Task & calendar management","Standard reports & dashboards","CSV data import/export","Email support (48h response)"],
      notIncluded: ["WhatsApp CRM","AI Insights","Workflow Automation","Finance & Invoicing"],
      cta: "Start Free Trial", discount: 0, offerLabel: "", isPopular: false, isHidden: false,
      color: "border-white/[0.1]",
    },
    {
      id: "growth", name: "Growth", price: 79, annual: 55, isCustom: false,
      badge: "Most Popular", desc: "For growing sales teams that want AI-powered selling.",
      features: ["Up to 25 users","25,000 contacts","Advanced pipeline (multi-stage)","Unlimited email campaigns","WhatsApp CRM + Broadcasts","AI Lead Scoring & Insights","Workflow Automation (20 workflows)","Finance & Invoicing module","Priority support (4h response)","Onboarding call included","API access"],
      notIncluded: ["Unlimited workflows","Dedicated account manager"],
      cta: "Start Free Trial", discount: 0, offerLabel: "", isPopular: true, isHidden: false,
      color: "border-blue-500/50",
    },
    {
      id: "scale", name: "Scale", price: 149, annual: 99, isCustom: false,
      badge: "", desc: "For scaling teams that need more power and analytics.",
      features: ["Up to 100 users","250,000 contacts","All Growth features","Custom automations","AI-powered insights","Advanced analytics","Dedicated onboarding","SLA support"],
      notIncluded: ["Dedicated account manager","Custom AI model"],
      cta: "Start Free Trial", discount: 0, offerLabel: "", isPopular: false, isHidden: false,
      color: "border-violet-500/30",
    },
    {
      id: "enterprise", name: "Enterprise", price: 199, annual: 139, isCustom: true,
      badge: "", desc: "For large teams that need unlimited scale and dedicated support.",
      features: ["Unlimited users","Unlimited contacts","Unlimited pipelines","Unlimited email campaigns","WhatsApp CRM + Advanced automation","Dedicated AI model","Unlimited automation workflows","White-label option available","SSO / SAML integration","Dedicated account manager","24/7 phone & chat support","SLA guarantee (99.9% uptime)"],
      notIncluded: [],
      cta: "Contact Sales", discount: 0, offerLabel: "", isPopular: false, isHidden: false,
      color: "border-amber-500/30",
    },
  ],
};

const PRICING_KEY = "crm_pricing_config";

export function loadPricing(): PricingConfig {
  if (typeof window === "undefined") return DEFAULT_PRICING;
  try {
    const raw = localStorage.getItem(PRICING_KEY);
    if (raw) return { ...DEFAULT_PRICING, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PRICING;
}

export function savePricing(cfg: PricingConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRICING_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new Event("pricing-updated"));
}

/* ══════════════════════════════════════════════════════════
   WHITE LABEL CONFIG
══════════════════════════════════════════════════════════ */
export interface WhiteLabelConfig {
  brandName:    string;
  tagline:      string;
  supportEmail: string;
  salesEmail:   string;
  website:      string;
  address:      string;
  phone:        string;
  footerText:   string;
  logoUrl:      string;
}

export const DEFAULT_WHITE_LABEL: WhiteLabelConfig = {
  brandName:    "KVl CRM",
  tagline:      "Premium Sales Suite",
  supportEmail: "support@kvlcrm.com",
  salesEmail:   "sales@kvlcrm.com",
  website:      "kvlcrm.com",
  address:      "",
  phone:        "",
  footerText:   "© 2025 KVl CRM · FreedomWithAI. All rights reserved.",
  logoUrl:      "",
};

const WL_KEY = "crm_whitelabel_config";

export function loadWhiteLabel(): WhiteLabelConfig {
  if (typeof window === "undefined") return DEFAULT_WHITE_LABEL;
  try {
    const raw = localStorage.getItem(WL_KEY);
    if (raw) return { ...DEFAULT_WHITE_LABEL, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_WHITE_LABEL;
}

export function saveWhiteLabel(cfg: WhiteLabelConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WL_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new Event("whitelabel-updated"));
}
