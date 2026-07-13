# KVL CRM — Yeh Website Kaise Kaam Karti Hai (Poora Guide)

Yeh ek **AI-powered CRM (Customer Relationship Management)** software hai jo:
- Naye **clients/leads khud dhoondhta hai** (Google Maps, Apollo, Hunter, web-form, directories se)
- AI se unhe **score** karta hai (kaunsa lead sabse achha)
- Automatic **outreach** karta hai (Email / WhatsApp / SMS / Call task)
- Sab kuch ek **dashboard** me manage karta hai (deals, tasks, invoices, team, etc.)

Tech: **Next.js 16 + React 19 + TypeScript + Tailwind + Supabase (database) + Claude AI**

---

## PART 1 — Website START Kaise Kare

### Step 1: Terminal kholo aur app folder me jao
```bash
cd /home/yusuf/Documents/CRM/crm-app
```

### Step 2: Dependencies install karo (sirf pehli baar)
```bash
npm install
```

### Step 3: Environment file set karo (`.env.local`)
`crm-app/.env.local` file me yeh keys honi chahiye:
```bash
# Database (Supabase) — leads/deals/tasks save karne ke liye
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI (Claude) — scoring + message writing ke liye
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Lead sourcing (jitne chahiye utne)
GOOGLE_MAPS_API_KEY=...        # local business leads
APOLLO_API_KEY=...             # B2B decision-makers
HUNTER_API_KEY=...             # email finder
SERPER_API_KEY=...             # directory scraping

# Outreach (message bhejne ke liye)
RESEND_API_KEY=...             # email
OUTREACH_FROM_EMAIL=you@domain.com
TWILIO_ACCOUNT_SID=...         # whatsapp + sms
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_SMS_FROM=+1...

# Automation ka daily cron protect karne ke liye
LEADGEN_CRON_SECRET=<koi-random-string>
```
> **Note:** Agar keys nahi hain to bhi app chalti hai — **demo mode** me (mock data + seed data se). Keys daalte hi sab kuch real ho jata hai.

### Step 4: Server chalu karo
```bash
npm run dev -- -p 3008
```
Ab browser me kholo: **http://localhost:3008**

---

## PART 2 — LOGIN Kaise Kare

Website khulte hi **login page** aata hai (KVL CRM logo ke saath).

| Role | Email | Password |
|------|-------|----------|
| 👑 Super Admin | kamaralam137@gmail.com | Khushi@143 |
| 🛠️ Admin | animesh@freedomwithai.com | demo123 |
| 👤 Viewer | demo@crm.com | demo |

- **Supabase configured hai** → real login (email confirm ke saath)
- **Configured nahi hai** → demo login (upar wale accounts se)

Login ke baad **Dashboard** khulta hai, aur left side me poora menu (Sidebar) dikhta hai.

---

## PART 3 — CLIENT/LEAD Kaise Aata Hai (Sabse Important)

Yeh system har din **automatic 10 naye clients** laa sakta hai. Poora flow:

```
   SOURCE          →   DEDUPE      →   AI SCORE    →   SAVE      →   OUTREACH
(kahan se laaye)     (duplicate      (kaunsa best)   (CRM me)    (contact karo)
                      hatao)
```

### Step 1 — SOURCE (leads kahan se aate hain)
5 tarah ke sources hain (`lib/leadgen/sources/`):
| Source | Kya laata hai |
|--------|---------------|
| 🗺️ Google Maps | Location ke local business (dentist, gym, etc.) |
| 🎯 Apollo | B2B companies + decision-maker email |
| 📬 Hunter | Company domain se emails |
| 📥 Web-form | Aapke landing page se aaye inbound leads (sabse best) |
| 🔍 Scrape | Justdial / IndiaMART directory listings |

### Step 2 — DEDUPE (duplicate hatao)
Jo lead pehle se CRM me hai ya batch me repeat hai, wo hata diya jata hai (email/phone se check).

### Step 3 — AI SCORE (Claude AI)
Har lead ko AI **0–100 score** deta hai (kitna fit hai aapke "ideal customer" ke liye), deal value estimate karta hai, aur tags lagata hai. Top 10 chun liye jaate hain.

### Step 4 — SAVE (CRM me daalo)
Chune hue leads **Supabase database** ke `leads` table me save ho jaate hain → **Leads page** pe dikhne lagte hain.

### Step 5 — OUTREACH (khud contact karo)
Har naye lead ke liye AI **personalized message** likhta hai aur bhejta hai:
| Channel | Kaise |
|---------|-------|
| 📧 Email | Resend se |
| 💬 WhatsApp | Twilio se |
| 📱 SMS | Twilio se |
| 📞 Call | Team ko ek "call task" ban jata hai (legal-safe) |

### Yeh sab chalu kaise hota hai? (3 tarike)
1. **Dashboard button:** Dashboard pe top-right **"✨ Generate Leads Now"** button → turant leads laata hai
2. **API se:** `POST http://localhost:3008/api/leadgen/run`
3. **Automatic (roz):** Cron har din subah ~9 baje khud chalata hai
   - Vercel pe → `vercel.json`
   - GitHub pe → `.github/workflows/leadgen-daily.yml`
   - Apne server pe → `scripts/run-leadgen.mjs` (crontab me)

---

## PART 4 — LEAD Se CLIENT Tak Ka Safar

```
NEW LEAD  →  CONTACTED  →  REPLIED  →  QUALIFIED  →  DEAL  →  CUSTOMER (client)
```

1. **Lead aaya** (upar wale process se) → Leads page pe "cold/warm/hot" status
2. **Outreach hua** → email/WhatsApp gaya, ya call task bana
3. **Automation chala** → jab lead banta hai, "Lead Nurture" workflow apne-aap:
   - Owner assign karta hai
   - Follow-up **task** banata hai
   - **Activity feed** me entry daalta hai
   - (Automation page → "Executions" tab me live dikhta hai)
4. **Deal banaya** → Deals / Pipeline page pe stage aage badhta hai (Discovery → Qualified → Proposal → Negotiation → Closed Won)
5. **Client ban gaya** → Customers page pe aa jata hai, aur **Invoice** Finance page pe banti hai

---

## PART 5 — Har PAGE Kya Karta Hai

**MAIN**
- **Dashboard** — sab ka overview: revenue, active leads, win rate, live activity + "Generate Leads" button
- **Leads** — saare leads, search/filter, naya lead add (jo automation trigger karta hai)
- **Customers** — jo clients ban chuke hain
- **Deals** — chal rahe sauda (value, stage, probability)
- **Tasks** — kaam ki list (follow-up calls, etc.)
- **Calendar** — meetings/events

**SALES**
- **Sales Pipeline** — deals ka stage-wise kanban view
- **WhatsApp CRM** — WhatsApp conversations
- **Email Marketing** — email campaigns + templates

**INSIGHTS**
- **Team** — team members ki performance
- **Reports** — revenue charts, team performance (real deals se)
- **Finance** — invoices, MRR/ARR, paid/pending/overdue
- **Automation** — workflows (Lead Nurture, Deal Won, Churn Alert) + live Executions log
- **Smart Insights (AI)** — AI se recommendations
- **SEO / Social** — marketing tools

**SYSTEM**
- **KVl Chat / Mail / Helpdesk / Commerce / Pages** — extra modules
- **Settings** — configuration

**ADMIN**
- **Admin Panel** — users, roles, permissions manage karo
- **Super Admin** — plans, features, white-label, pricing control (sirf super admin)

---

## PART 6 — Data Kahan Store Hota Hai

- **Supabase** (PostgreSQL database) — leads, customers, deals, tasks, invoices, team, email campaigns, whatsapp, activity feed
- Backend logic: `lib/actions/*.ts` (har cheez ka get/create/update)
- **Rule:** Supabase connected hai → real data; nahi hai → seed/demo data (taaki UI kabhi khali na dikhe)

---

## PART 7 — Live/Production Pe Kaise Le Jaaye

1. **Supabase** project banao → `lib/supabase/schema.sql` ka SQL chalao (tables ban jayengi)
2. `.env.local` me **real keys** daalo (upar Part 1 me di gayi)
3. **Deploy** karo:
   - Vercel pe push karo (recommended — cron bhi chal jayega)
   - Ya apne server pe: `npm run build` phir `npm run start`
4. Anthropic account me **credits** honi chahiye (warna AI heuristic fallback pe chalega)

---

## Ek Line Me Poora System
> **Leads khud aate hain (5 sources) → AI unhe score karta hai → best 10 CRM me save → automatic email/WhatsApp/call outreach → follow-up task banta hai → lead se deal se client → invoice → sab dashboard pe track.**

Sab kuch ek jagah, mostly automatic. 🚀
