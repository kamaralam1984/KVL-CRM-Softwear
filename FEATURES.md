# KVl CRM — Complete Features & How It Works

**Version:** 1.0 | **Stack:** Next.js 16 + React 19 + TypeScript  
**Live:** `http://localhost:3001` | **Run:** `npm run dev`

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Design System](#3-design-system)
4. [Pages & Routing](#4-pages--routing)
5. [Landing Page Features](#5-landing-page-features)
6. [Auth System (Login/Signup)](#6-auth-system)
7. [CRM Dashboard Sections](#7-crm-dashboard-sections)
8. [AI Assistant](#8-ai-assistant)
9. [Command Palette](#9-command-palette)
10. [Data Layer](#10-data-layer)
11. [Backend (Supabase)](#11-backend-supabase)
12. [CSV Export](#12-csv-export)
13. [Dark / Light Mode](#13-dark--light-mode)
14. [How to Set Up](#14-how-to-set-up)

---

## 1. Project Overview

**KVl CRM** is a full-stack, AI-powered CRM (Customer Relationship Management) platform built for sales teams. It helps manage leads, customers, deals, tasks, email campaigns, WhatsApp conversations, and more — all in one place.

**Jo kaam karta hai:**
- Leads track karo aur hot leads identify karo
- Deals ko pipeline mein manage karo (Kanban style)
- Customers ki health monitor karo
- Email campaigns bhejo
- WhatsApp se customers se baat karo
- Tasks assign karo team ko
- Reports aur finance dekho
- AI Assistant se real-time insights lo

---

## 2. Tech Stack

| Technology | Version | Kya karta hai |
|-----------|---------|--------------|
| **Next.js** | 16.2.6 | Framework, routing, server actions |
| **React** | 19.2.4 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | v4 | Styling |
| **Framer Motion** | 12.x | Animations, page transitions |
| **Recharts** | 3.x | Charts (area, bar, pie, line) |
| **Radix UI** | Various | Modal, dialog, tabs, tooltips |
| **Lucide React** | 1.x | Icons |
| **Supabase** | Latest | Database + Auth (PostgreSQL) |
| **Anthropic SDK** | Latest | Claude AI for AI Assistant |
| **Playwright** | 1.60 | Browser testing |

---

## 3. Design System

### Colors
| Color | Hex | Use |
|-------|-----|-----|
| **Gold** (Primary) | `#D4AF37` → `#F5C842` | CTAs, buttons, active states, headline |
| **Green** (Success) | `#006B3C` → `#00843D` | Logo, stats, checkmarks, positive |
| **Black** (Dark BG) | `#080c14` | Dark mode background |
| **Cream** (Light BG) | `#F8F6F1` | Light mode background |
| **White** | `#FFFFFF` | Text on dark, cards |

### CSS Classes (globals.css)
- `.gradient-bg` — Gold gradient (buttons, CTAs)
- `.green-grad` — Green gradient (logo, avatar)
- `.gradient-text` — Green gradient text
- `.glass` — Glassmorphism effect (sidebar, cards)
- `.glass-card` — Card with blur backdrop
- `.sidebar-item` — Nav item with hover/active states
- `.metric-card` — Dashboard metric cards
- `.badge` — Status badges
- `.neon-blue` / `.neon-purple` — Glow shadows
- `.glow-animate` — Pulsing glow animation

### Themes
- **Dark Mode:** `#080c14` bg, white text, gold accents
- **Light Mode:** `#F8F6F1` bg, black text, same gold accents
- Toggle: Sun/Moon button in navbar + persists in `localStorage`

---

## 4. Pages & Routing

```
/ (root)
├── Landing Page      → KVl CRM marketing website
├── /features         → Features page
├── /pricing          → Pricing page
├── /privacy          → Privacy policy
├── /terms            → Terms of service
└── /contact          → Contact page

App Views (Single Page):
├── "landing"   → LandingPage component
├── "auth"      → Auth component (login/signup)
└── "app"       → Full CRM dashboard
```

**Flow:**
1. User lands on `/` → sees Landing Page
2. Clicks "Get Started" / "Sign In" → Auth page
3. Logs in → CRM Dashboard
4. Session saved in `localStorage` → auto-login on return

---

## 5. Landing Page Features

**File:** `components/crm/LandingPage.tsx`

### Sections:
1. **Navbar** — Sticky, blur on scroll, dark/light toggle, "Get Started Free" gold button
2. **Hero** — Animated particle canvas, real bg photo, gold shimmer headline, "Watch Demo" button
3. **Logo Marquee** — Auto-scrolling company logos (Salesforce, HubSpot, Slack, Stripe, etc.)
4. **Stats Bar** — Animated counters: 2400+ companies, 98% satisfaction, 3.2× revenue, 40% faster
5. **Features** — 8 feature cards with hover effects
6. **Product Showcase** — Real dashboard photo with overlay
7. **How it Works** — 3 steps with real Unsplash photos
8. **Testimonials** — 3 cards with real Unsplash profile photos
9. **Pricing** — 3 plans ($29/$79/$199), annual/monthly toggle (30% off)
10. **Final CTA** — "Start Your Free Trial" with gold button
11. **Footer** — Links, copyright
12. **Video Modal** — Real video player (Mixkit CDN) opens on "Watch Demo" click

### Animations:
- Particle canvas with gold dots and connecting lines
- Scroll-triggered FadeIn on every section
- Parallax hero section (scrolls slower than page)
- Animated gold orbs in background
- Shimmer effect on headline text
- Counter animations when in viewport
- Hover effects on all cards

---

## 6. Auth System

**File:** `components/crm/Auth.tsx`

### Features:
- **Sign In** tab + **Create Account** tab
- Real particle background (gold + green dots)
- Animated logo with green gradient
- **Dark/Light mode toggle** (top-right)
- Password show/hide toggle
- Password strength meter (Weak/Medium/Strong)
- "Remember me" checkbox
- **Quick-fill badges:** Admin / Sales / Viewer
- Social login buttons: Google + GitHub (UI ready)
- Demo credentials hint

### Login Logic:
```
If Supabase configured:
  → Real Supabase signInWithPassword()
  → Real user session
Else (demo mode):
  → Any email + password (min 4 chars) works
  → Known accounts get their role (Admin/Senior AE/Viewer)
  → New email → name auto-generated, role = Member
```

### Known Demo Accounts:
| Email | Password | Role |
|-------|----------|------|
| animesh@freedomwithai.com | demo123 | Admin |
| sarah@aicrmpro.com | demo123 | Senior AE |
| demo@crm.com | demo | Viewer |
| *any email* | *any 4+ chars* | Member |

---

## 7. CRM Dashboard Sections

### 7.1 Dashboard
**File:** `sections/Dashboard.tsx`

- Welcome banner with user name + live date
- Quick stats: Pipeline value, Growth %, Team size, Win Rate
- **4 KPI metric cards:** Total Revenue, Active Leads, Win Rate, Tasks Completed
- **Business Pulse:** MRR, ARR, NPS Score, Churn Rate, Avg Deal, CAC
- **Revenue Growth chart** (area chart — monthly)
- **Pipeline Health** bar chart (Prospect → Qualified → Proposal → Negotiation → Closed Won)
- **Recent Wins** feed with deal names and values
- Live data indicator with green pulse dot

### 7.2 Leads
**File:** `sections/Leads.tsx`

- Lead table with: Name, Company, Email, Score (0-100), Status (hot/warm/cold), Stage, Value, Owner
- **Score badges** — color-coded (red=hot, amber=warm, blue=cold)
- **Add Lead** modal with full form
- Filter by status/stage
- Edit + Delete per lead
- Stage: Discovery → Qualified → Proposal → Negotiation → Closed

### 7.3 Customers
**File:** `sections/Customers.tsx`

- Customer cards with: Name, Contact, Segment, Health score, Status
- **Health meter** (0-100%) with color coding
- Status: Active / At-Risk / Champion / Churned
- Segment: Enterprise / SMB / Startup / Agency
- Add/Edit/Delete customers
- Renewal date tracking

### 7.4 Deals
**File:** `sections/Deals.tsx`

- Deal table: Name, Company, Value, Stage, Probability %, Owner, Days in stage
- **Probability bar** per deal
- Add Deal modal
- Stage-based filtering
- Total pipeline value calculation

### 7.5 Sales Pipeline (Kanban)
**File:** `sections/Pipeline.tsx`

- **5-column Kanban board:** Discovery → Qualified → Proposal → Negotiation → Closed Won
- Per-column deal cards showing company, value, probability
- Per-column total value display
- **Add Deal** button per column (pre-fills stage)
- Drag-and-drop style layout

### 7.6 Tasks
**File:** `sections/Tasks.tsx`

- Task list: Title, Priority, Due date, Assignee, Status, Tags, Company
- **Priority badges:** High (red) / Medium (amber) / Low (green)
- **Status:** Pending / In-Progress / Completed
- Checkbox to mark complete
- **Add Task** modal
- Filter by priority/status
- Tag-based organization

### 7.7 Calendar
**File:** `sections/Calendar.tsx`

- Monthly calendar view
- Event scheduling
- Task/meeting visualization
- Date navigation (prev/next month)

### 7.8 WhatsApp CRM
**File:** `sections/WhatsApp.tsx`

- **4 tabs:** Chats / Campaigns / Auto-Reply / Contacts
- **Chats tab:** Contact list + conversation thread (chat bubble UI)
- Send messages (local state)
- **Broadcast tab:** Create broadcast campaigns, select contacts
- **Auto-Reply:** Keyword triggers → automated responses
- Add/delete/toggle auto-reply rules
- Hit count per rule

### 7.9 Email Marketing
**File:** `sections/Email.tsx`

- Campaign table: Name, Status, Sent, Open Rate, Click Rate, Date
- Progress bars for open/click rates
- **6 Quick Templates** grid with preview popup
- **New Campaign** modal
- Status: Sent / Scheduled / Draft
- Template → "Use Template" → opens campaign modal

### 7.10 Team
**File:** `sections/Team.tsx`

- Team member cards: Name, Role, Email, Deals, Revenue, Target, Performance %
- **Performance bar** (green if >100%, blue if >90%, amber otherwise)
- Status indicator: Online / Away / Offline
- Add team member

### 7.11 Reports
**File:** `sections/Reports.tsx`

- **4 KPI cards:** Total Revenue, Total Deals, Avg Deal Size, Win Rate
- **Monthly Revenue chart** with 3M/6M/1Y period filter (area chart)
- **Quarterly vs Target** bar chart
- **Team Performance** table with progress bars
- **Export Report** → downloads `crm-full-report.csv` ✅
- **CSV button** on chart → downloads filtered data ✅
- **Export CSV** on team table ✅

### 7.12 Finance
**File:** `sections/Finance.tsx`

- **4 summary cards:** Total Invoiced, Collected, Pending, Overdue
- **Invoice table:** ID, Client, Amount, Status, Due Date
- Status badges: Paid (green) / Pending (blue) / Overdue (red)
- **New Invoice** modal
- **Export CSV** → downloads `invoices.csv` ✅
- **3 metric cards:** MRR, ARR, Churn Rate

### 7.13 Automation
**File:** `sections/Automation.tsx`

- Automation list with: Name, Trigger, Active status, Run count
- Toggle automation on/off
- Add new automation workflow
- Color-coded automation types

### 7.14 Smart Insights (formerly AI Insights)
**File:** `sections/AIInsights.tsx`

- **6 health score rings:** Lead Quality, Pipeline Health, Customer Retention, Team Performance, Revenue Forecast, Automation Score
- **Tabs:** All / Revenue / Lead Intel / Churn Risk / Team Coaching
- **Insight cards** with priority (Critical/High/Medium/Low), confidence %, impact value
- Dismiss/expand individual insights
- **Scan** button (re-triggers animation)
- **AI Recommendations** panel

### 7.15 Settings
**File:** `sections/Settings.tsx`

- **Account:** Profile edit modal, Security (2FA), API Keys
- **Workspace:** Company info, Notification toggles (5 switches), Appearance
- **Integrations:** Connect/disconnect Slack, Gmail, WhatsApp, Stripe
- Edit Profile → updates header card live
- Accordion sections (one open at a time)

### 7.16 Admin Panel
**File:** `sections/AdminPanel.tsx`

- Only visible to **Admin** role users
- User management (view all users)
- System stats
- Role assignment

---

## 8. AI Assistant

**Files:** `components/crm/AIAssistant.tsx` + `app/api/ai/chat/route.ts`

### How it works:
1. Click **"Assistant"** button in top navbar
2. Floating panel opens (bottom-right)
3. Type any question or use **quick commands**
4. Real **Claude AI (claude-sonnet-4-6)** responds with streaming

### Quick Commands:
- Show pending deals
- Find hot leads
- Generate sales report
- Top customers this month
- Overdue invoices
- Team performance

### API Route (`/api/ai/chat`):
```
POST /api/ai/chat
Body: { message: string, history: Message[] }
Response: StreamingText (Server-Sent Events)
```

### System Prompt includes:
- Current pipeline value + deal stages
- Hot leads list (Lisa Zhang, Alex Morgan, Ryan O'Brien)
- Customer health data
- Overdue invoices
- Team performance %
- Revenue metrics

**Requires:** `ANTHROPIC_API_KEY` in `.env.local`

---

## 9. Command Palette

**File:** `components/crm/CommandPalette.tsx`

**Open:** `Ctrl+K` (or `Cmd+K` on Mac)

### Search results include:
- **Navigation** — Go to any section (Dashboard, Leads, etc.)
- **Create** — New Lead, Deal, Task, Customer, Invoice, Campaign
- **Actions** — Open AI Assistant, Generate Report, View Pipeline
- **Leads** — Search by name, company, stage, value
- **Customers** — Search by name, segment, health %
- **Deals** — Search by name, company, stage, value

### Keyboard shortcuts:
- `↑↓` — Navigate results
- `Enter` — Select
- `Esc` — Close

---

## 10. Data Layer

**File:** `lib/data.ts`

All CRM data is stored here as TypeScript arrays. Currently **in-memory** (resets on page refresh).

| Export | Records | Fields |
|--------|---------|--------|
| `leads` | 10 | name, company, email, score, status, stage, value, owner, tags |
| `customers` | 8 | name, contact, value, segment, health, status, renewal |
| `deals` | 11 | name, company, value, stage, probability, owner, daysInStage |
| `tasks` | 8 | title, priority, due, assignee, status, tags |
| `teamMembers` | 6 | name, role, deals, revenue, target, performance |
| `invoices` | 6 | id, client, amount, status, date, due |
| `emailCampaigns` | 5 | name, status, sent, openRate, clickRate |
| `salesChartData` | 12 | month, revenue, leads, deals |
| `automations` | various | name, trigger, active, runs |

---

## 11. Backend (Supabase)

**Files:** `lib/supabase/` + `lib/actions/`

### Database Tables (schema.sql):
```sql
profiles      — Users (extends auth.users)
leads         — Lead records
customers     — Customer records
deals         — Deal records
tasks         — Task records
invoices      — Invoice records
```

### Server Actions:
- `lib/actions/leads.ts` — getLeads, createLead, updateLead, deleteLead
- `lib/actions/customers.ts` — CRUD for customers
- `lib/actions/deals.ts` — CRUD for deals
- `lib/actions/tasks.ts` — CRUD for tasks

### Auth Callback:
- `app/api/auth/callback/route.ts` — Handles email confirmation redirect

### Setup:
1. Create project at supabase.com
2. Run `lib/supabase/schema.sql` in SQL Editor
3. Add keys to `.env.local`

**Without Supabase:** App works in demo mode with seed data from `lib/data.ts`

---

## 12. CSV Export

**File:** `lib/export.ts`

```typescript
downloadCSV(filename: string, rows: Row[])
```

### Working exports:
| Button | Section | Downloads |
|--------|---------|-----------|
| "Export Report" | Reports | `crm-full-report.csv` (12 months revenue data) |
| "CSV" (chart button) | Reports | `revenue-{period}.csv` (filtered) |
| "Export CSV" (team table) | Reports | `team-performance.csv` |
| "Export CSV" | Finance | `invoices.csv` |

---

## 13. Dark / Light Mode

**Persistence:** `localStorage.setItem("kvl_theme", "dark"|"light")`

**CSS Classes:** `.dark` or `.light` on root div

### Toggle locations:
- Landing Page navbar (sun/moon icon)
- Auth page (top-right corner)
- CRM TopNav (sun/moon icon)

### Theme syncs across:
- Landing Page → Login → Dashboard (all read same localStorage key)

---

## 14. How to Set Up

### Basic (Demo Mode — no backend needed):
```bash
cd crm-app
npm install
npm run dev
# Open: http://localhost:3001
# Login: any email + any password (4+ chars)
```

### Full Production Setup:
```bash
# 1. Copy env file
cp .env.local.example .env.local

# 2. Fill in keys:
# NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
# SUPABASE_SERVICE_ROLE_KEY = eyJ...
# ANTHROPIC_API_KEY = sk-ant-...

# 3. Run Supabase schema
# Go to supabase.com → SQL Editor → paste lib/supabase/schema.sql

# 4. Start server
npm run dev
```

### Key Files:
```
crm-app/
├── app/
│   ├── page.tsx              ← Main app entry point
│   ├── globals.css           ← Design system CSS
│   └── api/
│       ├── ai/chat/          ← Claude AI streaming endpoint
│       └── auth/callback/    ← Supabase auth callback
├── components/crm/
│   ├── LandingPage.tsx       ← Marketing website
│   ├── Auth.tsx              ← Login/Signup
│   ├── Sidebar.tsx           ← Navigation
│   ├── TopNav.tsx            ← Header bar
│   ├── AIAssistant.tsx       ← Floating AI chat
│   ├── CommandPalette.tsx    ← Ctrl+K search
│   └── sections/             ← All 16 CRM sections
├── lib/
│   ├── data.ts               ← Seed/mock data
│   ├── export.ts             ← CSV download utility
│   ├── utils.ts              ← Helpers (cn, formatCurrency)
│   ├── appConfig.ts          ← App mode config
│   ├── supabase/             ← DB clients + schema
│   └── actions/              ← Server actions (CRUD)
└── .env.local.example        ← Required env vars template
```

---

## Summary — Feature Count

| Category | Features |
|----------|---------|
| Landing Page sections | 11 |
| CRM Dashboard sections | 16 |
| Charts/graphs | 8+ |
| Working CSV exports | 4 |
| AI Assistant commands | ∞ (real Claude AI) |
| Command Palette commands | 30+ + all CRM data |
| Theme modes | 2 (dark/light) |
| Auth modes | Demo + Real (Supabase) |
| Database tables | 6 |
| Server actions | 16 (CRUD × 4 entities) |
| API routes | 2 |

---

*Built with ❤️ by FreedomWithAI · KVl CRM © 2026*
