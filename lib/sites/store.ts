// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 10 (Multi-Tenant Embed)
// Server-only helpers for the `sites` table — mirrors lib/tracking/store.ts's
// convention (plain module, not "use server", imported by both API route
// handlers and lib/actions/sites.ts). Read helpers used on the hot analytics
// path fail soft (never throw); admin-triggered writes surface real errors.

import { getServerClient } from "@/lib/supabase/server";
import type { Site } from "./types";

export const DEFAULT_SITE_ID = "kvl-default";

function shortHex(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

export function generateSiteId(): string {
  return `KVL-SITE-${shortHex()}`;
}

/** Used on every public analytics/telephony request — must fail soft. */
export async function getSiteBySiteId(siteId: string): Promise<Site | null> {
  try {
    const db = getServerClient();
    const { data } = await db.from("sites").select("*").eq("site_id", siteId).maybeSingle();
    return (data as Site | null) ?? null;
  } catch (err) {
    console.error("[sites] getSiteBySiteId failed", err);
    return null;
  }
}

/** Admin-facing — lets a real error surface to the Sites management UI. */
export async function listSites(): Promise<Site[]> {
  const db = getServerClient();
  const { data, error } = await db.from("sites").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Site[]) ?? [];
}

export async function createSite(input: { name: string; ownerEmail: string; domains: string[] }): Promise<Site> {
  const db = getServerClient();
  const { data, error } = await db
    .from("sites")
    .insert({
      site_id: generateSiteId(),
      name: input.name.trim(),
      owner_email: input.ownerEmail.trim(),
      // Normalize trailing slashes — isOriginAllowed() does an exact match
      // against the browser's Origin header, which never has one; a domain
      // entered as "https://acme.com/" would otherwise silently reject every
      // real request from that site (gap-check hardening).
      domains: input.domains.map((d) => d.trim().replace(/\/+$/, "")).filter(Boolean),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Site;
}

export async function setSiteActive(siteId: string, active: boolean): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("sites").update({ active }).eq("site_id", siteId);
  if (error) throw new Error(error.message);
}

export async function updateSite(
  siteId: string,
  input: { name?: string; ownerEmail?: string; domains?: string[] }
): Promise<Site> {
  const db = getServerClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.ownerEmail !== undefined) patch.owner_email = input.ownerEmail.trim();
  if (input.domains !== undefined) {
    // Same trailing-slash normalization as createSite() — isOriginAllowed()
    // does an exact match against the browser's Origin header.
    patch.domains = input.domains.map((d) => d.trim().replace(/\/+$/, "")).filter(Boolean);
  }
  const { data, error } = await db.from("sites").update(patch).eq("site_id", siteId).select().single();
  if (error) throw new Error(error.message);
  return data as Site;
}

export async function deleteSite(siteId: string): Promise<void> {
  if (siteId === DEFAULT_SITE_ID) throw new Error("Cannot delete the default Maxness site.");
  const db = getServerClient();
  const { error } = await db.from("sites").delete().eq("site_id", siteId);
  if (error) throw new Error(error.message);
}
