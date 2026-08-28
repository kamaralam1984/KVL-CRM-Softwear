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
  // Phase 18+ — GoHighLevel-parity roadmap (docs/GHL_PARITY_STATUS.md). Phase 17
  // (Lead Intelligence & Acquisition Engine) predates this registry entry style
  // and is tracked in docs/ACQUISITION_ENGINE_ROADMAP.md instead.
  { phase: 18, key: "rbac_enforcement", name: "Server-Side Auth & RBAC Enforcement", module: "lib/security/{session,requireAction,demoToken}", envKeys: [], status: "live_mock", summary: "Bearer-token auth + rbac.can() now enforced in invoices/team/integrations actions (soft-mode when no token, so untouched call sites keep working). Rolls out to remaining lib/actions/*.ts file-by-file in later phases." },
  { phase: 19, key: "automation_core", name: "Automation Core (DB-backed)", module: "lib/actions/workflows.ts, lib/automation/store.ts", envKeys: [], status: "live", summary: "Workflow run log + active-toggle now dual-write to Supabase (workflows/workflow_runs tables); server-triggered runs finally show up in the run feed." },
  { phase: 20, key: "workflow_builder", name: "Visual Drag-Drop Workflow Builder", module: "lib/automation/graph/*", envKeys: [], status: "live", summary: "Real @xyflow/react canvas + interpreter, persisted to workflow_graphs. Replaced the previous fully-mock BuilderView." },
  { phase: 21, key: "conversations", name: "Unified Conversations + real WhatsApp/SMS", module: "lib/messaging, lib/actions/conversations.ts", apiRoute: "/api/whatsapp/inbound", envKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM", "TWILIO_SMS_FROM"], status: "live_mock", summary: "Real inbound (Twilio-signature-verified webhook) + outbound send; dual-writes into the existing WhatsApp CRM section's table so it's visible today." },
  { phase: 22, key: "missed_call_text_back", name: "Missed-Call Auto Text-Back", module: "lib/telephony/autoReply.ts", apiRoute: "/api/telephony/missed-call", envKeys: ["MISSED_CALL_WEBHOOK_SECRET"], status: "live_mock", summary: "Auto WhatsApp/SMS reply + callback task on every missed call. Needs a telephony provider account (Exotel/Knowlarity/MyOperator) to receive real calls." },
  { phase: 23, key: "live_chat_widget", name: "Public Live-Chat Widget", module: "public/kvl-chat.js, app/api/webchat/*", envKeys: [], status: "live", summary: "Embeddable, multi-tenant chat bubble; real agent-side inbox in KVlHelpdesk's Live Chat tab (replaced its previous fully-mock CHAT_SESSIONS)." },
  { phase: 24, key: "page_builder", name: "Funnel / Landing-Page Builder", module: "lib/pages, components/crm/sections/KVlPages.tsx", apiRoute: "/p/[slug]", envKeys: [], status: "live", summary: "Real drag-drop block canvas (@dnd-kit), persisted, publicly rendered with a working lead-capture form. Replaced the previous fully-mock Builder tab." },
  { phase: 25, key: "social_planner", name: "Social Planner (real publish)", module: "lib/social/publish.ts, lib/actions/socialPosts.ts", apiRoute: "/api/social/cron", envKeys: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN", "META_INSTAGRAM_USER_ID", "LINKEDIN_ACCESS_TOKEN", "LINKEDIN_ORGANIZATION_URN"], status: "live_mock", summary: "Wires Social.tsx's content-calendar UI to real Facebook/Instagram/LinkedIn organic publish + scheduling cron." },
  { phase: 26, key: "reputation", name: "Reputation Management", module: "lib/reputation/*", apiRoute: "/api/integrations/google-business/callback", envKeys: ["GOOGLE_BUSINESS_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_SECRET", "ANTHROPIC_API_KEY"], status: "live_mock", summary: "New section: Google Business review pull, AI-drafted replies (human-approved), WhatsApp/SMS review requests." },
  { phase: 27, key: "commerce", name: "Commerce I: Orders + Razorpay Payments", module: "lib/payments/razorpay.ts, lib/commerce/text2pay.ts", apiRoute: "/api/integrations/razorpay/webhook", envKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"], status: "live_mock", summary: "Real orders/products/payment-links, replacing KVlCommerce.tsx's previous fully-mock data. Text-2-Pay wired." },
  { phase: 28, key: "commerce_ii", name: "Commerce II: Gift Cards, Loyalty, Upsell", module: "lib/actions/giftCards.ts, lib/actions/loyalty.ts, lib/commerce/upsellFlow.ts", envKeys: [], status: "live", summary: "Gift card issue/redeem, append-only loyalty ledger, funnel upsell/downsell redirect wiring." },
  { phase: 29, key: "membership", name: "Membership & Courses", module: "lib/actions/membership.ts", apiRoute: "/member/[tierId]", envKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], status: "live_mock", summary: "New section: tiers, Razorpay Subscriptions billing, drip course content, gated viewer." },
  { phase: 30, key: "affiliates", name: "Affiliate Manager", module: "lib/affiliates/*", envKeys: [], status: "live", summary: "New section: UTM-based referral tracking, auto-created commissions, manual payout ledger." },
  { phase: 31, key: "saas_mode", name: "SaaS Mode: Tenant Billing & Self-Signup", module: "lib/whitelabel/store.ts, lib/actions/tenants.ts", apiRoute: "/signup/[plan]", envKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], status: "live_mock", summary: "White-label tenants now Supabase-backed (was localStorage-only); real self-serve signup + Razorpay Subscription." },
  { phase: 32, key: "utility_batch", name: "Utility Batch", module: "lib/telephony/ringlessVoicemail.ts, lib/ai/businessCardScan.ts, lib/utils/qr.ts", apiRoute: "/api/ai/business-card", envKeys: ["RVM_GATEWAY_URL", "RVM_USERNAME", "RVM_PASSWORD", "ANTHROPIC_API_KEY"], status: "live_mock", summary: "Ringless voicemail, AI business-card scanner (wired into Leads), QR generator (powers Tap-2-Pay)." },
  { phase: 33, key: "seasonal_campaigns", name: "Birthday/Seasonal Auto-Campaigns", module: "lib/outreach/templates/seasonal.ts", apiRoute: "/api/outreach/recurring-cron", envKeys: [], status: "live_mock", summary: "Daily cron sends real birthday WhatsApp/SMS; seasonal campaign firing honestly logged pending a channel/message field on the acquisition campaigns table." },
  { phase: 34, key: "pwa", name: "Mobile: PWA Hardening", module: "public/manifest.json, components/crm/InstallPrompt.tsx", envKeys: [], status: "live", summary: "Installable PWA (manifest + install prompt) with a conservative navigation-only offline fallback — never caches live CRM data. Native app-store distribution stays explicitly out of code-scope." },
];

// Phase 18-34 (GoHighLevel-parity roadmap) status: all 17 phases complete.
// See docs/GHL_PARITY_STATUS.md for the full per-phase verification record.

export const getCapability = (key: string) =>
  GROWTH_CAPABILITIES.find((c) => c.key === key);

export const liveCapabilities = () =>
  GROWTH_CAPABILITIES.filter((c) => c.status !== "planned");
