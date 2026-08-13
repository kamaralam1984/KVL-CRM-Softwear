// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 10 (Multi-Tenant Embed)

export interface Site {
  id: number;
  site_id: string;
  name: string;
  owner_email: string;
  domains: string[];
  active: boolean;
  created_at: string;
}
