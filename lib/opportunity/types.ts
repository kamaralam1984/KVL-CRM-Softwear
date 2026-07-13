// Shared types for the AI Opportunity Engine (Phase 3).
// Consumes a Phase-2 WebsiteAnalysis (+ Phase-1 enriched RawLead) to detect
// business gaps and turn them into concrete, sellable service recommendations.

import type { WebsiteAnalysis } from "@/lib/analyzer/types";
import type { RawLead } from "@/lib/leadgen/types";

// The 11 gap signals we detect.
export type GapKey =
  | "old_website"
  | "no_crm"
  | "no_erp"
  | "no_mobile_app"
  | "poor_seo"
  | "no_whatsapp"
  | "no_chatbot"
  | "no_booking"
  | "no_online_payment"
  | "no_analytics"
  | "no_security_headers";

export type OpportunityGap = {
  key: GapKey;
  label: string;         // human label, e.g. "No CRM detected"
  missing: boolean;      // true = the thing is absent (an opportunity)
  severity: "high" | "medium" | "low";
  evidence: string;      // why we concluded this
};

// A service we can pitch, derived from gaps.
export type ServiceKey =
  | "website_redesign"
  | "crm"
  | "erp"
  | "seo"
  | "digital_marketing"
  | "mobile_app"
  | "whatsapp_automation"
  | "chatbot"
  | "online_payment"
  | "booking_system"
  | "analytics_setup"
  | "security_hardening";

export type ServiceRecommendation = {
  key: ServiceKey;
  name: string;              // "Website Redesign"
  rationale: string;         // why this business needs it
  estimatedValue: number;    // deal value in USD
  priority: "high" | "medium" | "low";
  fromGaps: GapKey[];        // which gaps triggered it
};

export type OpportunityReport = {
  company: string;
  website?: string;
  industry?: string;
  gaps: OpportunityGap[];              // only the missing ones (opportunities)
  services: ServiceRecommendation[];   // ranked, highest value/priority first
  opportunityScore: number;            // 0-100 (from analysis / gap density)
  totalPotentialValue: number;         // sum of service estimatedValue
  headline: string;                    // "Strong candidate for: CRM, SEO, Mobile App"
  aiRecommendation: string;            // narrative pitch (AI or heuristic)
  usedAi: boolean;
  analysis?: WebsiteAnalysis;          // the underlying scan (optional)
  generatedAt: number;
};

export type OpportunityInput = {
  lead: RawLead;
  analysis?: WebsiteAnalysis;   // pass a pre-computed scan, else engine will scan
};
