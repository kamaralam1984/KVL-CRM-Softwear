export interface ModuleBenefit  { title: string; desc: string }
export interface ModuleStep     { num: string; title: string; desc: string }
export interface ModuleFeature  { title: string; desc: string }
export interface ModuleStat     { value: string; label: string }

export interface ModuleContent {
  id:          string;
  color:       string;
  title:       string;
  tagline:     string;
  intro:       string;
  heroText:    string[];        // paragraphs
  benefits:    ModuleBenefit[];
  howItWorks:  ModuleStep[];
  features:    ModuleFeature[];
  stats:       ModuleStat[];
  seoTitle:    string;
  seoDesc:     string;
}

export const MODULE_CONTENT: Record<string, ModuleContent> = {

  /* ══════════════════════════════════════════════
     LEADS
  ══════════════════════════════════════════════ */
  Leads: {
    id: "leads", color: "#3b82f6",
    title: "Leads Management",
    tagline: "Capture, Score, and Convert Every Sales Opportunity",
    seoTitle: "KVl CRM Leads Management — AI-Powered Lead Capture & Conversion",
    seoDesc: "KVl CRM's advanced lead management system helps sales teams capture, score, assign, and convert leads 3× faster with AI scoring, automated workflows, and real-time pipeline visibility.",
    intro: "KVl CRM's Lead Management module transforms how your sales team discovers, qualifies, and converts prospects. Powered by intelligent scoring algorithms and automated workflows, it ensures no opportunity slips through the cracks — so your team always knows exactly which leads to call, when to follow up, and how to close.",
    heroText: [
      "In today's hyper-competitive market, the difference between winning and losing a deal often comes down to speed and precision. KVl CRM's Leads module is engineered for both. From the moment a prospect fills out your web form, connects with you on LinkedIn, or gets imported from a CSV file, KVl instantly creates a rich lead profile, assigns a quality score, and routes the lead to the right sales rep — all in under three seconds.",
      "Our AI-powered lead scoring engine analyzes over 50 behavioral and firmographic signals to rank every lead on a scale from 1 to 100. This includes website visit frequency, email open rates, company size, industry vertical, job title, and engagement history. Hot leads — those scoring above 80 — are automatically flagged for immediate outreach, while cooler prospects enter automated nurturing sequences that keep your brand top-of-mind without requiring manual effort from your team.",
      "What makes KVl's lead management truly enterprise-grade is the depth of context it captures. Every lead comes with a complete interaction timeline — every email sent, every call logged, every page visited, every form submitted. Sales reps walk into every conversation fully informed, enabling them to personalize their pitch and dramatically increase conversion rates. Managers get a bird's-eye view of the entire lead funnel, from first touch to first deal, with real-time reporting that highlights bottlenecks, top performers, and revenue forecasts.",
    ],
    benefits: [
      { title: "AI-Powered Lead Scoring",       desc: "Our machine learning model analyzes 50+ data points — company size, engagement signals, email behavior, page visits, and industry fit — to assign each lead a conversion probability score. Your reps focus on the hottest opportunities first, increasing close rates by an average of 34%." },
      { title: "Omnichannel Lead Capture",       desc: "Capture leads automatically from your website, landing pages, WhatsApp, email campaigns, social media ads, and third-party tools like Facebook Lead Ads. Every source is tracked and attributed so you know exactly which channels drive the most qualified pipeline." },
      { title: "Smart Auto-Assignment",          desc: "Define routing rules based on territory, industry, deal size, or round-robin distribution. When a new lead arrives, the system instantly assigns it to the most appropriate rep and sends them an automated notification — eliminating the human lag that causes leads to go cold." },
      { title: "Automated Nurture Sequences",    desc: "Build multi-step email and WhatsApp sequences that activate the moment a lead enters a specific stage. Warm up cold prospects with educational content, trigger follow-up reminders, and move leads down the funnel without a single manual action from your team." },
      { title: "Complete Lead Timeline & History", desc: "Every call, email, note, meeting, document, and activity is captured in a chronological timeline on the lead profile. Reps returning after a holiday or taking over from a colleague have full context instantly — no more awkward 'let me check my notes' moments on sales calls." },
    ],
    howItWorks: [
      { num: "01", title: "Capture from Any Source",   desc: "Web forms, landing pages, CSV imports, WhatsApp, email, LinkedIn, and 100+ integrations automatically funnel leads into KVl. Duplicate detection merges identical records and flags near-duplicates for review." },
      { num: "02", title: "Score, Qualify & Enrich",   desc: "The AI engine scores each lead within seconds. KVl also enriches profiles with company data, social profiles, and firmographic information — giving your reps a complete picture before they even pick up the phone." },
      { num: "03", title: "Assign, Notify & Nurture",  desc: "Auto-assignment routes the lead to the right rep. An instant notification fires via email, SMS, and in-app alert. If the rep doesn't respond within a set timeframe, the lead escalates automatically." },
      { num: "04", title: "Convert to Deal in One Click", desc: "When a lead is ready, convert it to a deal with a single click. All associated data, notes, files, and history transfer instantly to the deal record — no re-entry, no data loss, full continuity." },
    ],
    features: [
      { title: "Custom Lead Fields & Layouts",    desc: "Add unlimited custom fields — dropdowns, date pickers, file attachments, and multi-select tags — to capture exactly the data your business needs." },
      { title: "Bulk Import & Export",            desc: "Import thousands of leads from CSV or Excel in seconds. Smart field-mapping auto-detects column headers and flags formatting errors before they create bad data." },
      { title: "Lead Merge & Deduplication",      desc: "Automatic and manual deduplication keeps your database clean. Merge duplicate records with one click, combining all history into a single authoritative profile." },
      { title: "Advanced Search & Filters",       desc: "Filter leads by any combination of fields, scores, stages, assigned reps, sources, or custom attributes. Save filter sets as views for instant access." },
      { title: "Lead Source Attribution",         desc: "Track every lead back to its origin — organic search, paid ads, referral, event, or direct outreach. Understand which channels deliver the highest-quality pipeline." },
      { title: "Mobile Lead Capture & Management", desc: "Capture and manage leads on the go with KVl's mobile-optimized interface. Scan business cards, log calls, and update statuses from anywhere in the world." },
    ],
    stats: [
      { value: "3.2×",  label: "More leads converted" },
      { value: "67%",   label: "Faster lead qualification" },
      { value: "45%",   label: "Reduction in manual entry" },
      { value: "89%",   label: "Lead response rate improvement" },
    ],
  },

  /* ══════════════════════════════════════════════
     CUSTOMERS
  ══════════════════════════════════════════════ */
  Customers: {
    id: "customers", color: "#10b981",
    title: "Customer Management",
    tagline: "Build Relationships That Generate Revenue for Years",
    seoTitle: "KVl CRM Customer Management — 360° Customer Intelligence Platform",
    seoDesc: "KVl CRM's customer management module provides a complete 360° view of every customer relationship — purchase history, communication logs, health scores, and upsell opportunities in one place.",
    intro: "Your customers are your most valuable asset. KVl CRM's Customer Management module gives your team a complete 360-degree view of every relationship — from the first purchase to lifetime value — so you can deliver personalized experiences that drive retention, expansion, and advocacy.",
    heroText: [
      "Retaining an existing customer costs five times less than acquiring a new one, yet most businesses still invest the majority of their CRM budget on lead acquisition rather than customer success. KVl's Customer module is designed to flip that equation. It consolidates every interaction, purchase, support ticket, email, and conversation into a single, unified customer profile that every team member — from sales to finance to support — can access in real time.",
      "The Customer Health Score is one of KVl's most powerful features. Using a combination of product usage signals, payment behavior, support ticket frequency, NPS survey results, and engagement data, KVl automatically calculates a health score from 0 to 100 for every account. Customers with declining health scores trigger automatic alerts to their account manager, giving your team the window it needs to intervene before churn becomes inevitable.",
      "Enterprise-grade customer segmentation allows you to group customers by industry, company size, revenue tier, geographic region, product line, health score, or any combination of custom attributes. Segments update in real time as customer data changes, enabling marketing to launch hyper-targeted campaigns, sales to identify upsell cohorts, and finance to generate segment-specific revenue reports — all without writing a single line of code.",
    ],
    benefits: [
      { title: "Complete 360° Customer Profile",   desc: "Every deal, invoice, email, WhatsApp message, support ticket, note, and document is linked to the customer record. From a single screen, any team member gets the full relationship history in seconds — enabling truly personalized service at scale." },
      { title: "Customer Health Scoring",          desc: "KVl's AI continuously monitors 20+ health indicators and updates each customer's score in real time. Declining scores trigger automated alerts, ensuring your team catches at-risk accounts weeks before renewal conversations — dramatically reducing preventable churn." },
      { title: "Smart Upsell & Cross-sell Engine", desc: "Machine learning identifies customers who match the profile of successful upgrades based on usage patterns, company growth signals, and behavioral data. Reps receive weekly upsell recommendations complete with suggested products, optimal timing, and personalized talking points." },
      { title: "Lifecycle Stage Management",       desc: "Track every customer through defined lifecycle stages — Onboarding, Active, At-Risk, Champion, and Churned. Stage transitions trigger automated actions: welcome sequences, check-in calls, renewal reminders, and re-engagement campaigns that run without manual input." },
      { title: "Shared Customer Intelligence",     desc: "Break down team silos. Sales, marketing, support, and finance teams all work from the same customer record. When support closes a ticket, sales sees it. When finance sends an invoice, the account manager is notified. One source of truth, zero miscommunication." },
    ],
    howItWorks: [
      { num: "01", title: "Auto-Create on Conversion", desc: "When a lead converts to a deal and closes, a customer record is automatically created with all history migrated. No manual setup, no data entry — your customer is live in the system from day one." },
      { num: "02", title: "Enrich & Score",            desc: "KVl enriches the profile with company data, news mentions, and financial signals. The health score algorithm begins tracking behavior immediately, establishing a baseline within the first 30 days." },
      { num: "03", title: "Automate Success Touchpoints", desc: "Onboarding sequences, quarterly review reminders, renewal alerts, and birthday messages all fire automatically based on lifecycle stage and custom triggers — ensuring consistent, timely customer success." },
      { num: "04", title: "Grow & Retain",             desc: "Upsell opportunities are surfaced automatically. Renewal workflows begin 90 days before contract end. NPS surveys go out at the right moments. KVl manages the entire customer lifecycle proactively." },
    ],
    features: [
      { title: "Custom Customer Segments",         desc: "Build unlimited dynamic segments based on any combination of attributes. Segments update automatically as data changes, keeping lists always accurate." },
      { title: "Customer Timeline & Activity Feed", desc: "A complete, chronological record of every interaction — calls, emails, meetings, deals, invoices, and tickets — displayed in a beautiful, filterable timeline." },
      { title: "Relationship Mapping",             desc: "Map organizational hierarchies, identify decision-makers, and track stakeholder relationships across large enterprise accounts with visual org charts." },
      { title: "NPS & Satisfaction Surveys",       desc: "Send automated NPS, CSAT, and CES surveys at key customer milestones. Responses are logged directly to the customer record and influence health scores." },
      { title: "Revenue Attribution",              desc: "See the total lifetime value, annual recurring revenue, and payment history of every customer. Understand which segments are most profitable and why." },
      { title: "Document & Contract Management",  desc: "Store proposals, contracts, NDAs, and signed agreements directly on the customer record. Version control and expiry alerts keep compliance teams informed." },
    ],
    stats: [
      { value: "94%",  label: "Customer retention rate" },
      { value: "2.8×", label: "Upsell revenue increase" },
      { value: "61%",  label: "Churn reduction in year 1" },
      { value: "4.6★", label: "Average customer satisfaction" },
    ],
  },

  /* ══════════════════════════════════════════════
     DEALS
  ══════════════════════════════════════════════ */
  Deals: {
    id: "deals", color: "#D4AF37",
    title: "Deals Management",
    tagline: "Close More Deals, Faster, with Complete Revenue Visibility",
    seoTitle: "KVl CRM Deals Management — Advanced Deal Tracking & Revenue Intelligence",
    seoDesc: "KVl CRM's deals module gives revenue teams complete visibility into every opportunity — deal scoring, competitor tracking, collaborative closing, and revenue forecasting all in one place.",
    intro: "KVl CRM's Deals module is the command center for your entire revenue operation. Every opportunity, from a $500 SMB contract to a $5M enterprise deal, gets the same level of attention, tracking, and intelligence — ensuring your team never drops the ball on a high-value opportunity again.",
    heroText: [
      "Winning deals in today's market requires more than a good product — it requires perfect execution across a complex, multi-stakeholder buying journey. KVl's Deals module provides the structure, intelligence, and automation your team needs to move faster, forecast more accurately, and close at a higher rate than the competition. From the moment a deal is created, the system begins tracking time-in-stage, suggesting next actions, and calculating win probability using a machine learning model trained on thousands of closed deals.",
      "Deal scoring is one of the features our customers describe as transformative. Rather than relying on sales reps' subjective gut feelings about deal health, KVl analyzes engagement signals, response times, stakeholder coverage, competitive mentions, and timeline adherence to produce an objective Deal Score updated in real time. Managers can instantly identify which deals are on track, which are stalling, and which need urgent intervention — without sitting through an hour-long pipeline review call.",
      "KVl's collaborative deal rooms allow entire teams to work on complex opportunities together. Share collateral, track stakeholder engagement, record competitor intelligence, manage action items, and co-author proposals — all within the deal record. When a rep goes on leave or a deal transfers between team members, the incoming rep has everything they need to continue seamlessly. No more lost context, no more awkward handoffs.",
    ],
    benefits: [
      { title: "AI Deal Scoring & Win Probability", desc: "KVl's ML model scores every deal from 1–100 based on engagement, stage velocity, competitive signals, and historical patterns. Win probability percentages give managers accurate forecasts and help reps prioritize their energy on closable deals." },
      { title: "Multi-Stage Pipeline Visibility",   desc: "See every deal across every stage simultaneously. Color-coded health indicators, time-in-stage warnings, and automated nudges ensure reps always know what action to take next — eliminating the common 'I forgot to follow up' revenue leakage." },
      { title: "Collaborative Deal Execution",      desc: "Invite colleagues, subject-matter experts, and leadership into specific deals without giving full CRM access. Share files, comment threads, and task lists within the deal record for seamless cross-functional collaboration." },
      { title: "Revenue Forecasting Engine",        desc: "KVl aggregates deal data, historical close rates, and seasonal trends to generate accurate weekly and monthly revenue forecasts. Finance teams get real-time pipeline visibility that replaces spreadsheet-based forecasting entirely." },
      { title: "Competitor & Objection Tracking",   desc: "Log which competitors are involved in each deal and track the objections raised. Over time, KVl identifies patterns — which competitors you most often encounter, which objections are most common in specific industries — arming your team with competitive intelligence." },
    ],
    howItWorks: [
      { num: "01", title: "Create Deal from Lead",    desc: "One-click conversion from a qualified lead creates a deal with full history attached. Define the deal value, expected close date, products, and decision-makers in under 60 seconds." },
      { num: "02", title: "Score, Stage & Track",     desc: "AI scoring begins immediately. The deal moves through your custom pipeline stages. Time-in-stage tracking and next-action recommendations keep momentum alive throughout the sales cycle." },
      { num: "03", title: "Collaborate & Close",      desc: "Involve your entire team. Proposals, contracts, and pricing approvals are managed inside the deal. E-signature integrations allow customers to sign directly from the document — removing friction from the closing moment." },
      { num: "04", title: "Analyze & Improve",        desc: "Post-close analysis automatically categorizes won/lost reasons. Win/loss patterns feed back into the AI model, continuously improving deal score accuracy and helping your team learn what drives success." },
    ],
    features: [
      { title: "Custom Deal Fields & Products",    desc: "Add custom fields, link products from your catalog, apply discounts, and calculate deal value automatically using configurable pricing rules." },
      { title: "E-Signature Integration",          desc: "Send proposals and contracts for e-signature directly from KVl. Track open rates, completion rates, and get notified the instant a contract is signed." },
      { title: "Deal Cloning",                     desc: "Duplicate a successful deal structure for similar opportunities. Clone products, team members, activity templates, and custom fields to accelerate deal setup." },
      { title: "Advanced Deal Filtering",          desc: "Filter your deal list by value, stage, rep, industry, close date, score, or any custom field. Save complex filter combinations as named views for instant access." },
      { title: "Deal Rotation Rules",              desc: "Automatically reassign deals based on rep capacity, performance tiers, or territorial rules. Ensure your best reps always work the most valuable opportunities." },
      { title: "Lost Deal Analysis",               desc: "When a deal is lost, capture structured reasons. KVl analyzes lost deal patterns to identify process improvements, pricing issues, and competitive gaps." },
    ],
    stats: [
      { value: "40%",  label: "Faster deal closing" },
      { value: "68%",  label: "Average win rate on scored deals" },
      { value: "2.4×", label: "Pipeline visibility improvement" },
      { value: "32%",  label: "Forecast accuracy increase" },
    ],
  },

  /* ══════════════════════════════════════════════
     PIPELINE
  ══════════════════════════════════════════════ */
  Pipeline: {
    id: "pipeline", color: "#8b5cf6",
    title: "Sales Pipeline",
    tagline: "Visualize Your Entire Revenue Engine in Real Time",
    seoTitle: "KVl CRM Sales Pipeline — Visual Kanban Pipeline Management",
    seoDesc: "KVl CRM's visual sales pipeline gives managers and reps a real-time view of every deal across every stage — with drag-and-drop management, stage analytics, and automated pipeline health alerts.",
    intro: "A well-managed pipeline is the difference between predictable revenue and monthly uncertainty. KVl CRM's Visual Sales Pipeline gives every stakeholder — from frontline reps to the CFO — a real-time, accurate picture of where deals stand, what's moving, and where revenue is at risk.",
    heroText: [
      "KVl's pipeline module is built on the belief that great sales management starts with perfect visibility. Our intuitive drag-and-drop Kanban board lets reps move deals between stages in seconds, while the underlying analytics engine tracks every movement, calculates stage conversion rates, and surfaces bottlenecks before they become revenue problems. Whether you manage a single pipeline or 20 parallel pipelines for different product lines or geographies, KVl handles the complexity with elegance.",
      "Pipeline hygiene is one of the biggest challenges facing sales organizations today. Stale deals, over-inflated pipelines, and forecast inaccuracies erode trust between sales and leadership. KVl solves this with automated pipeline hygiene tools: deals that haven't been updated in a configurable number of days are automatically flagged, reps receive reminder nudges, and managers see a real-time 'pipeline health score' that reflects the accuracy and freshness of their forecast.",
      "Beyond visualization, KVl's pipeline analytics give leaders the data they need to coach effectively. Stage-by-stage conversion rates, average time-in-stage, deal velocity trends, and rep-level performance comparisons are all available in real time. Identify which stages lose the most deals, which reps move deals fastest, and which industries have the highest close rates — all from a single analytics dashboard that updates as deals move.",
    ],
    benefits: [
      { title: "Drag-and-Drop Visual Kanban",       desc: "Move deals between stages with a simple drag-and-drop interaction. Stage values update instantly, pipeline totals recalculate in real time, and activity logs are automatically created for every stage transition — giving managers a complete audit trail." },
      { title: "Multiple Parallel Pipelines",       desc: "Create separate pipelines for different products, geographies, sales teams, or deal types. Each pipeline has its own stages, conversion benchmarks, and reporting dashboards. Aggregate views show combined performance across all pipelines." },
      { title: "Automated Pipeline Hygiene",        desc: "Deals inactive for a set number of days are automatically flagged with a visual indicator. Reps receive automated nudge emails. Managers see a hygiene score on the pipeline dashboard, ensuring your forecast is always based on real, current data." },
      { title: "Stage-Level Analytics & Coaching",  desc: "Understand exactly where deals are winning and losing. Stage conversion rates, average deal age per stage, and drop-off analysis reveal the specific moments in your sales process that need the most attention — enabling precise, data-backed coaching conversations." },
      { title: "Revenue Forecasting by Stage",      desc: "Apply weighted probability percentages to each stage and KVl automatically calculates your expected revenue for the current quarter. Adjust weightings based on historical performance and watch your forecast accuracy improve month over month." },
    ],
    howItWorks: [
      { num: "01", title: "Design Your Pipeline",    desc: "Create custom stages that match your exact sales process. Name them, set conversion probability weights, define entry criteria, and configure automated actions that fire when deals enter each stage." },
      { num: "02", title: "Populate & Move Deals",   desc: "Deals flow in from your leads module or are created directly. Drag them across stages as they progress. Every move is timestamped and logged, building a complete picture of deal velocity." },
      { num: "03", title: "Monitor Health & Alert",  desc: "The pipeline health dashboard updates in real time. Stale deal alerts fire automatically. Revenue at risk indicators highlight deals past their expected close date, prompting immediate action." },
      { num: "04", title: "Analyze & Optimize",      desc: "Monthly pipeline reviews are replaced by always-on analytics. Identify stage bottlenecks, rep performance gaps, and product-line weaknesses from a single screen — and take action directly from the insight." },
    ],
    features: [
      { title: "Custom Stage Configuration",       desc: "Unlimited stages with custom names, entry criteria, probability weights, and automated actions. Configure different stages per pipeline to match diverse sales processes." },
      { title: "Pipeline Value Filters",           desc: "Filter your pipeline by deal value range, close date, rep, industry, or health score. Focus your review on the deals that matter most in any given moment." },
      { title: "Forecast Categories",             desc: "Categorize deals as Commit, Best Case, or Pipeline for sales forecast submissions. Roll up team forecasts with a single click for executive reporting." },
      { title: "Goal Tracking & Quotas",           desc: "Set monthly and quarterly revenue goals per rep, team, and pipeline. Real-time progress bars show attainment at a glance, keeping reps motivated and managers informed." },
      { title: "Pipeline Comparison Views",        desc: "Compare this quarter's pipeline against the same period last year, last quarter, or any custom date range. Spot seasonal trends and plan capacity accordingly." },
      { title: "Mobile Pipeline Management",       desc: "Review, update, and manage your pipeline from any device. Optimized mobile views make it easy to check pipeline health and update deals on the go." },
    ],
    stats: [
      { value: "54%",  label: "Improvement in forecast accuracy" },
      { value: "3.1×", label: "Faster pipeline review cycles" },
      { value: "28%",  label: "Reduction in stale deals" },
      { value: "41%",  label: "Higher stage conversion rates" },
    ],
  },

  /* ══════════════════════════════════════════════
     TASKS
  ══════════════════════════════════════════════ */
  Tasks: {
    id: "tasks", color: "#f59e0b",
    title: "Tasks & Activities",
    tagline: "Never Miss a Follow-Up. Never Drop a Commitment.",
    seoTitle: "KVl CRM Task Management — Sales Activity Tracking & Follow-up Automation",
    seoDesc: "KVl CRM's task management system keeps your entire sales team organized with smart reminders, automated task creation, priority scoring, and complete activity visibility across all deals and customers.",
    intro: "In sales, execution is everything. The best strategy fails without disciplined follow-through. KVl CRM's Tasks & Activities module ensures every commitment is captured, every follow-up is scheduled, and every action item reaches completion — keeping your team accountable and your customers delighted.",
    heroText: [
      "Research consistently shows that 80% of sales require five or more follow-up attempts, yet 44% of sales reps give up after just one. KVl's Task module is designed to eliminate this failure mode entirely. Every task created in KVl is linked to a specific lead, deal, or customer, giving it full context. Reps see not just what to do, but who it's for, what the last interaction was, and exactly what outcome the task is designed to achieve.",
      "KVl's intelligent task creation goes beyond manual entry. When a deal moves to a new stage, tasks are automatically created from templates you define. When an automation workflow fires, tasks appear in the right rep's queue. When a customer hasn't been contacted in 30 days, KVl creates a re-engagement task and assigns it to the account manager. This means your team's daily task list is always populated with the right actions at the right time — without anyone needing to remember to create them.",
      "Managers gain unprecedented visibility into team activity through KVl's activity dashboard. See exactly how many calls were made, emails sent, meetings held, and tasks completed by each rep each day. Compare activity levels across the team, identify reps who are active but not converting, and distinguish coaching opportunities from capacity issues. The activity data feeds directly into performance reviews, replacing subjective impressions with objective evidence.",
    ],
    benefits: [
      { title: "Context-Rich Task Management",     desc: "Every task is linked to a lead, deal, or customer with the full interaction history visible at a glance. Reps open a task and immediately see who the person is, what's been discussed previously, and exactly what needs to happen next — eliminating context-switching time." },
      { title: "Automated Task Creation",          desc: "Define task templates for each pipeline stage and automation trigger. When conditions are met, tasks appear in the right rep's queue automatically. Follow-up tasks after calls, check-in reminders after demos, and renewal alerts 90 days before expiry all run without manual intervention." },
      { title: "Smart Priority Scoring",           desc: "KVl scores each task by urgency and importance based on deal value, deadline proximity, customer health score, and manager-set priorities. Reps start each day knowing exactly which three tasks will have the biggest revenue impact." },
      { title: "Team Activity Transparency",        desc: "Managers see a real-time activity feed showing every call logged, email sent, meeting held, and task completed by every team member. Activity trends, daily averages, and individual performance benchmarks are all visible — enabling proactive coaching rather than reactive firefighting." },
      { title: "Multi-Channel Activity Logging",   desc: "Log calls, emails, meetings, site visits, and custom activity types directly from the task interface. Activities sync with your calendar and email, so reps spend time selling rather than data-entering. Every interaction is captured, timestamped, and attributed." },
    ],
    howItWorks: [
      { num: "01", title: "Create & Assign",        desc: "Create tasks manually, from deal stages, or via automations. Assign to yourself or any team member. Set due dates, priority levels, and activity types. Link to any lead, deal, or customer record." },
      { num: "02", title: "Receive Smart Reminders", desc: "KVl sends reminders via email, push notification, and in-app alert — timed perfectly based on the task due date and your working hours. Overdue tasks escalate to managers automatically." },
      { num: "03", title: "Execute & Log",          desc: "Complete the task and log what happened in seconds. Add outcome notes, schedule the next action, and update the associated deal or lead record — all in a single, streamlined workflow." },
      { num: "04", title: "Analyze & Coach",        desc: "Weekly activity reports land in every manager's inbox automatically. Compare activity-to-outcome ratios, spot under-performers early, and celebrate top activity with team leaderboards." },
    ],
    features: [
      { title: "Task Templates & Bulk Creation",    desc: "Create reusable task templates for common sales activities. Apply templates to multiple deals at once — ideal for managing large volumes of similar opportunities." },
      { title: "Recurring Tasks",                  desc: "Set tasks to recur on daily, weekly, monthly, or custom schedules. Perfect for quarterly business reviews, weekly pipeline updates, and regular customer check-ins." },
      { title: "Task Dependencies",                desc: "Create parent-child task relationships where follow-on tasks unlock automatically when predecessors are completed — ideal for managing complex, multi-step sales processes." },
      { title: "Calendar Integration",             desc: "Sync tasks and meetings with Google Calendar and Microsoft Outlook. Schedule meetings directly from KVl and see your full agenda without switching applications." },
      { title: "Mobile Task Management",           desc: "View your daily task list, mark completions, log notes, and create new tasks from your smartphone. Optimized for field sales teams who live outside the office." },
      { title: "Activity Leaderboards",            desc: "Gamify sales activity with real-time leaderboards showing call counts, emails sent, meetings booked, and tasks completed. Healthy competition drives higher activity levels across the team." },
    ],
    stats: [
      { value: "93%",  label: "Task completion rate" },
      { value: "5×",   label: "More follow-ups per rep" },
      { value: "38%",  label: "Less time on admin" },
      { value: "2.1×", label: "Rep productivity increase" },
    ],
  },

  /* ══════════════════════════════════════════════
     FINANCE
  ══════════════════════════════════════════════ */
  Finance: {
    id: "finance", color: "#00A86B",
    title: "Finance & Invoicing",
    tagline: "Connect Revenue Activity to Financial Reality — in One Platform",
    seoTitle: "KVl CRM Finance Module — Invoicing, Payments & Revenue Tracking for Sales Teams",
    seoDesc: "KVl CRM's finance module bridges the gap between sales and finance — create and send invoices, track payments, manage expenses, and see real revenue data alongside your CRM pipeline.",
    intro: "KVl CRM's Finance module eliminates the perpetual handoff between sales and finance. Create invoices, track payments, manage expenses, and generate financial reports without ever leaving your CRM — bringing revenue clarity to your entire organization.",
    heroText: [
      "For most businesses, the journey from closed deal to collected payment involves multiple systems, email threads, manual data re-entry, and painful reconciliation exercises. KVl's Finance module collapses this entire workflow into a single, elegantly designed interface that lives alongside your deals, customers, and pipelines — making the connection between sales activity and financial outcomes completely transparent.",
      "Professional invoices can be created in under two minutes directly from a closed deal. All customer details, product line items, and pricing are pre-populated from the deal record. Customize the invoice with your branding, add payment terms, apply discounts, and send it via email with a single click. Clients receive a beautifully formatted invoice with a secure payment link — and KVl tracks every open, every click, and every payment in real time.",
      "Finance dashboards give leadership the revenue visibility they need to make confident business decisions. See total invoiced revenue, collected payments, outstanding receivables, overdue amounts, and monthly recurring revenue — all updated live as deals close and payments arrive. The connection between your sales pipeline and actual collected revenue means forecasting becomes far more accurate, and revenue surprises become a thing of the past.",
    ],
    benefits: [
      { title: "One-Click Invoice Generation",     desc: "Convert a closed deal into a professional invoice in seconds. All product details, pricing, and customer information transfer automatically. Add your logo, payment terms, and a personalized message — then send via email or direct link with no additional software needed." },
      { title: "Real-Time Payment Tracking",       desc: "See exactly which invoices are paid, pending, or overdue at any moment. Automated payment reminders fire on your schedule — three days before due, on the due date, and at configurable intervals after — reducing chasing time and improving cash collection rates significantly." },
      { title: "Connected Revenue Analytics",      desc: "Bridge the gap between sales pipeline and actual collected revenue. KVl displays invoiced value, collected revenue, and outstanding balances alongside your pipeline data — giving leadership a single, accurate picture of financial performance without spreadsheet reconciliation." },
      { title: "Expense Management",              desc: "Track team expenses, reimbursements, and cost-of-sale alongside revenue. Categorize expenses by project, team, or account. Generate P&L summaries that combine invoice revenue with cost data for accurate margin analysis at the deal and customer level." },
      { title: "Multi-Currency & Tax Support",     desc: "Invoice clients in any currency with automatic exchange rate conversion. Configure tax rates, VAT/GST rules, and regional compliance requirements. KVl handles the calculations so your finance team stays compliant without manual intervention." },
    ],
    howItWorks: [
      { num: "01", title: "Generate from Deal",     desc: "Close a deal and create an invoice in one click. All deal data populates automatically. Add any additional line items, apply discounts, and set payment terms before sending." },
      { num: "02", title: "Send & Track",           desc: "Send invoices via email, WhatsApp, or shareable link. Track delivery, open, and payment status in real time. Automated reminders handle follow-up so your team doesn't have to." },
      { num: "03", title: "Collect & Reconcile",    desc: "Payments are recorded automatically via connected payment gateways. Manual payment logging is available for bank transfers. Reconciliation reports flag discrepancies and partial payments instantly." },
      { num: "04", title: "Report & Forecast",      desc: "Finance dashboards update in real time. Generate monthly P&L summaries, tax reports, and customer revenue analyses with one click — in formats ready for your accountant." },
    ],
    features: [
      { title: "Professional Invoice Templates",   desc: "Choose from multiple branded invoice templates or upload your own. Fully customizable with your logo, colors, and footer text." },
      { title: "Recurring Invoice Automation",     desc: "Set up recurring invoices for subscription clients that generate and send automatically on your defined schedule — monthly, quarterly, or annually." },
      { title: "Partial Payments & Installments",  desc: "Record partial payments and manage installment plans. KVl tracks the outstanding balance and adjusts payment reminders accordingly." },
      { title: "Credit Notes",                     desc: "Generate credit notes for returned goods, disputes, or goodwill gestures. Credit notes automatically offset against outstanding invoices in your ledger." },
      { title: "Financial Dashboard",             desc: "Real-time dashboard showing MRR, ARR, collected revenue, outstanding receivables, overdue amounts, and cash flow projections in a single view." },
      { title: "Accountant Export",               desc: "Export all financial data in CSV, PDF, or accounting-software-compatible formats. Tax reports, revenue summaries, and audit trails available on demand." },
    ],
    stats: [
      { value: "73%",  label: "Faster invoice creation" },
      { value: "91%",  label: "On-time payment rate" },
      { value: "45%",  label: "Reduction in overdue invoices" },
      { value: "100%", label: "Audit trail completeness" },
    ],
  },

  /* ══════════════════════════════════════════════
     REPORTS
  ══════════════════════════════════════════════ */
  Reports: {
    id: "reports", color: "#ef4444",
    title: "Reports & Analytics",
    tagline: "Turn Your CRM Data into Actionable Revenue Intelligence",
    seoTitle: "KVl CRM Reports & Analytics — Real-Time Business Intelligence for Revenue Teams",
    seoDesc: "KVl CRM's analytics engine delivers real-time reports on revenue, pipeline health, team performance, and customer behavior — with beautiful dashboards, scheduled exports, and executive summaries.",
    intro: "Data without insight is just noise. KVl CRM's Reports & Analytics module transforms every data point in your system into clear, actionable intelligence — giving sales leaders, marketers, and executives the visibility they need to make faster, smarter decisions.",
    heroText: [
      "The best CRM in the world is useless if the data inside it is invisible. KVl's analytics engine was designed from the ground up to make CRM data accessible, beautiful, and immediately actionable — for both data-savvy analysts and time-pressed executives who need the key number in under ten seconds. Pre-built dashboards for the most common sales, marketing, and customer success metrics are available out of the box. Custom reports can be built with a drag-and-drop builder in minutes.",
      "Real-time data is a non-negotiable in today's fast-moving markets. KVl's reports update live as deals move, leads convert, invoices are paid, and customers churn. There's no waiting for overnight batch jobs or manually refreshing spreadsheets. When a rep closes a deal at 4 PM on a Friday, it appears in the revenue dashboard within seconds — giving the VP of Sales an accurate picture of the quarter before they leave the office.",
      "Predictive analytics takes KVl beyond descriptive reporting. The AI forecasting engine analyzes historical trends, current pipeline composition, seasonal patterns, and rep performance trajectories to generate revenue predictions with quantified confidence intervals. Leaders can model scenarios — 'what if we close 70% of current pipeline instead of 60%?' — and see the projected revenue impact immediately. This level of financial intelligence was previously available only to companies with dedicated data science teams.",
    ],
    benefits: [
      { title: "Pre-Built Revenue Dashboards",     desc: "Fifteen pre-built dashboards covering pipeline health, revenue performance, lead conversion funnels, team activity, customer retention, and campaign ROI. Accessible to the right team members from day one — no setup required. Each dashboard refreshes in real time as data changes." },
      { title: "Custom Report Builder",            desc: "Drag-and-drop report builder with 80+ metrics across every module. Filter, group, and visualize data using bar charts, line graphs, funnels, pie charts, heatmaps, and tables. Save reports to your personal library and share with specific team members or roles." },
      { title: "AI-Powered Revenue Forecasting",   desc: "Machine learning models trained on your historical data generate weekly, monthly, and quarterly revenue forecasts with high and low confidence scenarios. Forecasts account for pipeline quality, deal stage probabilities, and seasonal patterns — replacing gut-feel estimation with statistical precision." },
      { title: "Scheduled Reports & Alerts",       desc: "Configure any report to deliver automatically via email on a set schedule — daily, weekly, monthly. Set threshold alerts that trigger notifications when KPIs fall below or exceed defined benchmarks. Stay informed without logging in, and act before small issues become large problems." },
      { title: "Executive Summary View",           desc: "A one-page executive dashboard surfaces the five most critical business metrics — pipeline value, revenue vs. target, customer churn rate, team performance index, and cash collected — in a format designed for quick consumption. Perfect for board meetings, investor updates, and weekly leadership reviews." },
    ],
    howItWorks: [
      { num: "01", title: "Connect Your Data",      desc: "All KVl modules feed data automatically into the analytics engine. No integrations needed — your CRM, pipeline, finance, and customer data are all connected from the moment you start using the platform." },
      { num: "02", title: "Choose or Build Reports", desc: "Start with pre-built dashboards or use the drag-and-drop builder to create custom views. Add filters, choose visualization types, and configure the exact date ranges and groupings you need." },
      { num: "03", title: "Share & Schedule",       desc: "Share reports with specific team members or schedule automated email delivery. Configure alert thresholds so you receive notifications when critical metrics move outside normal ranges." },
      { num: "04", title: "Act on Insights",        desc: "Drill down from summary metrics to individual records with a single click. Identify the specific deal, rep, or customer behind every data point — and take action directly from the report view." },
    ],
    features: [
      { title: "Funnel & Conversion Analysis",     desc: "Visualize conversion rates at every stage of your lead-to-close funnel. Identify exactly where prospects are dropping off and quantify the revenue impact of improving each stage." },
      { title: "Cohort Analysis",                  desc: "Analyze the behavior of customer cohorts over time — retention curves, LTV trajectories, and expansion revenue patterns by acquisition month, source, or industry." },
      { title: "Rep Performance Scorecards",       desc: "Individual performance reports showing quota attainment, activity metrics, deal velocity, average deal size, and win rate — sortable, filterable, and exportable." },
      { title: "Cross-Module Analytics",           desc: "Combine data from leads, deals, finance, and customer modules in a single report. Understand which lead sources produce the highest LTV customers, not just the most closed deals." },
      { title: "Data Export",                      desc: "Export any report as CSV, Excel, or PDF with one click. API access available for integration with your existing BI tools like Tableau, Power BI, or Looker." },
      { title: "Goal & KPI Tracking",             desc: "Define revenue goals, activity targets, and customer success KPIs. Visual progress indicators update in real time so every team member knows exactly where they stand against targets." },
    ],
    stats: [
      { value: "80+",  label: "Pre-built metrics" },
      { value: "10×",  label: "Faster reporting vs. spreadsheets" },
      { value: "97%",  label: "Forecast accuracy on 90-day horizon" },
      { value: "5min", label: "Average dashboard setup time" },
    ],
  },

  /* ══════════════════════════════════════════════
     WHATSAPP CRM
  ══════════════════════════════════════════════ */
  "WhatsApp CRM": {
    id: "whatsapp", color: "#25D366",
    title: "WhatsApp CRM",
    tagline: "Turn WhatsApp into Your Most Powerful Sales & Support Channel",
    seoTitle: "KVl CRM WhatsApp Integration — Business WhatsApp CRM with Broadcasts & Automation",
    seoDesc: "KVl CRM's WhatsApp integration lets sales and support teams manage customer conversations, send broadcast campaigns, set up auto-replies, and track engagement — all from inside your CRM.",
    intro: "WhatsApp is where your customers are. With 2 billion active users and open rates exceeding 95%, it's the highest-engagement communication channel available to businesses today. KVl CRM's WhatsApp module brings the full power of WhatsApp Business directly into your CRM — transforming it from a messaging app into a complete revenue and relationship channel.",
    heroText: [
      "In most businesses today, WhatsApp conversations happen in isolation — on individual reps' personal phones, invisible to managers, disconnected from customer records, and impossible to track or measure. KVl solves this entirely. By integrating with the official WhatsApp Business API, KVl creates a shared, managed WhatsApp inbox where every message is logged, every conversation is linked to a customer or lead record, and every interaction becomes part of the complete relationship history.",
      "Broadcast campaigns through KVl's WhatsApp module reach up to 100,000 contacts simultaneously with personalized messages that go out as individual conversations — not group chats. Personalization tokens pull data from your CRM records so every customer receives a message that feels like it was written specifically for them. Campaign analytics track delivery rates, read receipts, response rates, and conversion metrics in real time, making WhatsApp campaigns fully measurable for the first time.",
      "Auto-reply rules transform your WhatsApp into a 24/7 customer service channel. Define keyword triggers and KVl automatically responds with the right message — whether that's answering an FAQ, sending a product brochure, booking a callback, or routing the conversation to a live agent. During business hours, conversations are intelligently routed to available team members based on their specialty, workload, and language. After hours, the automation handles everything seamlessly.",
    ],
    benefits: [
      { title: "Shared Team WhatsApp Inbox",       desc: "All WhatsApp conversations from your business number land in a shared inbox accessible by your entire team. Assign conversations, add internal notes, and collaborate on responses without the customer ever knowing multiple people are involved." },
      { title: "Personalized Broadcast Campaigns", desc: "Send personalized WhatsApp messages to thousands of contacts simultaneously. Each message arrives as a one-to-one conversation, not a group blast. Personalize with name, company, last purchase, and any CRM field. Track delivery, reads, and replies in real time." },
      { title: "Intelligent Auto-Reply Rules",     desc: "Create keyword-based auto-reply rules that respond instantly to common queries, send product information, collect lead details, or route customers to the right team. Rules stack intelligently — if the first rule doesn't match, KVl cascades through alternatives before flagging for human review." },
      { title: "Full CRM Integration",             desc: "Every WhatsApp message is automatically linked to the matching customer or lead record. Reply to a WhatsApp message and the response appears on the customer timeline alongside their deal history, invoices, and email threads — giving every team member complete context." },
      { title: "Campaign Analytics & ROI",         desc: "Track every WhatsApp campaign like a professional marketer. See delivery rates, read rates, reply rates, link clicks, and conversions attributed to each message. Calculate the exact ROI of your WhatsApp marketing spend and optimize future campaigns based on real data." },
    ],
    howItWorks: [
      { num: "01", title: "Connect WhatsApp Business", desc: "Connect your WhatsApp Business number via the official Meta Business API. One-time setup takes under 30 minutes. Your number stays yours — KVl just powers it." },
      { num: "02", title: "Import & Segment Contacts", desc: "Sync your CRM contacts to WhatsApp segments. Create audiences based on industry, purchase history, lead score, or any custom field. Segments update automatically as CRM data changes." },
      { num: "03", title: "Engage Across All Scenarios", desc: "Send one-to-one support messages, personalized sales follow-ups, broadcast campaigns, and automated sequences — all from the same interface. Conversations flow back into the shared team inbox." },
      { num: "04", title: "Analyze & Optimize",     desc: "Campaign performance dashboards show every metric in real time. A/B test message content, timing, and targeting to continuously improve engagement and conversion rates." },
    ],
    features: [
      { title: "WhatsApp Message Templates",       desc: "Create pre-approved message templates for common scenarios — welcome messages, follow-ups, reminders, and promotional content — and reuse them across campaigns." },
      { title: "Media & Document Sharing",         desc: "Share images, PDFs, product catalogs, voice messages, and videos directly through WhatsApp conversations — all stored and accessible on the customer record." },
      { title: "Conversation Assignment & Routing", desc: "Assign conversations to specific team members based on topic, language, or workload. Managers can monitor all active conversations and reassign when needed." },
      { title: "WhatsApp Flows",                  desc: "Create interactive WhatsApp flows — forms, surveys, appointment bookings, and lead qualification questionnaires — that run natively inside WhatsApp." },
      { title: "Contact Opt-in Management",        desc: "Maintain GDPR-compliant WhatsApp contact lists with full opt-in tracking, consent records, and one-click unsubscribe management." },
      { title: "Chat Analytics Dashboard",         desc: "Track response times, message volumes, resolution rates, and agent performance across your entire WhatsApp operation from a single analytics view." },
    ],
    stats: [
      { value: "95%",  label: "Average message open rate" },
      { value: "3.5×", label: "Higher response vs. email" },
      { value: "10K+", label: "Contacts per broadcast" },
      { value: "24/7", label: "Automated response coverage" },
    ],
  },

  /* ══════════════════════════════════════════════
     EMAIL MARKETING
  ══════════════════════════════════════════════ */
  "Email Marketing": {
    id: "email", color: "#3b82f6",
    title: "Email Marketing",
    tagline: "Send Smarter Emails That Actually Drive Revenue",
    seoTitle: "KVl CRM Email Marketing — Campaign Builder, Automation & Analytics",
    seoDesc: "KVl CRM's built-in email marketing platform lets sales and marketing teams design, send, and track personalized email campaigns with A/B testing, automation sequences, and real-time analytics.",
    intro: "Email marketing generates $42 for every $1 spent — the highest ROI of any digital channel. KVl CRM's Email Marketing module combines the power of a professional email platform with the precision of CRM data, enabling your team to send the right message to the right person at exactly the right moment.",
    heroText: [
      "The difference between email marketing that converts and email marketing that gets ignored comes down to three factors: relevance, timing, and personalization. KVl's email module provides all three by bridging the gap between your marketing campaigns and your CRM intelligence. Every contact's industry, deal stage, lead score, purchase history, and engagement behavior is available as a personalization variable — allowing you to craft emails that speak directly to each recipient's situation, not generic broadcasts that feel impersonal.",
      "KVl's drag-and-drop email builder requires zero coding knowledge. Choose from a library of professionally designed templates, customize them with your brand colors and content blocks, and preview them across mobile, tablet, and desktop in real time before sending. Dynamic content blocks let you show different content to different segments within a single email — so a customer receives a renewal offer while a prospect receives a case study, from the same campaign send.",
      "Email automation sequences — called Flows in KVl — allow you to build multi-step nurture journeys that run completely on autopilot. A new lead from your website triggers a welcome sequence. A prospect who opened your proposal but didn't respond triggers a follow-up series. A customer approaching their renewal date triggers a retention campaign. Each step in the sequence can be personalized, timed based on recipient behavior, and branched based on engagement — creating email experiences that feel genuinely responsive to individual customer journeys.",
    ],
    benefits: [
      { title: "CRM-Powered Personalization",      desc: "Every field in your CRM is available as an email personalization token — name, company, industry, deal value, last purchase, lead score, and any custom field. Create emails that reference specific details about each recipient's situation, dramatically increasing relevance and conversion rates." },
      { title: "Drag-and-Drop Campaign Builder",   desc: "Build professional email campaigns in minutes with an intuitive visual editor. 50+ pre-designed templates, customizable content blocks, brand kit management, and real-time preview across all device types. No design or coding skills required." },
      { title: "Behavioral Automation Flows",       desc: "Trigger email sequences based on any action — lead form submission, deal stage change, link click, email open, website visit, or custom event. Multi-step flows with if/then branching logic create personalized journeys that adapt to individual recipient behavior automatically." },
      { title: "A/B Testing & Optimization",       desc: "Test subject lines, sender names, send times, content, and CTAs against each other with statistical significance controls. KVl automatically routes traffic to the winning variant and provides detailed performance comparisons to inform future campaigns." },
      { title: "Advanced Deliverability Management", desc: "KVl actively monitors and protects your sender reputation. Domain authentication, bounce processing, spam score analysis, and list hygiene tools keep your emails out of spam folders and in front of your customers — protecting the investment you've made in building your list." },
    ],
    howItWorks: [
      { num: "01", title: "Build Your Campaign",    desc: "Choose a template, customize with your brand, and write your copy using the drag-and-drop builder. Add personalization tokens, dynamic content blocks, and clear CTAs. Preview on every device type before proceeding." },
      { num: "02", title: "Segment Your Audience",  desc: "Use KVl's CRM data to build hyper-targeted send lists. Filter by industry, deal stage, lead score, engagement history, geography, or any custom attribute. Save segments for reuse across future campaigns." },
      { num: "03", title: "Schedule & Send",        desc: "Send immediately or schedule for optimal timing. KVl's send-time optimization analyzes recipient engagement history and schedules each email for the time that individual is most likely to open it." },
      { num: "04", title: "Track & Iterate",        desc: "Real-time analytics show opens, clicks, bounces, unsubscribes, and conversions as they happen. Revenue attribution tracks which emails generated actual closed deals and invoiced revenue." },
    ],
    features: [
      { title: "50+ Email Templates",              desc: "A professionally designed template library covering newsletters, sales follow-ups, announcements, onboarding, re-engagement, and promotional campaigns." },
      { title: "Send-Time Optimization",           desc: "AI analyzes each contact's historical engagement patterns and schedules delivery for their personal optimal send time, increasing open rates by an average of 23%." },
      { title: "Email Analytics Dashboard",        desc: "Comprehensive analytics: open rates, click-through rates, revenue per email, unsubscribe rates, spam complaints, and link-level click maps for every campaign." },
      { title: "List Management & Hygiene",        desc: "Automatic bounce processing, unsubscribe handling, and list cleaning tools keep your database healthy and your deliverability rates high." },
      { title: "GDPR Compliance Tools",            desc: "Subscription forms with double opt-in, consent records, unsubscribe management, and data processing agreements built directly into the platform." },
      { title: "Revenue Attribution",              desc: "Connect email campaign touchpoints to closed deals and invoices. See exactly which campaigns generated pipeline and revenue — not just clicks." },
    ],
    stats: [
      { value: "42×",  label: "Average email marketing ROI" },
      { value: "28%",  label: "Average open rate improvement" },
      { value: "91%",  label: "Deliverability rate" },
      { value: "3.7×", label: "More pipeline from email sequences" },
    ],
  },

  /* ══════════════════════════════════════════════
     AUTOMATION
  ══════════════════════════════════════════════ */
  Automation: {
    id: "automation", color: "#D4AF37",
    title: "Workflow Automation",
    tagline: "Automate Every Repetitive Task. Free Your Team to Sell.",
    seoTitle: "KVl CRM Workflow Automation — No-Code Sales Process Automation",
    seoDesc: "KVl CRM's workflow automation builder lets sales teams automate lead assignment, follow-up sequences, deal updates, notifications, and cross-module actions — with zero coding required.",
    intro: "The best sales teams don't just work harder — they engineer systems that make the right things happen automatically. KVl CRM's Workflow Automation module is the engine behind this transformation, replacing manual, error-prone processes with intelligent, reliable automations that run 24 hours a day, 7 days a week, without a single click from your team.",
    heroText: [
      "Consider how much of your team's day is consumed by actions that follow a predictable pattern: a new lead comes in and needs to be assigned, a deal moves to the proposal stage and needs a follow-up email sent, a customer hasn't engaged in 60 days and needs a re-engagement sequence triggered, an invoice goes unpaid for 30 days and needs a reminder sent to accounts. Every one of these scenarios follows a rule — if X happens, do Y — and every one of them can be automated with KVl's visual workflow builder.",
      "KVl's automation engine works across every module in the platform. Trigger actions in Leads, Deals, Customers, Tasks, Finance, Email, and WhatsApp from a single workflow. A lead scoring update can simultaneously reassign the lead, send a WhatsApp message, create a follow-up task, and notify the sales manager via email — all in the right sequence, at the right time, without anyone manually orchestrating the process. This cross-module intelligence is what separates KVl's automation from simple email autoresponders.",
      "Building automations in KVl requires no coding knowledge. The visual workflow canvas uses a drag-and-drop interface where you connect trigger blocks to action blocks using intuitive condition branches. Advanced users can add if/then logic, time delays, webhook actions, and data transformation steps. Over 500 pre-built automation templates covering the most common sales, marketing, and customer success scenarios are available in the template library — letting you launch powerful workflows in under five minutes.",
    ],
    benefits: [
      { title: "Visual No-Code Workflow Builder",  desc: "Design complex, multi-step automations using an intuitive drag-and-drop canvas. Connect triggers, conditions, and actions without writing a single line of code. Branch logic, time delays, and cross-module actions are all configurable through visual blocks." },
      { title: "Cross-Module Intelligence",         desc: "Trigger actions across Leads, Deals, Customers, Tasks, Finance, Email, WhatsApp, and Team modules from a single workflow. A deal stage change can simultaneously update the customer record, create a task, send an email, and fire a WhatsApp message — all in perfect sequence." },
      { title: "500+ Pre-Built Templates",         desc: "Launch powerful automations immediately using our template library. Templates cover lead nurturing, deal stage workflows, customer onboarding, payment reminders, renewal sequences, churn prevention, and team notifications. Customize any template to fit your exact process." },
      { title: "Time-Delayed & Scheduled Actions", desc: "Set actions to fire immediately, after a defined delay, or at a specific time. Send a follow-up email three days after a demo. Create a renewal task 90 days before contract end. Trigger a check-in message if a deal hasn't moved in seven days — all configured once, running forever." },
      { title: "Real-Time Monitoring & Analytics", desc: "Monitor every automation's execution in real time. See how many times each workflow has run, which records it processed, where errors occurred, and what business outcomes it generated. Automation analytics quantify time saved, tasks automated, and revenue attributed to each workflow." },
    ],
    howItWorks: [
      { num: "01", title: "Choose a Trigger",       desc: "Select what event starts the automation — a new lead, a deal stage change, a form submission, a date condition, a field value change, or a manual trigger. Triggers can be filtered with conditions so automations only fire for the right records." },
      { num: "02", title: "Define Conditions",      desc: "Add if/then branches that send different records down different paths. Route high-value leads to senior reps. Send different follow-up messages based on industry. Apply different discount approvals based on deal size." },
      { num: "03", title: "Add Actions",            desc: "Choose from 40+ action types: send email, send WhatsApp, create task, update field, assign record, create deal, send notification, call webhook, update stage, and more. Chain multiple actions in sequence with configurable delays." },
      { num: "04", title: "Activate & Monitor",     desc: "Turn the workflow on with a single toggle. Monitor execution in the real-time activity log. Review performance analytics weekly and optimize based on completion rates and business outcomes." },
    ],
    features: [
      { title: "40+ Action Types",                 desc: "Email sends, WhatsApp messages, task creation, field updates, deal creation, stage changes, team notifications, webhook calls, and more — all chainable in any sequence." },
      { title: "Conditional Logic & Branching",     desc: "Add if/then/else branches to handle different scenarios within a single workflow. Multiple branches can run simultaneously for the same record." },
      { title: "Approval Workflows",               desc: "Route deals, discounts, and exceptions through approval chains before proceeding. Track approval status, add comments, and escalate when approvers are unresponsive." },
      { title: "Webhook & API Actions",            desc: "Fire webhooks to external systems, trigger Zapier automations, call Make scenarios, or hit your own APIs — connecting KVl to your entire technology stack." },
      { title: "Workflow Version History",          desc: "Every change to a workflow is versioned. Roll back to a previous version if a change causes unexpected behavior. Compare versions side by side." },
      { title: "Error Handling & Retry Logic",     desc: "Failed actions are automatically retried based on configurable rules. Error notifications alert admins when workflows need attention. Detailed error logs show exactly what failed and why." },
    ],
    stats: [
      { value: "10×",  label: "Faster follow-up execution" },
      { value: "847",  label: "Average monthly workflow runs" },
      { value: "99.8%", label: "Automation success rate" },
      { value: "38%",  label: "Admin time saved per rep weekly" },
    ],
  },

  /* ══════════════════════════════════════════════
     AI ASSISTANT
  ══════════════════════════════════════════════ */
  "AI Assistant": {
    id: "ai", color: "#8b5cf6",
    title: "AI Assistant",
    tagline: "An Intelligent Co-Pilot for Every Member of Your Revenue Team",
    seoTitle: "KVl CRM AI Assistant — Intelligent Sales Co-Pilot & Revenue Intelligence",
    seoDesc: "KVl CRM's AI Assistant provides real-time recommendations, deal insights, email drafting, lead scoring explanations, and predictive revenue analysis — powered by advanced machine learning.",
    intro: "KVl CRM's AI Assistant is not a chatbot — it's an intelligent co-pilot that augments every member of your revenue team. From explaining why a deal score changed to drafting a personalized follow-up email to predicting which customers are at risk of churning, the AI Assistant delivers actionable intelligence exactly when it's needed.",
    heroText: [
      "Artificial intelligence in CRM has a reputation for being impressive in demos and disappointing in practice. KVl's approach is fundamentally different. Rather than building a generic AI assistant trained on public internet data, our AI is fine-tuned on your CRM's actual data — your deals, your customers, your win/loss patterns, your communication history. This means every insight, recommendation, and prediction is grounded in the specific reality of your business, not generic best practices.",
      "The AI Assistant surfaces contextual recommendations throughout the CRM interface, not just in a dedicated chat panel. When a rep opens a lead profile, the AI shows the three most important actions to take based on current deal stage, contact engagement history, and comparable deals that won. When a deal hasn't moved in eight days, the AI proactively suggests the most effective re-engagement approach based on what has worked with similar deals. This ambient intelligence reduces cognitive load and helps every rep make better decisions without needing to ask.",
      "For managers and executives, the AI generates daily briefings that summarize the most important changes since their last login — deals that moved, leads that went cold, customers whose health scores declined, and revenue that needs to close this week. Natural language querying allows non-technical leaders to ask questions like 'Which of our top 20 customers are at risk this quarter?' or 'What's our average deal size in the healthcare sector this year?' and receive instant, accurate answers without building a report.",
    ],
    benefits: [
      { title: "Contextual Deal Intelligence",     desc: "On every deal record, the AI surfaces the current win probability, the factors most likely to help or hurt the outcome, the suggested next action, and comparable deals that won or lost — giving reps a personal advisor on every opportunity without any manual analysis." },
      { title: "AI Email & Message Drafting",       desc: "With a single click, the AI drafts a personalized follow-up email or WhatsApp message based on the contact's history, last interaction, current deal stage, and stated preferences. Reps review, edit, and send in seconds — spending time on nuance rather than first drafts." },
      { title: "Natural Language CRM Querying",     desc: "Ask any question about your business in plain English and receive an instant, accurate answer. 'How many deals did we close in Q3?', 'Which rep has the highest win rate this year?', 'Show me customers who haven't been contacted in 60 days' — all answered without building a filter or report." },
      { title: "Predictive Churn Detection",        desc: "The AI continuously analyzes 25 churn risk signals — declining engagement, reduced product usage, support ticket patterns, payment delays, and sentiment shifts — and flags at-risk customers weeks before the danger becomes visible to a human reviewer. Early intervention saves accounts that would otherwise be lost." },
      { title: "Sales Coaching Recommendations",    desc: "The AI analyzes individual rep performance patterns and identifies specific, actionable coaching opportunities. 'Rep X closes 40% fewer deals after the second meeting — they may need support in handling objections.' Evidence-based coaching recommendations that managers can act on immediately." },
    ],
    howItWorks: [
      { num: "01", title: "Learn Your Business",    desc: "The AI trains on your CRM data from day one — analyzing your deal patterns, win/loss ratios, customer behaviors, and communication history to build a model specific to your business. Accuracy improves continuously as more data accumulates." },
      { num: "02", title: "Deliver Contextual Insights", desc: "Insights appear throughout the interface in the right context. On a deal record, you see deal intelligence. On a customer profile, you see health analysis. In your task queue, you see prioritization recommendations. Intelligence meets you where you're working." },
      { num: "03", title: "Answer Your Questions",  desc: "Use the AI chat interface to ask any question about your business. The AI queries your live CRM data, performs the analysis, and returns an accurate, plain-English answer with supporting data visualizations." },
      { num: "04", title: "Improve Over Time",      desc: "The AI learns from every interaction. When reps follow AI recommendations and outcomes improve, the model reinforces those patterns. When recommendations aren't followed, the AI adjusts. A continuously improving advisor that gets smarter with your business." },
    ],
    features: [
      { title: "AI Deal Scoring & Explanation",     desc: "Every deal score comes with a plain-English explanation of the top factors driving it — giving reps context to understand and improve their deals." },
      { title: "Smart Email Subject Lines",         desc: "AI generates and tests multiple subject line variants for email campaigns, predicting open rates based on historical performance and industry benchmarks." },
      { title: "Lead Qualification Assistant",      desc: "The AI pre-qualifies leads based on ICP fit, engagement signals, and behavioral patterns — routing high-fit leads to senior reps and low-fit leads to nurture sequences automatically." },
      { title: "Revenue Scenario Modeling",         desc: "Model revenue scenarios — 'What if our average deal size increases by 15%?' — and see the projected annual impact on pipeline and revenue with confidence intervals." },
      { title: "Competitive Intelligence Alerts",   desc: "The AI monitors deal notes, call transcripts, and emails for competitor mentions, extracting and summarizing competitive intelligence across your entire customer base." },
      { title: "Daily AI Briefing",                desc: "A personalized morning briefing delivered via email and in-app notification, summarizing the most important changes and actions required across your CRM since your last login." },
    ],
    stats: [
      { value: "34%",  label: "Higher win rate with AI recommendations" },
      { value: "61%",  label: "Churn caught before renewal" },
      { value: "5min", label: "Daily time saved per rep on analysis" },
      { value: "92%",  label: "AI recommendation accuracy" },
    ],
  },

  /* ══════════════════════════════════════════════
     TEAM MGMT
  ══════════════════════════════════════════════ */
  "Team Mgmt": {
    id: "team", color: "#06b6d4",
    title: "Team Management",
    tagline: "Build, Manage, and Scale a High-Performance Revenue Team",
    seoTitle: "KVl CRM Team Management — Sales Team Performance, Roles & Collaboration",
    seoDesc: "KVl CRM's team management module gives sales leaders complete visibility into team performance — rep scorecards, quota tracking, role-based access, collaboration tools, and capacity planning.",
    intro: "Great sales results are built by great teams. KVl CRM's Team Management module gives leaders the tools to hire, organize, motivate, measure, and develop their revenue team — all within the same platform where their reps work every day.",
    heroText: [
      "Managing a sales team without data is like coaching a sports team without a scoreboard. You know generally what's happening, but you can't optimize specific performance gaps without objective evidence. KVl's Team Management module provides that scoreboard — a real-time, multi-dimensional view of individual and team performance that replaces intuition with intelligence. From activity metrics to pipeline contribution to quota attainment to customer success scores, every dimension of sales performance is captured, analyzed, and visualized.",
      "Role-based access control is one of the most critical features in an enterprise CRM, and KVl's implementation is the most granular available in its class. Super Admins define plan-level feature access. Admins configure role-based section permissions. Team leads can further restrict or grant access at the individual user level. This three-tier permission architecture means every team member sees exactly what they need — nothing more, nothing less — reducing information overload and protecting sensitive data across large, complex organizations.",
      "Team collaboration features transform KVl from a personal productivity tool into a genuinely collaborative platform. Shared deal rooms, internal comments on any record, @mentions that trigger notifications, collaborative proposal creation, and team-level performance goals all foster the communication and transparency that high-performing sales organizations depend on. When everyone is working from the same information, with the same context, towards the same goals, team performance consistently exceeds the sum of individual contributions.",
    ],
    benefits: [
      { title: "Real-Time Rep Performance Scorecards", desc: "Individual performance dashboards showing quota attainment, deal win rate, average deal size, sales cycle length, activity completion rate, and customer satisfaction scores — updated live and visible to both reps and managers. Objective data replaces subjective performance reviews." },
      { title: "Hierarchical Role & Permission System", desc: "Three-tier access control — Super Admin, Admin, and Role-based — ensures every team member has exactly the right level of access. Create unlimited custom roles with granular module and feature permissions. Changes apply instantly across all active sessions." },
      { title: "Quota & Goal Management",           desc: "Set individual, team, and company-level revenue quotas for any time period. Real-time progress tracking against targets keeps reps motivated and gives managers early warning when quota attainment is at risk. Goal achievement feeds directly into performance reviews." },
      { title: "Capacity & Territory Planning",     desc: "Visualize team capacity across regions, industries, and account sizes. Identify overloaded reps and territories with insufficient coverage. Balance deal distribution and lead assignment rules to maximize team efficiency and minimize revenue leakage from neglected opportunities." },
      { title: "Onboarding & Learning Paths",       desc: "New rep onboarding workflows guide team members through platform setup, introduce key contacts, assign initial training tasks, and measure completion. Ramp-time analytics compare new hire productivity trajectories, identifying who needs additional support early in their tenure." },
    ],
    howItWorks: [
      { num: "01", title: "Build Your Team Structure", desc: "Create your organizational hierarchy — divisions, regions, teams, and individuals. Assign managers, define territories, set quotas, and configure role-based permissions. Team structure changes propagate instantly through all reporting." },
      { num: "02", title: "Set Goals & Benchmarks",   desc: "Define performance benchmarks for every role — activity minimums, deal velocity targets, quota attainment expectations. KVl measures actual performance against these benchmarks in real time, flagging underperformance before it impacts quarterly results." },
      { num: "03", title: "Monitor & Coach",          desc: "Weekly team performance summaries land in every manager's inbox. Drill into individual rep performance from the team dashboard. Schedule coaching sessions, log development actions, and track improvement over time — all within KVl." },
      { num: "04", title: "Recognize & Retain",       desc: "Team leaderboards, achievement badges, and goal-completion celebrations keep reps engaged. High-performer recognition feeds into talent retention strategies — and KVl's attrition risk indicators flag disengaged team members before they resign." },
    ],
    features: [
      { title: "User Management & SSO",            desc: "Add, remove, and manage team members with bulk operations. Single sign-on (SSO) integration with Google, Microsoft, and Okta for enterprise-grade access management." },
      { title: "Activity Monitoring",              desc: "Real-time visibility into every team member's activity — calls made, emails sent, meetings held, deals updated, tasks completed. Identify the behaviors that correlate with top performance." },
      { title: "Team Chat & Collaboration",        desc: "Internal messaging, @mentions on any CRM record, and team-level deal rooms enable seamless communication without leaving the CRM." },
      { title: "Commission Tracking",             desc: "Define commission structures and track earnings in real time as deals close. Generate commission reports for payroll with one click." },
      { title: "Performance Comparison Views",     desc: "Compare rep performance side-by-side across any metric or time period. Identify best-practice patterns from top performers to share with the broader team." },
      { title: "Audit Trail & Compliance",         desc: "Every action taken by every user is logged with timestamp, user identity, and data change record. Full audit trail available for compliance, legal, and security review." },
    ],
    stats: [
      { value: "2.1×", label: "Team productivity increase" },
      { value: "47%",  label: "Faster new rep ramp time" },
      { value: "85%",  label: "Quota attainment with goal tracking" },
      { value: "62%",  label: "Reduction in team admin overhead" },
    ],
  },

  /* ══════════════════════════════════════════════
     SMART INSIGHTS
  ══════════════════════════════════════════════ */
  "Smart Insights": {
    id: "ai-insights", color: "#f59e0b",
    title: "Smart Insights",
    tagline: "The Business Intelligence Layer That Makes Every Decision Smarter",
    seoTitle: "KVl CRM Smart Insights — AI-Powered Business Intelligence & Predictive Analytics",
    seoDesc: "KVl CRM's Smart Insights module combines real-time dashboards, predictive analytics, anomaly detection, and benchmarking to give revenue leaders the intelligence they need to make faster, better decisions.",
    intro: "Smart Insights is KVl's highest-level intelligence layer — a continuously learning analytical engine that synthesizes data from every module to surface the insights, patterns, and predictions that matter most to your business right now.",
    heroText: [
      "Most business intelligence tools tell you what happened. Smart Insights tells you what's happening, what's about to happen, and what you should do about it. By continuously analyzing data streams from Leads, Deals, Customers, Finance, Email, WhatsApp, and Team modules simultaneously, Smart Insights identifies patterns, anomalies, and opportunities that would be invisible to any human analyst reviewing individual dashboards. It's the equivalent of having a dedicated data science team working on your business 24 hours a day.",
      "Anomaly detection is one of Smart Insights' most valuable capabilities for growing businesses. Normal performance variation is expected — but sudden drops in email open rates, unexpected spikes in customer churn, unusual deal stage conversion changes, or unexpected revenue declines can signal serious problems that need immediate attention. Smart Insights' anomaly detection algorithms establish baseline patterns for every key metric and alert the right people the moment a statistically significant deviation occurs — typically days before the issue would appear in a standard report.",
      "Competitive benchmarking contextualizes your performance against industry standards. KVl aggregates anonymized, aggregated performance data from thousands of businesses in its network to produce accurate benchmarks by industry, company size, and geographic region. See exactly how your lead conversion rates, deal win rates, email open rates, and customer retention numbers compare to businesses like yours — and understand whether underperformance is a company-specific issue or an industry-wide challenge requiring a different response.",
    ],
    benefits: [
      { title: "Pattern Recognition at Scale",     desc: "Smart Insights analyzes millions of data points across your entire CRM history to identify non-obvious patterns — which lead sources produce the highest LTV customers, which sales behaviors correlate with largest deals, which customer profiles are most likely to expand. Insights no spreadsheet would ever surface." },
      { title: "Proactive Anomaly Detection",      desc: "Define normal performance ranges and KVl's anomaly detection engine monitors every key metric continuously. The moment a metric moves outside its expected range — email deliverability drops, churn rate spikes, pipeline velocity slows — you receive an automated alert with context and suggested actions." },
      { title: "Predictive Revenue Intelligence",   desc: "Forward-looking models project next-quarter revenue based on current pipeline quality, historical close rates, seasonal patterns, and market signals. Scenario analysis lets you model the revenue impact of different pipeline outcomes, conversion rate improvements, or team capacity changes." },
      { title: "Industry Benchmarking",            desc: "Compare your performance against anonymized benchmarks from similar businesses. Understand whether your 23% email open rate is exceptional or below average for your industry. Prioritize improvement efforts based on where you have the most opportunity relative to peers." },
      { title: "Executive Decision Support",        desc: "Natural language summaries of complex data patterns are generated weekly and delivered directly to leadership. Instead of reading dashboard numbers, executives receive plain-English narratives explaining what's changed, why it matters, and what action is recommended — saving hours of analysis time." },
    ],
    howItWorks: [
      { num: "01", title: "Continuous Data Collection", desc: "Smart Insights ingests data from every KVl module in real time — deals moving, leads converting, emails opening, customers churning, invoices being paid. No data preparation or ETL processes required." },
      { num: "02", title: "Pattern Analysis & Learning", desc: "Machine learning models identify patterns, establish baselines, and calibrate predictions using your historical data. Models improve continuously as more data accumulates — most customers see significant accuracy improvements within 90 days." },
      { num: "03", title: "Surface & Alert",           desc: "Insights are surfaced proactively in the dashboard, in context throughout the CRM, and via scheduled email briefings. High-priority alerts arrive in real time. Trend analysis and forecasts update daily." },
      { num: "04", title: "Recommend & Track Outcomes", desc: "Smart Insights recommends specific actions for each detected pattern or anomaly. When recommendations are followed, outcomes are tracked and fed back into the model — creating a continuous improvement loop." },
    ],
    features: [
      { title: "Revenue Trend Analysis",           desc: "Multi-dimensional trend analysis across revenue, pipeline, activity, and customer metrics — with year-over-year, quarter-over-quarter, and month-over-month comparisons." },
      { title: "Customer Segment Performance",     desc: "Automatically identify which customer segments are most valuable, growing fastest, and at highest churn risk — with recommended actions for each segment." },
      { title: "Sales Process Optimization",       desc: "Identify the specific steps in your sales process that create the most value — and those that create the most friction. Data-backed process improvement recommendations." },
      { title: "Market Opportunity Scoring",       desc: "Analyze your prospect database and identify the highest-potential untapped opportunities based on firmographic fit, engagement signals, and timing indicators." },
      { title: "Cross-Channel Attribution",        desc: "Understand which combination of marketing and sales touchpoints most reliably leads to closed deals — and allocate your team's time and budget accordingly." },
      { title: "Board-Ready Reports",             desc: "One-click generation of executive-quality reports in presentation format, ready for board meetings, investor updates, and management reviews." },
    ],
    stats: [
      { value: "4.2×", label: "Faster insight discovery" },
      { value: "89%",  label: "Anomaly detection accuracy" },
      { value: "2.6×", label: "Better decision quality" },
      { value: "5hr",  label: "Analyst time saved per week" },
    ],
  },
};
