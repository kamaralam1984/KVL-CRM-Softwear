export type AppMode = "saas" | "standalone";

export interface AppConfig {
  mode: AppMode;
  companyName: string;
  maxUsers: number | null;
  trialDays: number;
  features: {
    whatsapp: boolean;
    emailMarketing: boolean;
    ai: boolean;
    finance: boolean;
    automation: boolean;
    pipeline: boolean;
    reports: boolean;
  };
  saas: {
    plans: SaasPlan[];
    stripeEnabled: boolean;
    trialEnabled: boolean;
  };
  standalone: {
    licenseKey: string;
    licenseType: "perpetual" | "annual";
    licenseExpiry: string | null;
  };
  updatedAt: string;
}

export interface SaasPlan {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  maxUsers: number | null;
  maxContacts: number | null;
  features: string[];
  highlighted: boolean;
  active: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  mode: "saas",
  companyName: "AI CRM Pro",
  maxUsers: null,
  trialDays: 14,
  features: {
    whatsapp: true,
    emailMarketing: true,
    ai: true,
    finance: true,
    automation: true,
    pipeline: true,
    reports: true,
  },
  saas: {
    plans: [
      {
        id: "starter", name: "Starter", price: 29, annualPrice: 20,
        maxUsers: 5, maxContacts: 1000,
        features: ["5 Users", "1K Contacts", "Pipeline", "Basic Reports", "Email Support"],
        highlighted: false, active: true,
      },
      {
        id: "growth", name: "Growth", price: 79, annualPrice: 55,
        maxUsers: 25, maxContacts: 25000,
        features: ["25 Users", "25K Contacts", "WhatsApp CRM", "AI Insights", "Automation", "Finance", "Priority Support"],
        highlighted: true, active: true,
      },
      {
        id: "enterprise", name: "Enterprise", price: 199, annualPrice: 139,
        maxUsers: null, maxContacts: null,
        features: ["Unlimited Users", "Unlimited Contacts", "Custom Workflows", "Dedicated AI", "White-label", "24/7 Support"],
        highlighted: false, active: true,
      },
    ],
    stripeEnabled: false,
    trialEnabled: true,
  },
  standalone: {
    licenseKey: "FWAI-ENT-2025-XXXX",
    licenseType: "perpetual",
    licenseExpiry: null,
  },
  updatedAt: new Date().toISOString(),
};

/* ── Managed Users ── */
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  password: string;
  status: "active" | "inactive";
  createdAt: string;
  lastLogin: string | null;
  planId?: string;
}

const USERS_KEY = "crm_managed_users";

const DEFAULT_USERS: ManagedUser[] = [
  { id: "sa", name: "Super Admin", email: "kamaralam137@gmail.com", role: "Super Admin", avatar: "SA", password: "K12345678", status: "active", createdAt: "2025-01-01", lastLogin: "Today",        planId: "enterprise" },
  { id: "1",  name: "Animesh",     email: "animesh@freedomwithai.com", role: "Admin",       avatar: "AN", password: "demo123",  status: "active", createdAt: "2025-01-01", lastLogin: "Today",        planId: "enterprise" },
  { id: "2",  name: "Sarah Chen",  email: "sarah@aicrmpro.com",        role: "Senior AE",   avatar: "SC", password: "demo123",  status: "active", createdAt: "2025-02-10", lastLogin: "Yesterday",    planId: "growth" },
  { id: "3",  name: "Demo User",   email: "demo@crm.com",              role: "Viewer",      avatar: "DU", password: "demo",     status: "active", createdAt: "2025-03-15", lastLogin: "3 days ago",   planId: "starter" },
];

export function loadUsers(): ManagedUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_USERS;
}

export function saveUsers(users: ManagedUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/* ── Role Permissions ── */
export const ALL_SECTIONS = [
  "dashboard","leads","customers","deals","pipeline","tasks",
  "calendar","whatsapp","email","team","reports","finance",
  "automation","ai","settings",
] as const;

export type SectionId = typeof ALL_SECTIONS[number];

export type RolePermissions = Record<string, Record<string, boolean>>;

const DEFAULT_PERMISSIONS: RolePermissions = {
  "Super Admin": Object.fromEntries(ALL_SECTIONS.map(s => [s, true])),
  Admin:         Object.fromEntries(ALL_SECTIONS.map(s => [s, true])),
  Manager:     Object.fromEntries(ALL_SECTIONS.map(s => [s, !["settings"].includes(s)])),
  "Senior AE": Object.fromEntries(ALL_SECTIONS.map(s => [s, ["dashboard","leads","customers","deals","pipeline","tasks","calendar","whatsapp","email","reports"].includes(s)])),
  "Sales Rep": Object.fromEntries(ALL_SECTIONS.map(s => [s, ["dashboard","leads","deals","pipeline","tasks","calendar"].includes(s)])),
  Marketing:   Object.fromEntries(ALL_SECTIONS.map(s => [s, ["dashboard","leads","customers","email","automation","reports"].includes(s)])),
  Finance:     Object.fromEntries(ALL_SECTIONS.map(s => [s, ["dashboard","finance","reports"].includes(s)])),
  Support:     Object.fromEntries(ALL_SECTIONS.map(s => [s, ["dashboard","customers","tasks","calendar","whatsapp"].includes(s)])),
  Viewer:      Object.fromEntries(ALL_SECTIONS.map(s => [s, ["dashboard","reports"].includes(s)])),
};

const PERMS_KEY = "crm_role_permissions";

export function loadPermissions(): RolePermissions {
  if (typeof window === "undefined") return DEFAULT_PERMISSIONS;
  try {
    const raw = localStorage.getItem(PERMS_KEY);
    if (raw) return { ...DEFAULT_PERMISSIONS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PERMISSIONS;
}

export function savePermissions(p: RolePermissions): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PERMS_KEY, JSON.stringify(p));
}

/* ── Activity Log ── */
export interface ActivityEntry {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  section: string;
  detail: string;
  timestamp: string;
  type: "login" | "logout" | "create" | "update" | "delete" | "view" | "export" | "system";
}

const LOG_KEY = "crm_activity_log";

const DEMO_LOGS: ActivityEntry[] = [
  { id:"l1",  userName:"Animesh",    userRole:"Admin",     action:"Logged in",          section:"Auth",     detail:"Successful login",           timestamp:"2025-05-25 09:12", type:"login"  },
  { id:"l2",  userName:"Sarah Chen", userRole:"Senior AE", action:"Created lead",       section:"Leads",    detail:"Added: HealthTech AI",        timestamp:"2025-05-25 09:18", type:"create" },
  { id:"l3",  userName:"Animesh",    userRole:"Admin",     action:"Changed mode",       section:"Admin",    detail:"Switched to SaaS mode",       timestamp:"2025-05-25 09:25", type:"system" },
  { id:"l4",  userName:"Demo User",  userRole:"Viewer",    action:"Viewed dashboard",   section:"Dashboard",detail:"Dashboard viewed",            timestamp:"2025-05-25 09:30", type:"view"   },
  { id:"l5",  userName:"Sarah Chen", userRole:"Senior AE", action:"Updated deal",       section:"Deals",    detail:"SkyNet Robotics → Closing",   timestamp:"2025-05-25 09:45", type:"update" },
  { id:"l6",  userName:"Animesh",    userRole:"Admin",     action:"Created user",       section:"Admin",    detail:"Added: demo@crm.com",         timestamp:"2025-05-25 10:02", type:"create" },
  { id:"l7",  userName:"Sarah Chen", userRole:"Senior AE", action:"Sent campaign",      section:"Email",    detail:"Q2 Newsletter — 245 sent",    timestamp:"2025-05-25 10:15", type:"create" },
  { id:"l8",  userName:"Demo User",  userRole:"Viewer",    action:"Exported report",    section:"Reports",  detail:"Monthly revenue CSV",         timestamp:"2025-05-25 10:30", type:"export" },
  { id:"l9",  userName:"Animesh",    userRole:"Admin",     action:"Feature toggled",    section:"Admin",    detail:"Finance module enabled",      timestamp:"2025-05-25 10:45", type:"system" },
  { id:"l10", userName:"Sarah Chen", userRole:"Senior AE", action:"Deleted lead",       section:"Leads",    detail:"Removed: SpamCo Ltd",         timestamp:"2025-05-25 11:00", type:"delete" },
  { id:"l11", userName:"Animesh",    userRole:"Admin",     action:"Role changed",       section:"Admin",    detail:"demo@crm.com → Sales Rep",    timestamp:"2025-05-25 11:15", type:"update" },
  { id:"l12", userName:"Demo User",  userRole:"Sales Rep", action:"Created task",       section:"Tasks",    detail:"Follow up: RetailPro",        timestamp:"2025-05-25 11:20", type:"create" },
  { id:"l13", userName:"Sarah Chen", userRole:"Senior AE", action:"Logged out",         section:"Auth",     detail:"Session ended",               timestamp:"2025-05-25 12:00", type:"logout" },
  { id:"l14", userName:"Animesh",    userRole:"Admin",     action:"Password changed",   section:"Admin",    detail:"User: sarah@aicrmpro.com",    timestamp:"2025-05-25 12:30", type:"system" },
  { id:"l15", userName:"Sarah Chen", userRole:"Senior AE", action:"Logged in",          section:"Auth",     detail:"Successful login",            timestamp:"2025-05-25 13:05", type:"login"  },
];

export function loadLogs(): ActivityEntry[] {
  if (typeof window === "undefined") return DEMO_LOGS;
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEMO_LOGS;
}

export function appendLog(entry: Omit<ActivityEntry, "id">): void {
  if (typeof window === "undefined") return;
  const logs = loadLogs();
  logs.unshift({ ...entry, id: Date.now().toString() });
  localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 500)));
}

export function clearLogs(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOG_KEY, JSON.stringify([]));
}

const CONFIG_KEY = "crm_app_config";

export function loadConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...config, updatedAt: new Date().toISOString() }));
}
