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
};

export type LeadSource =
  | "google_maps"
  | "apollo"
  | "hunter"
  | "web_form"
  | "scrape";

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
