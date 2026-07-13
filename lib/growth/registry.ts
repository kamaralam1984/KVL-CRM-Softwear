// Growth Platform registry (Phase 16).
// A single typed source of truth describing every AI Growth Platform capability
// added on top of the base CRM. Pure data — safe to import anywhere. Useful for
// a platform-status page, feature gating, and documentation. Adding modules here
// does not change any existing behaviour.

export type PhaseStatus = "live" | "live_mock" | "planned";

export type GrowthCapability = {
  phase: number;
  key: string;
  name: string;
  module: string;          // lib path
  apiRoute?: string;       // primary route handler
  envKeys: string[];       // external keys that upgrade it from mock → real
  status: PhaseStatus;     // live = works standalone; live_mock = needs keys for real data
  summary: string;
};

export const GROWTH_CAPABILITIES: GrowthCapability[] = [
  { phase: 1, key: "lead_intelligence", name: "Lead Intelligence Engine", module: "lib/leadgen", apiRoute: "/api/leadgen/run", envKeys: ["GOOGLE_MAPS_API_KEY", "APOLLO_API_KEY", "HUNTER_API_KEY", "SERPER_API_KEY", "PROXYCURL_API_KEY", "CRUNCHBASE_API_KEY"], status: "live_mock", summary: "19 lead sources + enrichment + CSV/manual/API import." },
  { phase: 2, key: "website_analyzer", name: "AI Website Analyzer", module: "lib/analyzer", apiRoute: "/api/analyzer/scan", envKeys: ["PAGESPEED_API_KEY"], status: "live_mock", summary: "SEO/speed/security/tech scores + Business Opportunity Score." },
  { phase: 3, key: "opportunity_engine", name: "AI Opportunity Engine", module: "lib/opportunity", apiRoute: "/api/opportunity/analyze", envKeys: ["ANTHROPIC_API_KEY"], status: "live", summary: "11 gap signals → ranked service recommendations + deal value." },
  { phase: 4, key: "lead_scoring", name: "AI Lead Scoring", module: "lib/scoring", apiRoute: "/api/scoring/score", envKeys: ["ANTHROPIC_API_KEY"], status: "live", summary: "Score, temperature, confidence, close probability, priority, factors." },
  { phase: 5, key: "ai_outreach", name: "AI Outreach", module: "lib/outreach", apiRoute: "/api/outreach/generate", envKeys: ["ANTHROPIC_API_KEY"], status: "live", summary: "Email/WhatsApp/SMS/LinkedIn/follow-up/proposal-intro copy." },
  { phase: 6, key: "sales_assistant", name: "AI Sales Assistant", module: "lib/assistant", apiRoute: "/api/assistant/ask", envKeys: ["ANTHROPIC_API_KEY"], status: "live", summary: "Answers pricing/timeline/hosting/AMC; builds quick quotes." },
  { phase: 7, key: "documents", name: "Proposal & Document Generator", module: "lib/documents", apiRoute: "/api/documents/generate", envKeys: [], status: "live", summary: "Proposal/quote/invoice/agreement/NDA/AMC → HTML/PDF/DOCX." },
  { phase: 8, key: "marketing", name: "Marketing Automation", module: "lib/marketing", apiRoute: "/api/marketing/campaign", envKeys: ["META_ACCESS_TOKEN", "GOOGLE_ADS_TOKEN", "RESEND_API_KEY", "TWILIO_ACCOUNT_SID"], status: "live_mock", summary: "FB/IG/LinkedIn/Google Ads/Email/WhatsApp campaigns + analytics." },
  { phase: 9, key: "advisor", name: "AI Business Advisor", module: "lib/advisor", apiRoute: "/api/advisor/daily", envKeys: ["ANTHROPIC_API_KEY"], status: "live", summary: "Daily briefing: revenue, pipeline, hot leads, risks, growth ideas." },
  { phase: 10, key: "executive", name: "Executive Metrics", module: "lib/executive", apiRoute: "/api/executive/metrics", envKeys: [], status: "live", summary: "Forecast, cashflow, conversion, growth, today's numbers." },
  { phase: 11, key: "voice", name: "Voice AI", module: "lib/voice", apiRoute: "/api/voice/call", envKeys: ["OPENAI_API_KEY", "ELEVENLABS_API_KEY", "TWILIO_ACCOUNT_SID"], status: "live_mock", summary: "AI calling + call summary/sentiment/action items." },
  { phase: 12, key: "meetings", name: "Meeting Intelligence", module: "lib/meetings", apiRoute: "/api/meetings/process", envKeys: ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"], status: "live_mock", summary: "Transcript → summary/key points/action items → CRM tasks." },
  { phase: 13, key: "whitelabel", name: "White Label", module: "lib/whitelabel", apiRoute: "/api/whitelabel/tenants", envKeys: [], status: "live", summary: "Multi-tenant branding, domain, SMTP, WhatsApp per company." },
  { phase: 14, key: "marketplace", name: "Marketplace", module: "lib/marketplace", apiRoute: "/api/marketplace", envKeys: [], status: "live", summary: "Installable modules: ERP/HRM/Hospital/School/Restaurant/etc." },
  { phase: 15, key: "security", name: "Enterprise Security", module: "lib/security", apiRoute: "/api/security/audit", envKeys: [], status: "live", summary: "RBAC, TOTP 2FA, audit log, rate limiting." },
  { phase: 16, key: "architecture", name: "Enterprise Architecture", module: "components/ui + lib/growth", envKeys: [], status: "live", summary: "Reusable UI primitives + platform registry + docs." },
];

export const getCapability = (key: string) =>
  GROWTH_CAPABILITIES.find((c) => c.key === key);

export const liveCapabilities = () =>
  GROWTH_CAPABILITIES.filter((c) => c.status !== "planned");
