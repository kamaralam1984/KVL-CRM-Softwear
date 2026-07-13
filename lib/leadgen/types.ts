// Shared types for the auto lead-generation pipeline.

// A raw lead as pulled from any source (Google Maps, Apollo, scraping, forms).
// Sources are "dumb" — they only collect. Scoring/enrichment happens later.
export type RawLead = {
  name: string;              // contact or business name
  company: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  category?: string;         // e.g. "dentist", "gym", "saas"
  source: LeadSource;        // where it came from
  sourceId?: string;         // stable id from the source (for dedupe)
  raw?: Record<string, unknown>; // original payload, for debugging

  // --- Phase 1 enrichment fields (all optional, backward compatible) ---
  industry?: string;
  location?: string;             // city / region / country
  decisionMaker?: DecisionMaker; // primary contact person
  socialLinks?: SocialLinks;
  employeeCount?: number;        // best estimate
  revenueEstimate?: string;      // e.g. "$1M-$5M"
  techStack?: string[];          // detected technologies
};

export type DecisionMaker = {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
};

export type SocialLinks = {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
};

// All 19 supported lead sources (Phase 1). Additive — existing keys unchanged.
export type LeadSource =
  | "google_maps"
  | "apollo"
  | "hunter"
  | "web_form"
  | "scrape"
  | "linkedin"
  | "crunchbase"
  | "goodfirms"
  | "clutch"
  | "indiamart"
  | "tradeindia"
  | "startup_india"
  | "mca"
  | "google_search"
  | "google_news"
  | "company_website"
  | "manual_import"
  | "csv_import"
  | "api_import";

// The finished, scored lead — shaped to match the CRM `leads` table.
export type ScoredLead = {
  name: string;
  company: string;
  email: string;
  phone: string;
  score: number;             // 0-100, from AI
  status: "hot" | "warm" | "cold";
  stage: string;             // always "Discovery" for fresh leads
  value: number;             // estimated deal value (AI guess)
  owner: string;
  avatar: string;            // initials
  lastContact: string;
  tags: string[];
  source: LeadSource;
  reason?: string;           // AI's one-line justification for the score
};
