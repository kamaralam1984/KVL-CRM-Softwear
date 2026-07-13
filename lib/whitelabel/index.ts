/* ══════════════════════════════════════════════════════════
   WHITE LABEL — Public API (Phase 13)
   Resolution + branding helpers. Never throws.
══════════════════════════════════════════════════════════ */

import type { Tenant, TenantBranding } from "./types";
import {
  getDefaultTenant,
  getTenant,
  resolveTenantByDomain,
} from "./store";

export type { Tenant, TenantBranding, TenantSmtp, TenantWhatsapp } from "./types";
export {
  getTenants,
  getTenant,
  saveTenant,
  deleteTenant,
  resolveTenantByDomain,
  getDefaultTenant,
} from "./store";

/**
 * Resolve the active tenant from a host or slug.
 * Falls back to the default tenant. Never throws.
 */
export function resolveTenant(hostOrSlug?: string): Tenant {
  try {
    if (hostOrSlug) {
      const byDomain = resolveTenantByDomain(hostOrSlug);
      if (byDomain) return byDomain;
      const bySlug = getTenant(hostOrSlug);
      if (bySlug) return bySlug;
    }
  } catch (err) {
    console.error("[whitelabel] resolveTenant failed", err);
  }
  return getDefaultTenant();
}

/** Extract the branding-only slice of a tenant. */
export function getEffectiveBranding(tenant: Tenant): TenantBranding {
  const t = tenant || getDefaultTenant();
  return {
    brandName: t.brandName,
    tagline: t.tagline,
    logoUrl: t.logoUrl,
    primaryColor: t.primaryColor,
    domain: t.domain,
  };
}

/** True when the tenant has a usable SMTP configuration. */
export function tenantSmtpConfigured(tenant: Tenant): boolean {
  try {
    const s = tenant?.smtp;
    return !!(s && s.host && s.port && s.fromEmail);
  } catch (err) {
    console.error("[whitelabel] tenantSmtpConfigured failed", err);
    return false;
  }
}

/** True when the tenant has a usable WhatsApp configuration. */
export function tenantWhatsappConfigured(tenant: Tenant): boolean {
  try {
    const w = tenant?.whatsapp;
    return !!(w && w.provider && w.from);
  } catch (err) {
    console.error("[whitelabel] tenantWhatsappConfigured failed", err);
    return false;
  }
}
