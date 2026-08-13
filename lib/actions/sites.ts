"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 10 (Multi-Tenant Embed)
// Thin "use server" wrappers around lib/sites/store.ts so the Admin Panel
// (a client component) can call these directly as React Server Actions.

import {
  listSites as storeListSites,
  createSite as storeCreateSite,
  setSiteActive as storeSetSiteActive,
} from "@/lib/sites/store";
import type { Site } from "@/lib/sites/types";

export async function listSites(): Promise<Site[]> {
  return storeListSites();
}

export async function createSite(input: { name: string; ownerEmail: string; domains: string[] }): Promise<Site> {
  return storeCreateSite(input);
}

export async function setSiteActive(siteId: string, active: boolean): Promise<void> {
  return storeSetSiteActive(siteId, active);
}
