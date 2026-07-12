# Auto Lead-Generation System — Roadmap & Setup

Roz automatic **10 naye leads** dhoondh kar CRM me daalne wala system.
Pipeline: **Source → Dedupe → AI Score → Save → Outreach**

---

## ✅ Phase 1 — DONE (abhi bana, chal raha hai)

Files:
- `lib/leadgen/types.ts` — shared types
- `lib/leadgen/sources/googleMaps.ts` — Google Places source (+ mock fallback)
- `lib/leadgen/score.ts` — Claude AI se scoring + deal-value estimate
- `lib/leadgen/pipeline.ts` — poora orchestrator (dedupe against DB bhi)
- `app/api/leadgen/run/route.ts` — trigger endpoint (cron-ready, secret-protected)

Test: `POST http://localhost:3008/api/leadgen/run`
Body: `{"queries":["dentists in Delhi"],"dailyTarget":10}`

Abhi **mock data** se chal raha hai (asli API key nahi hai). Sab kaam karta hai
sirf save Supabase live hone par hoga.

---

## 🔑 Chalu karne ke liye env vars (`.env.local`)

```bash
# Zaroori — save ke liye (abhi missing → save fail ho raha hai)
NEXT_PUBLIC_SUPABASE_URL=...        # asli Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=...

# AI scoring (already set hai)
ANTHROPIC_API_KEY=...

# Asli leads (warna mock chalta hai) — https://console.cloud.google.com → Places API
GOOGLE_MAPS_API_KEY=...

# Cron endpoint protect karne ke liye
LEADGEN_CRON_SECRET=<koi-lamba-random-string>
```

> **Sabse pehla step:** Supabase project asli connect karo taaki `saved: 0`
> `saved: 10` ban jaye. (Memory: "needs env vars, Supabase + AI setup")

---

## ✅ Phase 2 — Daily automation (cron) — DONE

Roz subah ~9:00 IST (3:30 UTC) apne-aap chalta hai. **3 options** (jo bhi use karo):

| Option | File | Kaise chalu karo |
|--------|------|------------------|
| **Vercel Cron** | `vercel.json` | Vercel pe deploy karo. Dashboard → env me `CRON_SECRET` set karo. Bas. |
| **GitHub Action** | `.github/workflows/leadgen-daily.yml` | Repo Settings → Secrets me `LEADGEN_URL` + `LEADGEN_CRON_SECRET` daalo. |
| **Server crontab** | `scripts/run-leadgen.mjs` | `crontab -e` me: `30 3 * * * LEADGEN_URL=... LEADGEN_CRON_SECRET=... node /path/crm-app/scripts/run-leadgen.mjs` |

- Route ab `LEADGEN_CRON_SECRET` **ya** Vercel ka `CRON_SECRET` dono accept karta hai.
- `maxDuration = 60s` set hai (AI scoring ke liye time).
- **Tested:** `node scripts/run-leadgen.mjs` → OK, sourced 60 → dedupe 30 → saved 0 (Supabase live hote hi saved chalu).
- Schedule badalni ho: cron string `30 3 * * *` change karo (UTC me hota hai; 3:30 UTC = 9:00 IST).

## ✅ Phase 3 — Auto Outreach — DONE

Har naye lead ke liye AI personalized message likhta hai, phir enabled channels pe
bhejta hai. Pipeline me `outreach` config set ho to save ke turant baad chalta hai.

Files (`lib/leadgen/outreach/`):
- `message.ts` — AI (Claude) har lead ke liye email/whatsapp/sms/call copy likhe (template fallback)
- `channels.ts` — 4 senders, har ek real provider + mock fallback, aur CRM table me record kare
- `index.ts` — orchestrator (har lead × har channel)

| Channel | Provider | Env chahiye | CRM record |
|---------|----------|-------------|------------|
| Email | Resend | `RESEND_API_KEY`, `OUTREACH_FROM_EMAIL` | `email_campaigns` |
| WhatsApp | Twilio | `TWILIO_ACCOUNT_SID/AUTH_TOKEN/WHATSAPP_FROM` | `whatsapp_conversations` |
| SMS | Twilio | `TWILIO_ACCOUNT_SID/AUTH_TOKEN/SMS_FROM` | — |
| Call | (team task) | koi nahi — insaan call kare | `tasks` |

Sender profile env: `OUTREACH_SENDER_NAME`, `OUTREACH_SENDER_COMPANY`, `OUTREACH_OFFER`, `OUTREACH_CALENDAR_LINK`.

**Tested:** 3 leads × [email, whatsapp, call] → 9 actions, sab sahi (email/wa mock-sent, call task banaya). Personalized messages logs me dikhe. Keys na ho to mock-log; live hote hi asli send.

Status track: New → Contacted → Replied → Client (aage badha sakte ho)

## ✅ Phase 4 — Aur sources — DONE

Ab **5 sources** hain, sab ek saath chal sakte hain (registry: `sources/index.ts`).

| Source | File | Env chahiye | Warna |
|--------|------|-------------|-------|
| Google Maps | `sources/googleMaps.ts` | `GOOGLE_MAPS_API_KEY` | mock |
| Apollo (B2B) | `sources/apollo.ts` | `APOLLO_API_KEY` | mock |
| Hunter (email finder) | `sources/hunter.ts` | `HUNTER_API_KEY` | mock |
| Web-form (inbound) | `sources/webForm.ts` | Supabase `web_form_submissions` table | mock |
| Scrape (directories) | `sources/scrape.ts` | `SERPER_API_KEY` (compliant) | mock |

**Pipeline config ab do tarah se:**
```jsonc
// naya (multi-source):
{ "sources": [
    { "source": "web_form", "queries": [] },
    { "source": "google_maps", "queries": ["dentists in Delhi"] },
    { "source": "apollo", "queries": ["saas founder"] }
] }
// purana (Google Maps only) abhi bhi chalta hai:
{ "queries": ["gyms in Mumbai"] }
```

Route DEFAULTS ab web_form + google_maps + apollo mix use karta hai.
Naya source jodna = ek file + `SOURCES` map me ek line.

**Tested:** 4 sources ek saath → sourced 36 (web_form 3 + apollo 20 + hunter 5 + scrape 8), dedupe + score + outreach sahi. tsc clean.

> ⚡ Note: email outreach me AI har lead ka message likhta hai (sequential),
> isliye 10 leads × email thoda slow (~30s+). Zaroorat ho to parallel kar sakte ho.

---

## ⚠️ Legal note (India)
Cold email/WhatsApp/SMS pe TRAI/DND + spam rules lagte hain. Hamesha:
opt-out link do, consent-based bhejo, aur cold **calling** insaan/team se karao —
system sirf leads laaye aur task banaye.
