// Phase 14 — Marketplace catalog of installable modules.
// Curated list with at least one module per category. The CRM core is the
// only module installed + enabled by default; everything else ships disabled
// so tenants can opt-in from the marketplace.

import type { MarketplaceModule } from "./types";

export const CATALOG: MarketplaceModule[] = [
  {
    id: "crm-core",
    name: "CRM Core",
    category: "crm",
    description:
      "The heart of your workspace — leads, contacts, deals and a visual sales pipeline that keeps every relationship moving forward.",
    icon: "🤝",
    version: "3.2.0",
    price: 0,
    installed: true,
    enabled: true,
    features: [
      "Lead capture & scoring",
      "Contact & company records",
      "Drag-and-drop deal pipeline",
      "Tasks, notes & activity timeline",
      "Email & WhatsApp inbox",
    ],
  },
  {
    id: "erp-suite",
    name: "ERP Suite",
    category: "erp",
    description:
      "Unify inventory, purchasing and order fulfilment. Track stock across warehouses and turn quotes into fulfilled orders without leaving the CRM.",
    icon: "🏭",
    version: "2.1.0",
    price: 149,
    installed: false,
    enabled: false,
    features: [
      "Multi-warehouse inventory",
      "Purchase orders & vendors",
      "Sales order fulfilment",
      "Stock alerts & reorder points",
      "Barcode / SKU management",
    ],
  },
  {
    id: "hrm-people",
    name: "HRM People",
    category: "hrm",
    description:
      "Manage the full employee lifecycle — from onboarding and attendance to leave, payroll runs and performance reviews.",
    icon: "👥",
    version: "1.8.3",
    price: 89,
    installed: false,
    enabled: false,
    features: [
      "Employee directory & profiles",
      "Attendance & shift tracking",
      "Leave requests & approvals",
      "Payroll processing",
      "Performance reviews",
    ],
  },
  {
    id: "hospital-care",
    name: "Hospital Care",
    category: "hospital",
    description:
      "A clinical operations module covering patient records, appointment scheduling and billing for clinics and hospitals.",
    icon: "🏥",
    version: "1.4.0",
    price: 199,
    installed: false,
    enabled: false,
    features: [
      "Patient EMR records",
      "Doctor appointment scheduling",
      "Prescriptions & lab orders",
      "Ward & bed management",
      "Insurance & billing",
    ],
  },
  {
    id: "school-manager",
    name: "School Manager",
    category: "school",
    description:
      "Run admissions, classes and exams end-to-end. Keep students, parents and teachers connected with grades and fee tracking.",
    icon: "🎓",
    version: "2.0.1",
    price: 79,
    installed: false,
    enabled: false,
    features: [
      "Student admissions & enrolment",
      "Class & timetable scheduling",
      "Exams & gradebook",
      "Fee collection & receipts",
      "Parent-teacher messaging",
    ],
  },
  {
    id: "restaurant-pos",
    name: "Restaurant POS",
    category: "restaurant",
    description:
      "Front-of-house point of sale with table management, kitchen tickets and menu engineering for cafes and restaurants.",
    icon: "🍽️",
    version: "1.6.2",
    price: 69,
    installed: false,
    enabled: false,
    features: [
      "Table & floor plan management",
      "Menu & modifiers",
      "Kitchen order tickets (KOT)",
      "Split bills & payments",
      "Daily sales reports",
    ],
  },
  {
    id: "real-estate-hub",
    name: "Real Estate Hub",
    category: "real_estate",
    description:
      "Manage property listings, matched buyer enquiries and site visits, then close with commission tracking built in.",
    icon: "🏠",
    version: "1.3.0",
    price: 99,
    installed: false,
    enabled: false,
    features: [
      "Property & listing catalog",
      "Buyer / tenant matching",
      "Site visit scheduling",
      "Offers & agreements",
      "Commission tracking",
    ],
  },
  {
    id: "accounting-books",
    name: "Accounting Books",
    category: "accounting",
    description:
      "Double-entry bookkeeping with invoicing, expenses and tax-ready financial statements that sync from your CRM deals.",
    icon: "📊",
    version: "2.4.1",
    price: 119,
    installed: false,
    enabled: false,
    features: [
      "Chart of accounts & ledgers",
      "Invoices & payments",
      "Expense & bill tracking",
      "Tax / GST reporting",
      "Profit & loss / balance sheet",
    ],
  },
];
