// lib/assistant/knowledge.ts
//
// SALES_KB — the structured, EDITABLE sales knowledge base that grounds the
// AI Sales Assistant (Phase 6). This is DEFAULT content: a super-admin can
// later override any field from an admin UI / DB without touching code.
//
// Service keys mirror Phase-3 `ServiceKey` (lib/opportunity/types.ts) so quotes
// and pitches line up with the opportunity engine. All prices are indicative
// ranges in USD and contain NO secrets.

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

// A price band for a single service. `typical` is what we quote by default.
export type PricePoint = {
  service: ServiceKey;
  label: string; // human-friendly name, e.g. "Website Redesign"
  min: number; // low end (USD)
  max: number; // high end (USD)
  typical: number; // default figure used for quick quotes
  unit: "project" | "monthly"; // one-off build vs recurring
  note?: string;
};

// Delivery timeline for a service, expressed in weeks.
export type Timeline = {
  service: ServiceKey;
  label: string;
  minWeeks: number;
  maxWeeks: number;
  note?: string;
};

// A hosting option the prospect can choose.
export type HostingOption = {
  id: string;
  label: string;
  monthly: number; // USD / month
  description: string;
  bestFor: string;
};

// A maintenance / AMC (Annual Maintenance Contract) tier.
export type MaintenanceTier = {
  id: string;
  label: string;
  // Annual fee as a percentage of the original project value.
  annualPctOfProject: number;
  monthlyFrom: number; // floor monthly retainer (USD)
  includes: string[];
  responseSla: string;
};

export type Faq = {
  q: string;
  a: string;
  tags: string[];
};

export type SalesKB = {
  currency: string;
  companyBlurb: string;
  pricing: PricePoint[];
  timelines: Timeline[];
  hosting: HostingOption[];
  maintenance: MaintenanceTier[];
  faqs: Faq[];
};

export const SALES_KB: SalesKB = {
  currency: "USD",
  companyBlurb:
    "We are a full-service digital studio that designs, builds, and maintains " +
    "high-performing websites, custom CRM/ERP platforms, and growth marketing " +
    "systems for growing businesses.",

  pricing: [
    { service: "website_redesign", label: "Website Redesign", min: 2500, max: 15000, typical: 6000, unit: "project", note: "Design + build of a modern, responsive marketing site." },
    { service: "crm", label: "Custom CRM Platform", min: 8000, max: 45000, typical: 18000, unit: "project", note: "Pipeline, contacts, automation, and reporting tailored to your workflow." },
    { service: "erp", label: "ERP System", min: 15000, max: 90000, typical: 40000, unit: "project", note: "Inventory, finance, HR, and operations modules integrated end-to-end." },
    { service: "seo", label: "SEO Program", min: 800, max: 4000, typical: 1500, unit: "monthly", note: "On-page, technical, and content SEO on a monthly retainer." },
    { service: "digital_marketing", label: "Digital Marketing", min: 1000, max: 6000, typical: 2500, unit: "monthly", note: "Paid + organic campaigns, creative, and reporting. Ad spend billed separately." },
    { service: "mobile_app", label: "Mobile App", min: 12000, max: 60000, typical: 28000, unit: "project", note: "Native or cross-platform iOS/Android app." },
    { service: "whatsapp_automation", label: "WhatsApp Automation", min: 1500, max: 8000, typical: 3500, unit: "project", note: "Automated messaging flows, broadcasts, and CRM sync." },
    { service: "chatbot", label: "AI Chatbot", min: 2000, max: 12000, typical: 5000, unit: "project", note: "Trained conversational assistant for sales/support on your site." },
    { service: "online_payment", label: "Online Payments", min: 1500, max: 7000, typical: 3000, unit: "project", note: "Checkout, subscriptions, and gateway integration." },
    { service: "booking_system", label: "Booking System", min: 2000, max: 10000, typical: 4500, unit: "project", note: "Scheduling, calendar sync, and automated reminders." },
    { service: "analytics_setup", label: "Analytics Setup", min: 800, max: 4000, typical: 1800, unit: "project", note: "Tracking, dashboards, and conversion instrumentation." },
    { service: "security_hardening", label: "Security Hardening", min: 1200, max: 9000, typical: 3500, unit: "project", note: "Audit, remediation, SSL, backups, and monitoring." },
  ],

  timelines: [
    { service: "website_redesign", label: "Website Redesign", minWeeks: 3, maxWeeks: 8 },
    { service: "crm", label: "Custom CRM Platform", minWeeks: 6, maxWeeks: 16 },
    { service: "erp", label: "ERP System", minWeeks: 10, maxWeeks: 28 },
    { service: "seo", label: "SEO Program", minWeeks: 4, maxWeeks: 24, note: "Ongoing; first results typically in 8-12 weeks." },
    { service: "digital_marketing", label: "Digital Marketing", minWeeks: 2, maxWeeks: 4, note: "Ramp-up; campaigns run continuously thereafter." },
    { service: "mobile_app", label: "Mobile App", minWeeks: 8, maxWeeks: 20 },
    { service: "whatsapp_automation", label: "WhatsApp Automation", minWeeks: 2, maxWeeks: 5 },
    { service: "chatbot", label: "AI Chatbot", minWeeks: 2, maxWeeks: 6 },
    { service: "online_payment", label: "Online Payments", minWeeks: 2, maxWeeks: 5 },
    { service: "booking_system", label: "Booking System", minWeeks: 3, maxWeeks: 7 },
    { service: "analytics_setup", label: "Analytics Setup", minWeeks: 1, maxWeeks: 3 },
    { service: "security_hardening", label: "Security Hardening", minWeeks: 1, maxWeeks: 4 },
  ],

  hosting: [
    { id: "managed_cloud", label: "Managed Cloud Hosting", monthly: 49, description: "Fully managed hosting on modern cloud infra with CDN, SSL, daily backups, and 99.9% uptime.", bestFor: "Most marketing sites and small apps." },
    { id: "business_cloud", label: "Business Cloud", monthly: 149, description: "Scalable hosting with staging environment, enhanced monitoring, and priority resources.", bestFor: "CRM/ERP platforms and higher-traffic sites." },
    { id: "enterprise", label: "Enterprise / Dedicated", monthly: 499, description: "Dedicated infrastructure, custom scaling, SLA-backed support, and compliance options.", bestFor: "Mission-critical ERP and high-volume applications." },
    { id: "self_hosted", label: "Self-Hosted (Your Cloud)", monthly: 0, description: "We deploy to your own AWS/GCP/Azure account; you pay the cloud provider directly.", bestFor: "Teams with an existing cloud footprint or strict data-residency needs." },
  ],

  maintenance: [
    { id: "essential", label: "Essential AMC", annualPctOfProject: 12, monthlyFrom: 99, includes: ["Security patches & updates", "Uptime monitoring", "Monthly backups check", "Email support"], responseSla: "2 business days" },
    { id: "standard", label: "Standard AMC", annualPctOfProject: 18, monthlyFrom: 249, includes: ["Everything in Essential", "Bug fixes", "Minor content/feature tweaks (up to 4 hrs/mo)", "Quarterly performance review"], responseSla: "1 business day" },
    { id: "premium", label: "Premium AMC", annualPctOfProject: 25, monthlyFrom: 599, includes: ["Everything in Standard", "Priority support", "Dedicated hours (up to 12 hrs/mo)", "Monthly reporting & roadmap call"], responseSla: "4 business hours" },
  ],

  faqs: [
    { q: "How much does a project cost?", a: "Pricing depends on scope. Simple websites start around $2,500; custom CRM builds typically run $8,000-$45,000; ERP systems scale higher. We give a firm quote after a short discovery call.", tags: ["pricing", "cost", "budget", "quote"] },
    { q: "How long does delivery take?", a: "Websites usually take 3-8 weeks; CRM platforms 6-16 weeks; ERP systems 10-28 weeks. We share a milestone timeline before kickoff.", tags: ["timeline", "delivery", "how long", "weeks", "duration"] },
    { q: "Do you provide hosting?", a: "Yes. Managed cloud hosting starts at $49/mo with SSL, CDN, and daily backups. We can also deploy to your own cloud account if you prefer.", tags: ["hosting", "server", "cloud", "deploy", "uptime"] },
    { q: "What about ongoing maintenance?", a: "We offer AMC (Annual Maintenance Contract) tiers covering updates, security, monitoring, and support. Annual fees run 12-25% of the project value, from $99/mo.", tags: ["maintenance", "amc", "support", "updates", "annual"] },
    { q: "Do you offer support after launch?", a: "Every project includes a warranty period, and our AMC plans provide continued support with response SLAs from 4 business hours.", tags: ["support", "maintenance", "sla", "after launch", "warranty"] },
    { q: "Can you integrate with our existing tools?", a: "Yes. We routinely integrate payment gateways, WhatsApp, analytics, and third-party APIs into CRM/ERP and web builds.", tags: ["features", "integration", "api", "tools"] },
    { q: "What features can you build?", a: "Websites, custom CRM/ERP, mobile apps, AI chatbots, WhatsApp automation, online payments, booking systems, analytics, and security hardening.", tags: ["features", "capabilities", "what can you build", "services"] },
  ],
};
