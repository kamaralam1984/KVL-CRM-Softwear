// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 3 (Identity Resolution)

export interface VisitorIdentityLink {
  id: number;
  visitor_id: string;
  lead_id: number;
  matched_on: "phone" | "email" | "new";
  matched_at: string;
}

export interface IdentityResolution {
  leadId: number;
  matchedOn: "phone" | "email" | "new";
}
