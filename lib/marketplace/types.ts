// Phase 14 — Marketplace module type definitions.

export type ModuleCategory =
  | "crm"
  | "erp"
  | "hrm"
  | "hospital"
  | "school"
  | "restaurant"
  | "real_estate"
  | "accounting";

export interface MarketplaceModule {
  id: string;
  name: string;
  category: ModuleCategory;
  description: string;
  icon?: string;
  version: string;
  price?: number;
  installed: boolean;
  enabled: boolean;
  features: string[];
}

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  crm:         "CRM",
  erp:         "ERP",
  hrm:         "HRM",
  hospital:    "Hospital",
  school:      "School",
  restaurant:  "Restaurant",
  real_estate: "Real Estate",
  accounting:  "Accounting",
};

export const ALL_CATEGORIES: ModuleCategory[] = [
  "crm",
  "erp",
  "hrm",
  "hospital",
  "school",
  "restaurant",
  "real_estate",
  "accounting",
];
