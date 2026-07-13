// Phase 15 — Enterprise Security: Role-Based Access Control
// Pure functions layered on TOP of the existing role strings used across the CRM
// (see lib/appConfig.ts DEFAULT_PERMISSIONS and lib/superAdmin.ts ALL_FEATURES).
//
// This module answers a finer-grained question than the section-level
// visibility map: for a given role, may it perform ACTION on RESOURCE?

export type Action = "read" | "create" | "update" | "delete" | "admin";

export const ACTIONS: Action[] = ["read", "create", "update", "delete", "admin"];

// Canonical resources — aligned with lib/appConfig.ts ALL_SECTIONS /
// lib/superAdmin.ts ALL_FEATURES so callers can reuse the same keys.
export const RESOURCES = [
  "dashboard", "leads", "customers", "deals", "pipeline", "tasks",
  "calendar", "whatsapp", "email", "team", "reports", "finance",
  "automation", "ai", "settings",
] as const;

export type Resource = (typeof RESOURCES)[number];

// Per-resource action grants. A missing resource key means "no access".
export type ResourceGrants = Partial<Record<string, Action[]>>;

// Roles mirror the strings seen in lib/appConfig.ts (DEFAULT_PERMISSIONS,
// DEFAULT_USERS, DEMO_LOGS): "Super Admin", "Admin", "Manager", "Senior AE",
// "Sales Rep", "Marketing", "Finance", "Support", "Viewer".
export type RoleMatrix = Record<string, ResourceGrants>;

const ALL: Action[] = ["read", "create", "update", "delete", "admin"];
const CRUD: Action[] = ["read", "create", "update", "delete"];
const RCU: Action[] = ["read", "create", "update"];
const RC: Action[] = ["read", "create"];
const R: Action[] = ["read"];

// Wildcard resource — grants applied when a role has no explicit entry for a
// resource. "*" lets us keep the matrix compact for all-powerful roles.
const WILDCARD = "*";

function everyResource(actions: Action[]): ResourceGrants {
  const g: ResourceGrants = { [WILDCARD]: actions };
  for (const res of RESOURCES) g[res] = actions;
  return g;
}

/**
 * ROLE_MATRIX — the default permission model.
 * Super Admin: everything. Admin: most (all but destructive settings admin
 * is still allowed). AE roles: read/create/update on their sales resources.
 * Viewer: read-only. Missing resource ⇒ denied.
 */
export const ROLE_MATRIX: RoleMatrix = {
  "Super Admin": everyResource(ALL),

  Admin: {
    [WILDCARD]: CRUD,
    dashboard: R,
    leads: CRUD, customers: CRUD, deals: CRUD, pipeline: CRUD,
    tasks: CRUD, calendar: CRUD, whatsapp: CRUD, email: CRUD,
    team: CRUD, reports: R, finance: CRUD, automation: CRUD,
    ai: RCU, settings: ["read", "update", "admin"],
  },

  Manager: {
    dashboard: R,
    leads: CRUD, customers: CRUD, deals: CRUD, pipeline: CRUD,
    tasks: CRUD, calendar: CRUD, whatsapp: RCU, email: RCU,
    team: R, reports: R, finance: R, automation: RCU, ai: R,
  },

  "Senior AE": {
    dashboard: R,
    leads: RCU, customers: RCU, deals: RCU, pipeline: RCU,
    tasks: CRUD, calendar: CRUD, whatsapp: RCU, email: RC, reports: R,
  },

  "Sales Rep": {
    dashboard: R,
    leads: RCU, customers: R, deals: RCU, pipeline: R,
    tasks: RCU, calendar: RCU,
  },

  Marketing: {
    dashboard: R,
    leads: RCU, customers: R, email: CRUD, automation: RCU, reports: R,
  },

  Finance: {
    dashboard: R,
    finance: CRUD, reports: R, deals: R, customers: R,
  },

  Support: {
    dashboard: R,
    customers: RCU, tasks: RCU, calendar: RCU, whatsapp: RCU,
  },

  Viewer: {
    dashboard: R,
    leads: R, customers: R, deals: R, pipeline: R, reports: R,
  },
};

// Roles that always pass every check regardless of matrix contents.
const OMNIPOTENT_ROLES = new Set<string>(["Super Admin"]);

/**
 * can — pure authorization check.
 * @returns true if `role` may perform `action` on `resource`.
 * Unknown roles / resources default to DENY (fail-closed). Never throws.
 */
export function can(role: string, resource: string, action: Action): boolean {
  try {
    if (OMNIPOTENT_ROLES.has(role)) return true;

    const grants = ROLE_MATRIX[role];
    if (!grants) return false;

    const explicit = grants[resource];
    if (explicit) return explicit.includes(action);

    const wildcard = grants[WILDCARD];
    if (wildcard) return wildcard.includes(action);

    return false;
  } catch (err) {
    console.error("[security] rbac.can failed", err);
    return false;
  }
}

/** allowedActions — the list of actions a role may perform on a resource. */
export function allowedActions(role: string, resource: string): Action[] {
  try {
    if (OMNIPOTENT_ROLES.has(role)) return [...ALL];
    const grants = ROLE_MATRIX[role];
    if (!grants) return [];
    const explicit = grants[resource] ?? grants[WILDCARD];
    return explicit ? [...explicit] : [];
  } catch (err) {
    console.error("[security] rbac.allowedActions failed", err);
    return [];
  }
}

/** hasRole — whether the role is known to the matrix (Super Admin included). */
export function hasRole(role: string): boolean {
  return OMNIPOTENT_ROLES.has(role) || role in ROLE_MATRIX;
}

/** listRoles — all roles defined in the matrix. */
export function listRoles(): string[] {
  return Object.keys(ROLE_MATRIX);
}
