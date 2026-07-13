// Phase 14 — Marketplace public surface.

export * from "./types";
export { CATALOG } from "./catalog";
export {
  getInstalledState,
  installModule,
  uninstallModule,
  toggleModule,
  getModules,
} from "./store";

import { CATALOG } from "./catalog";
import { getModules } from "./store";
import type { MarketplaceModule } from "./types";

/** The full, unmodified catalog. */
export function getCatalog(): MarketplaceModule[] {
  return CATALOG.map((m) => ({ ...m }));
}

/** Only the modules the tenant currently has installed. */
export function getInstalledModules(): MarketplaceModule[] {
  return getModules().filter((m) => m.installed);
}
