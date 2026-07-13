/* ══════════════════════════════════════════════════════════
   WHITE LABEL — Tenant store (localStorage-backed CRUD)
   Mirrors the loadWhiteLabel/saveWhiteLabel pattern in
   lib/superAdmin.ts. Guards `typeof window`. Never throws.
══════════════════════════════════════════════════════════ */

import { DEFAULT_WHITE_LABEL } from "../superAdmin";
import type { Tenant } from "./types";

const TENANTS_KEY = "crm_tenants";

/** Default tenant derived from the superAdmin WhiteLabelConfig defaults,
 *  so existing single-tenant behavior is preserved. */
export function getDefaultTenant(): Tenant {
  return {
    id: "default",
    slug: "default",
    brandName: DEFAULT_WHITE_LABEL.brandName,
    tagline: DEFAULT_WHITE_LABEL.tagline,
    logoUrl: DEFAULT_WHITE_LABEL.logoUrl,
    primaryColor: "",
    domain: DEFAULT_WHITE_LABEL.website,
    supportEmail: DEFAULT_WHITE_LABEL.supportEmail,
    plan: "default",
    active: true,
    createdAt: "1970-01-01T00:00:00.000Z",
  };
}

/** Read all tenants. Always includes the default tenant (first). */
export function getTenants(): Tenant[] {
  const fallback = getDefaultTenant();
  if (typeof window === "undefined") return [fallback];
  try {
    const raw = localStorage.getItem(TENANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stored = parsed as Tenant[];
        const hasDefault = stored.some((t) => t.id === "default");
        return hasDefault ? stored : [fallback, ...stored];
      }
    }
  } catch (err) {
    console.error("[whitelabel] getTenants failed", err);
  }
  return [fallback];
}

/** Look up a tenant by id or slug. */
export function getTenant(idOrSlug: string): Tenant | undefined {
  if (!idOrSlug) return undefined;
  const needle = idOrSlug.toLowerCase();
  return getTenants().find(
    (t) => t.id.toLowerCase() === needle || t.slug.toLowerCase() === needle,
  );
}

/** Create or update a tenant (matched by id, else slug). */
export function saveTenant(tenant: Tenant): void {
  if (typeof window === "undefined") return;
  try {
    const tenants = getTenants();
    const idx = tenants.findIndex(
      (t) => t.id === tenant.id || (!!tenant.slug && t.slug === tenant.slug),
    );
    if (idx >= 0) tenants[idx] = { ...tenants[idx], ...tenant };
    else tenants.push(tenant);
    localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
    window.dispatchEvent(new Event("tenants-updated"));
  } catch (err) {
    console.error("[whitelabel] saveTenant failed", err);
  }
}

/** Remove a tenant by id or slug. The default tenant cannot be deleted. */
export function deleteTenant(idOrSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    const needle = idOrSlug.toLowerCase();
    const remaining = getTenants().filter(
      (t) =>
        t.id !== "default" &&
        t.id.toLowerCase() !== needle &&
        t.slug.toLowerCase() !== needle,
    );
    localStorage.setItem(TENANTS_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new Event("tenants-updated"));
  } catch (err) {
    console.error("[whitelabel] deleteTenant failed", err);
  }
}

/** Resolve a tenant by matching a request host against tenant.domain. */
export function resolveTenantByDomain(host?: string): Tenant | undefined {
  if (!host) return undefined;
  const clean = host.toLowerCase().split(":")[0].trim();
  if (!clean) return undefined;
  return getTenants().find((t) => {
    const domain = (t.domain || "").toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    return !!domain && (domain === clean || clean.endsWith(`.${domain}`));
  });
}
