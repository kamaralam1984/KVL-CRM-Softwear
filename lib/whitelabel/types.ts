/* ══════════════════════════════════════════════════════════
   WHITE LABEL — Multi-tenant types (Phase 13)
   Additive layer on top of lib/superAdmin.ts WhiteLabelConfig.
══════════════════════════════════════════════════════════ */

export interface TenantSmtp {
  host: string;
  port: number;
  user: string;
  fromEmail: string;
}

export interface TenantWhatsapp {
  provider: string;
  from: string;
}

export interface Tenant {
  id: string;
  slug: string;
  brandName: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor?: string;
  domain?: string;
  supportEmail?: string;
  smtp?: TenantSmtp;
  whatsapp?: TenantWhatsapp;
  plan?: string;
  active: boolean;
  createdAt: string;
}

export type TenantBranding = Pick<
  Tenant,
  "brandName" | "tagline" | "logoUrl" | "primaryColor" | "domain"
>;
