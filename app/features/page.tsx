import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features — KVl CRM | Complete CRM Feature List",
  description: "Explore all features of KVl CRM: AI-powered lead scoring, WhatsApp CRM, email marketing, sales pipeline, workflow automation, finance, and advanced analytics. Built for modern sales teams.",
  keywords: "CRM features, AI CRM, sales pipeline software, WhatsApp CRM, email marketing CRM, lead scoring, workflow automation, sales analytics, CRM software features",
  openGraph: {
    title: "KVl CRM Features — Everything Your Sales Team Needs",
    description: "Discover the complete feature set of KVl CRM — from AI insights to WhatsApp integration, email campaigns, pipeline management, and finance tools.",
    type: "website",
  },
};

const features = [
  {
    category: "Artificial Intelligence",
    items: [
      { name: "AI Lead Scoring", desc: "Our proprietary AI engine analyzes over 40 behavioral signals — email opens, page visits, response time, deal stage duration — to assign a real-time score (0–100) to every lead. Reps only focus on leads most likely to convert, increasing efficiency by up to 60%." },
      { name: "Revenue Forecasting", desc: "KVl CRM predicts monthly and quarterly revenue with up to 91% confidence by analyzing your pipeline velocity, historical win rates, seasonal trends, and rep performance patterns. Get forecasts 30, 60, and 90 days out." },
      { name: "Churn Risk Detection", desc: "Automatically flags customers showing signs of disengagement — reduced logins, overdue invoices, support ticket spikes, or declining usage — so your team can intervene before it's too late." },
      { name: "Smart Recommendations", desc: "The AI Intelligence Hub delivers actionable weekly recommendations: best time to follow up, which deals to prioritize, which reps need coaching, and which automation workflows to enable." },
    ],
  },
  {
    category: "Sales Pipeline Management",
    items: [
      { name: "Visual Kanban Pipeline", desc: "Drag and drop deals across fully customizable stages: Prospect, Qualified, Demo, Proposal, Negotiation, and Closed. See deal value, age, and owner at a glance. Filter by rep, date range, deal size, or product line." },
      { name: "Multi-Pipeline Support", desc: "Run separate pipelines for different product lines, regions, or team structures. Each pipeline has independent stages, KPIs, and reporting dashboards." },
      { name: "Deal Aging Alerts", desc: "Deals that go stale automatically surface in your AI Insights panel with recommended next actions. No more deals falling through the cracks." },
      { name: "Win/Loss Analysis", desc: "Track why deals are won or lost, which competitors appear most often, and which objections your team faces. Use this data to refine your sales playbook every quarter." },
    ],
  },
  {
    category: "Lead Management",
    items: [
      { name: "360° Lead Profiles", desc: "Every lead gets a comprehensive profile: contact details, company info, interaction history, email opens, notes, tasks, deals, and AI score — all in one place." },
      { name: "Lead Capture & Import", desc: "Capture leads from web forms, CSV imports, manual entry, or API integrations. Auto-assign to reps based on territory, round-robin rules, or lead score thresholds." },
      { name: "Lead Segmentation", desc: "Segment leads by industry, company size, lead source, score range, or any custom field. Run targeted campaigns or assign specialized reps to each segment." },
    ],
  },
  {
    category: "WhatsApp CRM",
    items: [
      { name: "Unified WhatsApp Inbox", desc: "Manage all WhatsApp customer conversations directly inside KVl CRM. No switching between apps. See full contact context, deal status, and notes alongside every chat." },
      { name: "Broadcast Campaigns", desc: "Send personalized WhatsApp messages to segmented contact lists. Track delivery rates, read receipts, and response rates. Schedule broadcasts for optimal engagement times." },
      { name: "Auto-Reply Workflows", desc: "Create keyword-triggered auto-replies for common questions, appointment requests, or product inquiries. Works 24/7 so you never miss an incoming lead." },
    ],
  },
  {
    category: "Email Marketing",
    items: [
      { name: "Drag-and-Drop Campaign Builder", desc: "Design beautiful HTML email campaigns without coding. Choose from 50+ professionally designed templates or build from scratch with our visual editor." },
      { name: "Behavioral Triggers", desc: "Send automated emails when leads take specific actions — visit your pricing page, open a proposal, go inactive for 7 days, or reach a lead score threshold." },
      { name: "Analytics Dashboard", desc: "Track open rates, click-through rates, bounce rates, unsubscribes, and revenue attributed to each campaign. A/B test subject lines, send times, and CTAs." },
    ],
  },
  {
    category: "Workflow Automation",
    items: [
      { name: "Visual Automation Builder", desc: "Build multi-step automation sequences without coding. Trigger on events like 'deal stage changed', 'lead created', or 'invoice overdue'. Then add actions: send email, assign task, update field, notify rep, or create follow-up." },
      { name: "Pre-built Workflow Templates", desc: "Launch instantly with 20+ pre-built workflows: New Lead Welcome Sequence, Post-Demo Follow-Up, Churn Risk Alert, Deal Won Celebration, and more." },
      { name: "Automation Analytics", desc: "See exactly how many times each workflow has run, conversion rates at each step, and total time saved. Identify bottlenecks and optimize for better results." },
    ],
  },
  {
    category: "Finance & Invoicing",
    items: [
      { name: "Invoice Generation", desc: "Create professional invoices from deal data in seconds. Add line items, taxes, discounts, and payment terms. Send via email or WhatsApp directly from the platform." },
      { name: "Payment Tracking", desc: "Track paid, pending, and overdue invoices with automatic reminders. Get a real-time view of accounts receivable and cash flow projections." },
      { name: "Revenue Reporting", desc: "Detailed MRR, ARR, and revenue breakdown by product, region, rep, or customer segment. Export to CSV or PDF for board reporting." },
    ],
  },
  {
    category: "Team & Performance",
    items: [
      { name: "Rep Performance Dashboards", desc: "Individual scorecards for every sales rep: deals closed, revenue generated, pipeline size, win rate, average deal size, and activity metrics — all updated in real time." },
      { name: "Team Leaderboard", desc: "Motivate your team with a live leaderboard showing rankings by revenue, deals, or activity. Celebrate wins and spot underperformance early." },
      { name: "Coaching Insights", desc: "AI identifies which reps need coaching and on what — handling price objections, shortening the proposal stage, or improving email response rates." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">← KVl CRM</Link>
        <div className="flex gap-4">
          <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold text-blue-400 uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10">Complete Feature List</span>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            Every Feature Your Sales Team<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Will Ever Need</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            KVl CRM is not just a contact management tool. It is a complete revenue operating system designed to help sales teams prospect smarter, close faster, and retain customers longer — all powered by artificial intelligence.
          </p>
        </div>

        {/* Feature sections */}
        <div className="space-y-16">
          {features.map((section) => (
            <section key={section.category}>
              <h2 className="text-2xl font-black mb-6 text-white border-b border-white/[0.07] pb-3">
                {section.category}
              </h2>
              <div className="grid md:grid-cols-2 gap-5">
                {section.items.map((item) => (
                  <div key={item.name} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 hover:border-blue-500/20 transition-colors">
                    <h3 className="text-base font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Why KVl CRM */}
        <section className="mt-20 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/30 to-violet-950/20 p-12">
          <h2 className="text-3xl font-black mb-6 text-center">Why Teams Choose KVl CRM</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { stat: "3×", label: "Average Revenue Growth", desc: "Teams using KVl CRM grow revenue 3× faster than those on legacy CRM tools." },
              { stat: "40%", label: "Faster Deal Closing", desc: "AI-guided selling and automated follow-ups cut average sales cycle by 40%." },
              { stat: "68%", label: "Higher Win Rate", desc: "AI lead scoring ensures reps focus on the right prospects at the right time." },
            ].map((s) => (
              <div key={s.stat}>
                <p className="text-5xl font-black bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent mb-2">{s.stat}</p>
                <p className="text-sm font-bold text-white mb-1">{s.label}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold hover:opacity-90 transition-opacity">
              Start Your Free Trial →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="text-2xl font-black mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Does KVl CRM integrate with existing tools?", a: "Yes. KVl CRM integrates with Gmail, Outlook, Slack, Zapier, WhatsApp Business API, Stripe, and hundreds of other tools via our REST API and native integrations." },
              { q: "How is KVl CRM different from Salesforce or HubSpot?", a: "KVl CRM is purpose-built for modern sales teams that need AI-first features out of the box. Unlike legacy platforms that charge extra for AI add-ons, our intelligence layer is included in every plan — with no complex setup required." },
              { q: "Is there a mobile app?", a: "KVl CRM is a fully responsive web application that works perfectly on mobile browsers. A dedicated iOS and Android app is currently in development and will be available in Q3 2025." },
              { q: "Can I migrate data from my current CRM?", a: "Absolutely. We provide free data migration assistance for Growth and Enterprise plan customers. Our team handles the import, mapping, and validation of your existing contacts, deals, and activity history." },
            ].map((faq) => (
              <div key={faq.q} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <h3 className="text-sm font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-8 text-center text-xs text-slate-600">
        <div className="flex justify-center gap-6 mb-3">
          {[["Features","/features"],["Pricing","/pricing"],["Privacy Policy","/privacy"],["Terms","/terms"],["Contact","/contact"]].map(([l,h])=>(
            <Link key={l} href={h} className="hover:text-white transition-colors">{l}</Link>
          ))}
        </div>
        © 2025 KVl CRM · FreedomWithAI. All rights reserved.
      </footer>
    </div>
  );
}
