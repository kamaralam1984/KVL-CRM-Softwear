# CRM App — Poora System Kaise Kaam Karta Hai

## 1. Project Structure (File Layout)

```
crm-app/
├── app/
│   ├── page.tsx          ← Entry point — poori app yahan se shuru hoti hai
│   ├── layout.tsx        ← HTML wrapper, fonts load hote hain yahan
│   └── globals.css       ← Saare custom CSS classes (glass-card, gradient-bg, etc.)
├── components/
│   └── crm/
│       ├── Sidebar.tsx       ← Left navigation menu
│       ├── TopNav.tsx        ← Upar wala bar (search, dark mode, AI button)
│       ├── AIAssistant.tsx   ← Right side panel (AI chat)
│       └── sections/
│           ├── Dashboard.tsx
│           ├── Leads.tsx
│           ├── Customers.tsx
│           ├── Deals.tsx
│           ├── Pipeline.tsx
│           ├── Tasks.tsx
│           ├── Calendar.tsx
│           ├── WhatsApp.tsx
│           ├── Email.tsx
│           ├── Team.tsx
│           ├── Reports.tsx
│           ├── Finance.tsx
│           ├── Automation.tsx
│           ├── AIInsights.tsx
│           └── Settings.tsx
├── components/ui/
│   └── modal.tsx         ← Reusable popup modal (sab sections use karte hain)
└── lib/
    ├── data.ts           ← Saara sample data (leads, customers, deals, etc.)
    └── utils.ts          ← Helper functions (cn, formatCurrency)
```

---

## 2. Main App — `app/page.tsx`

Yeh file **poori app ka brain** hai. Iske teen kaam hain:

### (a) Section Registration — `sectionMap`
```tsx
const sectionMap = {
  dashboard:  Dashboard,
  leads:      Leads,
  customers:  Customers,
  deals:      Deals,
  pipeline:   Pipeline,
  tasks:      Tasks,
  calendar:   Calendar,
  whatsapp:   WhatsApp,
  email:      Email,
  team:       Team,
  reports:    Reports,
  finance:    Finance,
  automation: Automation,
  ai:         AIInsights,
  settings:   Settings,
};
```
Har string key (jaise `"leads"`) ek React component se linked hai. Jab user sidebar mein "Leads" click kare, toh `activeSection = "leads"` ho jata hai aur `sectionMap["leads"]` yaani `Leads` component render hota hai.

### (b) State Management
```tsx
const [activeSection, setActiveSection]   = useState("dashboard");  // kaunsa page dikhe
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);    // sidebar chota ho
const [aiOpen, setAiOpen]                 = useState(false);         // AI panel khule
const [darkMode, setDarkMode]             = useState(true);          // dark/light theme
```

### (c) Layout
```
┌────────────────────────────────────────────────────┐
│                    TopNav                          │
├──────────┬─────────────────────────────────────────┤
│          │                                         │
│ Sidebar  │          Active Section                 │
│  (left)  │    (Dashboard / Leads / etc.)           │
│          │                                         │
└──────────┴─────────────────────────────────────────┘
         AI Assistant (right side panel, toggleable)
```

---

## 3. Sidebar — `components/crm/Sidebar.tsx`

### Menu Groups
Sidebar ke items **4 groups** mein divided hain:

| Group     | Items                                                      |
|-----------|------------------------------------------------------------|
| **Main**  | Dashboard, Leads (12), Customers, Deals, Tasks (5), Calendar |
| **Sales** | Sales Pipeline, WhatsApp CRM (3), Email Marketing          |
| **Insights** | Team, Reports, Finance, Automation, AI Insights         |
| **System**| Settings                                                   |

Numbers jaise (12), (5), (3) = **badges** — unread/pending count dikhate hain.

### Collapse Feature
- Sidebar expand/collapse hoti hai (`collapsed: boolean` prop)
- Collapsed mein sirf icons dikhte hain, labels hide ho jaate hain (Framer Motion animation ke saath)
- Toggle button sidebar ke right edge par hai (`-right-3`)

### Navigation Flow
```
User clicks "Leads" button
        ↓
onClick={() => onSectionChange("leads")}
        ↓
page.tsx mein setActiveSection("leads")
        ↓
Section = sectionMap["leads"] = Leads component
        ↓
Framer Motion animation (fade + slide up)
        ↓
<Leads /> render hota hai
```

---

## 4. Page Switching — Animation

`AnimatePresence` + `motion.div` se har section change pe smooth animation hoti hai:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeSection}        // key change = re-animate
    initial={{ opacity: 0, y: 14 }}   // neeche se aata hai
    animate={{ opacity: 1, y: 0 }}    // normal position
    exit={{ opacity: 0, y: -8 }}      // upar ja ke fade out
    transition={{ duration: 0.2 }}
  >
    <Section />
  </motion.div>
</AnimatePresence>
```

---

## 5. Data Layer — `lib/data.ts`

Yahan saara **mock/sample data** define hai. Yeh data sections import karke `useState` mein daal dete hain taaki interactive ho:

| Export              | Use Karta Hai         | Shape                                         |
|---------------------|-----------------------|-----------------------------------------------|
| `salesChartData`    | Reports, Dashboard    | `{ month, revenue, leads, deals }`            |
| `leads`             | Leads                 | `{ id, name, company, email, score, status, stage, value, owner, tags }` |
| `customers`         | Customers             | `{ id, name, contact, email, value, segment, health, status }` |
| `deals`             | Deals, Pipeline       | `{ id, name, company, value, stage, probability, owner }` |
| `tasks`             | Tasks                 | `{ id, title, priority, due, assignee, status, tags }` |
| `teamMembers`       | Team                  | `{ id, name, role, email, avatar, deals, revenue, target, performance, status }` |
| `invoices`          | Finance               | `{ id, client, amount, status, date, due }`   |
| `emailCampaigns`    | Email                 | `{ id, name, status, sent, openRate, clickRate, date }` |
| `automations`       | Automation            | `{ id, name, trigger, active, runs, color }`  |

### Static → Interactive Pattern
Har section yahi pattern follow karta hai:
```tsx
import { leads as initialLeads } from "@/lib/data";

// Static data ko stateful banao
const [leadList, setLeadList] = useState(initialLeads);

// Add karo
const addLead = () => {
  setLeadList(prev => [...prev, newLead]);
};
```

---

## 6. Modal System — `components/ui/modal.tsx`

Ek reusable modal component jo `@radix-ui/react-dialog` use karta hai. **Sab sections** isko use karte hain (Add Lead, New Invoice, Add Event, etc.):

```tsx
<Modal open={showModal} onClose={() => setShowModal(false)} title="Add Lead">
  {/* Form content */}
</Modal>
```

**Kaise kaam karta hai:**
1. `open={true}` → Radix Dialog portal render karta hai (body ke baad)
2. Framer Motion scale + fade animation se aata hai
3. Backdrop click ya X button → `onClose()` call → `showModal = false`
4. `wide?` prop se wider modal (jaise Pipeline ka deal form)

---

## 7. Styling System — `globals.css`

### CSS Variables (Theme)
```css
--color-crm-bg:      #080c14  ← Main background (dark navy)
--color-crm-surface: #0d1424  ← Card surface
--color-crm-card:    #0f1729  ← Inner cards
--color-crm-border:  #1e2d45  ← All borders
```

### Custom Utility Classes

| Class          | Kya Karta Hai                                              |
|----------------|------------------------------------------------------------|
| `.glass-card`  | Semi-transparent dark card with backdrop blur              |
| `.glass`       | Lighter glass effect (sidebar mein use)                    |
| `.gradient-bg` | Blue→Violet gradient (buttons, icons, avatars)             |
| `.badge`       | Small inline pill (status labels like "hot", "paid")       |
| `.sidebar-item`| Nav button with hover + active states                      |
| `.neon-blue`   | Blue glow shadow effect                                    |
| `.table-row`   | Hover highlight for table rows                             |
| `.glow-animate`| Pulsing glow animation (logo icon)                         |

---

## 8. Har Section — Kya Karta Hai

### Dashboard
- KPI cards with `AnimatedCounter` (0 se value tak count up)
- Revenue chart (Recharts `AreaChart`)
- Leads funnel (Recharts `PieChart`)
- Team performance bar chart
- Recent activity feed
- Top deals list

### Leads
- Lead cards with score badges (hot/warm/cold)
- Search + filter (by status)
- Lead score progress bar
- Add Lead modal
- Stats: Total leads, Hot leads, Pipeline value, Conversion rate

### Customers
- Customer health score (color coded: green/amber/red)
- Segment filter (Enterprise/SMB/Agency/Startup)
- Add Customer modal
- Next renewal dates

### Deals
- Table view with probability column
- Stage filter
- Add Deal modal
- Revenue sum per stage

### Pipeline (Sales Pipeline)
- Kanban board — 5 columns: Prospect → Qualified → Proposal → Negotiation → Closed
- Drag-and-drop style (visual only, click to add)
- Per-column "Add Deal" button (modal pre-fills stage + probability)
- Total pipeline value per column

### Tasks
- Priority badges (high/medium/low)
- Status: pending / in-progress / completed
- Checkbox to mark complete
- Add Task modal
- Filter by priority/status

### Calendar
- Full monthly grid view
- Month navigation (prev/next, year rollover)
- Event dots on days with events
- Right panel: event list for current month
- Add Event modal (title, day, time, type, color)

### WhatsApp CRM
- Contact list with last message preview
- Conversation view (chat bubbles)
- Broadcast tab
- Message templates

### Email Marketing
- Campaign table (sent, open rate, click rate)
- Progress bars for rates
- Quick Templates grid (6 templates)
- Template preview popup with "Use Template" → opens New Campaign modal
- New Campaign modal

### Team
- Stats cards (team size, online, avg performance, total revenue)
- Leaderboard (sorted by revenue)
- Member cards with performance progress bars
- Crown icon on top performer
- Hover reveals Phone/Mail action buttons
- Add Member modal

### Reports
- Period filter: 3M / 6M / 1Y (slices `salesChartData`)
- Revenue trend line chart
- Revenue by category donut chart
- Metrics grid (Conversion Rate, CAC, LTV, Win Rate)
- Team performance comparison bars

### Finance
- Invoice table (ID, client, amount, status, due date)
- Summary: Total Invoiced, Collected, Pending, Overdue
- MRR / ARR / Churn Rate cards
- New Invoice modal
- Export button (UI only)

### Automation
- Workflow cards with active/paused toggle
- Play (green) / Pause (red) buttons
- Run count + last triggered
- New Workflow modal (name, trigger, color)
- Active workflow count in stats

### AI Insights
- AI-generated insights cards
- Predictions with confidence %
- Suggested actions
- Model performance metrics

### Settings
- Expandable accordion sections (only one open at a time)
- **Account**: Profile (edit modal), Security (2FA), API Keys (show/copy)
- **Workspace**: Company info, Notification toggles (5 switches), Appearance (dark/light)
- **Integrations**: Connect/disconnect apps (Slack, Gmail, WhatsApp, Stripe)
- Edit Profile modal saves to `profile` state → updates header card live

---

## 9. Utils — `lib/utils.ts`

```ts
cn(...classes)         // Tailwind class merge (clsx + tailwind-merge)
formatCurrency(n)      // 45000 → "$45,000"  |  1200000 → "$1.2M"
```

---

## 10. Tech Stack Summary

| Technology        | Use                                      |
|-------------------|------------------------------------------|
| **Next.js**       | React framework, routing, build          |
| **React 19**      | UI library, useState/hooks               |
| **TypeScript**    | Type safety across all components        |
| **Tailwind CSS v4**| Utility-first styling                   |
| **Framer Motion** | Animations (page transitions, modals, counters) |
| **Recharts**      | Charts (area, bar, pie, line)            |
| **Radix UI**      | Accessible modal (Dialog)                |
| **Lucide React**  | All icons throughout the app             |

---

## 11. Data Flow Summary

```
lib/data.ts  ←→  section component (useState)
                        ↕
                   user action (click/form submit)
                        ↕
                   state update (setXxx)
                        ↕
                   React re-render → UI updates
```

**No backend, no API calls.** Sab data browser memory mein hai (refresh hone par reset hoga). Production mein `lib/data.ts` ki jagah API calls aayenge.
