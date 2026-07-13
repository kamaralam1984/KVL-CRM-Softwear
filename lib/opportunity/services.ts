// Phase 3 — AI Opportunity Engine: gap → service mapping.
// Turns detected (MISSING) business gaps into concrete, sellable service
// recommendations with a size- and industry-scaled deal value. Deterministic.

import type {
  GapKey,
  OpportunityGap,
  ServiceKey,
  ServiceRecommendation,
} from "./types";
import type { RawLead } from "@/lib/leadgen/types";

// Which service(s) each gap unlocks. One gap can trigger several services.
const GAP_TO_SERVICES: Record<GapKey, ServiceKey[]> = {
  old_website: ["website_redesign"],
  no_crm: ["crm"],
  no_erp: ["erp"],
  poor_seo: ["seo", "digital_marketing"],
  no_mobile_app: ["mobile_app"],
  no_whatsapp: ["whatsapp_automation"],
  no_chatbot: ["chatbot"],
  no_online_payment: ["online_payment"],
  no_booking: ["booking_system"],
  no_analytics: ["analytics_setup"],
  no_security_headers: ["security_hardening"],
};

const SERVICE_NAMES: Record<ServiceKey, string> = {
  website_redesign: "Website Redesign",
  crm: "CRM Implementation",
  erp: "ERP System",
  seo: "SEO Optimization",
  digital_marketing: "Digital Marketing",
  mobile_app: "Mobile App Development",
  whatsapp_automation: "WhatsApp Automation",
  chatbot: "AI Chatbot",
  online_payment: "Online Payments",
  booking_system: "Booking System",
  analytics_setup: "Analytics Setup",
  security_hardening: "Security Hardening",
};

// Base list price (USD) for a mid-size (10-50 employee) engagement.
const BASE_PRICE: Record<ServiceKey, number> = {
  website_redesign: 2500,
  crm: 4000,
  erp: 12000,
  seo: 1500,
  digital_marketing: 2000,
  mobile_app: 8000,
  whatsapp_automation: 1000,
  chatbot: 1200,
  online_payment: 800,
  booking_system: 900,
  analytics_setup: 500,
  security_hardening: 700,
};

// Company-size multiplier from employee headcount.
function sizeFactor(employeeCount?: number): number {
  if (employeeCount == null) return 1;
  if (employeeCount < 10) return 0.7;
  if (employeeCount <= 50) return 1;
  if (employeeCount <= 200) return 1.8;
  if (employeeCount <= 1000) return 3;
  return 5;
}

// Small industry factor — some verticals command a premium for custom builds.
function industryFactor(lead: RawLead): number {
  const raw = (lead.industry ?? lead.category ?? "").toLowerCase();
  if (!raw) return 1;
  if (/(fintech|finance|bank|insurance|health|medical|pharma)/.test(raw)) return 1.3;
  if (/(saas|software|technology|it|ecommerce|e-commerce|retail)/.test(raw)) return 1.15;
  if (/(manufactur|logistics|real ?estate|construction)/.test(raw)) return 1.1;
  if (/(restaurant|salon|gym|local|nonprofit|non-profit)/.test(raw)) return 0.9;
  return 1;
}

function estimateValue(service: ServiceKey, lead: RawLead): number {
  const raw = BASE_PRICE[service] * sizeFactor(lead.employeeCount) * industryFactor(lead);
  // Round to the nearest $50 for a clean quote.
  return Math.round(raw / 50) * 50;
}

const PRIORITY_RANK: Record<ServiceRecommendation["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// Keep the strongest severity when several gaps feed one service.
function strongerPriority(
  a: ServiceRecommendation["priority"],
  b: ServiceRecommendation["priority"],
): ServiceRecommendation["priority"] {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

export function recommendServices(
  gaps: OpportunityGap[],
  lead: RawLead,
): ServiceRecommendation[] {
  const byService = new Map<ServiceKey, ServiceRecommendation>();

  for (const gap of gaps) {
    if (!gap.missing) continue; // only missing gaps are opportunities
    const services = GAP_TO_SERVICES[gap.key];
    if (!services) continue;

    for (const key of services) {
      const existing = byService.get(key);
      if (existing) {
        // Dedupe: merge the triggering gap + keep the strongest priority.
        if (!existing.fromGaps.includes(gap.key)) existing.fromGaps.push(gap.key);
        existing.priority = strongerPriority(existing.priority, gap.severity);
      } else {
        byService.set(key, {
          key,
          name: SERVICE_NAMES[key],
          rationale: gap.evidence || gap.label,
          estimatedValue: estimateValue(key, lead),
          priority: gap.severity,
          fromGaps: [gap.key],
        });
      }
    }
  }

  const list = Array.from(byService.values());

  // Sort by priority, then estimated value — both descending.
  list.sort((a, b) => {
    const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (p !== 0) return p;
    return b.estimatedValue - a.estimatedValue;
  });

  return list;
}
