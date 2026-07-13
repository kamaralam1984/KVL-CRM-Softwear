// Phase 9 — AI Business Advisor (daily digest).
// Shape of the briefing the advisor produces each morning from real CRM data.

export type HotLead = {
  name: string;
  company: string;
  score: number;
};

export type DailyBriefing = {
  date: string;
  summary: string;
  revenue: {
    invoiced: number;
    collected: number;
    pending: number;
  };
  pipeline: {
    open: number;
    value: number;
    won: number;
  };
  hotLeads: HotLead[];
  risks: string[];
  suggestions: string[];
  growthOpportunities: string[];
  usedAi: boolean;
};
