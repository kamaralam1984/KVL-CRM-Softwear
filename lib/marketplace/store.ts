// Phase 14 — Marketplace install-state store (localStorage).
// Follows the loadX/saveX + `typeof window` guard pattern used in lib/superAdmin.ts.
// We persist only the per-module install/enabled overrides, then merge them onto
// the immutable CATALOG at read time.

import { CATALOG } from "./catalog";
import type { MarketplaceModule } from "./types";

const MARKETPLACE_KEY = "crm_marketplace";

export interface ModuleState {
  installed: boolean;
  enabled: boolean;
}

export type InstalledState = Record<string, ModuleState>;

/** Read the persisted per-module install/enabled overrides. */
export function getInstalledState(): InstalledState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MARKETPLACE_KEY);
    if (raw) return JSON.parse(raw) as InstalledState;
  } catch (err) {
    console.error("[marketplace] failed to read install state", err);
  }
  return {};
}

/** Persist the full install-state map. */
function saveInstalledState(state: InstalledState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("[marketplace] failed to save install state", err);
  }
}

/** Look up the catalog default for a module id. */
function catalogDefault(id: string): ModuleState {
  const mod = CATALOG.find((m) => m.id === id);
  return { installed: mod?.installed ?? false, enabled: mod?.enabled ?? false };
}

/** Install a module (installed + enabled). */
export function installModule(id: string): void {
  const state = getInstalledState();
  state[id] = { installed: true, enabled: true };
  saveInstalledState(state);
}

/** Uninstall a module (installed + enabled both false). */
export function uninstallModule(id: string): void {
  const state = getInstalledState();
  state[id] = { installed: false, enabled: false };
  saveInstalledState(state);
}

/** Enable / disable an already-installed module. */
export function toggleModule(id: string, on: boolean): void {
  const state = getInstalledState();
  const current = state[id] ?? catalogDefault(id);
  state[id] = { installed: current.installed || on, enabled: on };
  saveInstalledState(state);
}

/** Merge CATALOG with persisted overrides to get the live module list. */
export function getModules(): MarketplaceModule[] {
  const state = getInstalledState();
  return CATALOG.map((mod) => {
    const override = state[mod.id];
    if (!override) return { ...mod };
    return { ...mod, installed: override.installed, enabled: override.enabled };
  });
}
