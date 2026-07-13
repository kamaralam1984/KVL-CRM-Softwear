# KVL CRM → Enterprise AI Growth Platform — Architecture & Roadmap

**Rule:** Extend only. No UI redesign, no route changes, no removed features, full backward compatibility. Every new integration follows the existing **"real-API-when-key-present, else mock"** pattern so the app always runs.

---

## 1. Existing Project Analysis (what we reuse)

### Modules that already exist (REUSE, don't rebuild)
| Area | Files | Maps to Phase |
|------|-------|---------------|
| Lead sourcing | `lib/leadgen/sources/*` (googleMaps, apollo, hunter, webForm, scrape) + `sources/index.ts` registry | Phase 1 (partial) |
| AI scoring | `lib/leadgen/score.ts` | Phase 4 (partial) |
| AI outreach | `lib/leadgen/outreach/*` (message, channels, index) | Phase 5 (partial) |
| Pipeline orchestrator | `lib/leadgen/pipeline.ts` | Phase 1/4/5 glue |
| Automation engine | `lib/automation/{engine,store}.ts` | Phase 8/9 base |
| CRM data actions | `lib/actions/*` (leads, customers, deals, tasks, invoices, team, email, whatsapp, activity) | all |
| AI chat | `app/api/ai/chat/route.ts` (Claude streaming) | Phase 6 base |
| White-label + plans | `lib/superAdmin.ts`, `lib/appConfig.ts` | Phase 13 base |
| Auth + RBAC seed | `components/crm/Auth.tsx`, `appConfig` roles/permissions | Phase 15 base |
| Supabase clients | `lib/supabase/{client,server}.ts` | all |

### Reusable UI
- `components/ui/modal.tsx` (only shared primitive today)
- Section shell pattern in `components/crm/sections/*` + `sectionMap` router in `app/page.tsx`
- **Gap / tech-debt:** card, badge, stat-tile, KPI, table-row markup is duplicated inline across sections → extract into `components/ui/*` as we go (no behavior change).

### Naming / structure conventions to keep
- Server actions: `lib/actions/<domain>.ts` → `getX/createX/updateX`, Supabase + seed fallback.
- Integrations: `lib/<feature>/...`, each adapter `fetchX(query, limit) => Promise<T[]>`, real-or-mock.
- New section: add component in `components/crm/sections/`, register in `app/page.tsx` `sectionMap`, add sidebar entry + `SECTION_FEATURE_MAP` key. Never rename existing keys.

---

## 2. Target Architecture

```
lib/
  leadgen/            # Phase 1  — Lead Intelligence Engine (sources + enrichment)
    sources/          #           19 source adapters + registry
    enrich/           # NEW       decision-maker, tech-stack, revenue estimators
    import/           # NEW       csv, manual, api import
  analyzer/           # Phase 2  — Website Analyzer (SEO/speed/security/tech)
  opportunity/        # Phase 3  — Opportunity Engine (gap detection + recos)
  scoring/            # Phase 4  — enhanced scoring (confidence/probability/priority)
  outreach/           # Phase 5  — + LinkedIn, follow-up, proposal-intro (reuse existing)
  assistant/          # Phase 6  — sales assistant (pricing/timeline/AMC) + proposal
  documents/          # Phase 7  — proposal/quote/invoice/agreement/NDA/AMC → PDF/DOCX
  marketing/          # Phase 8  — FB/IG/LinkedIn/Google Ads + campaign analytics
  advisor/            # Phase 9  — daily business advisor (cron)
  voice/              # Phase 11 — OpenAI Realtime / ElevenLabs calling
  meetings/           # Phase 12 — recording/transcript/summary/tasks
  whitelabel/         # Phase 13 — multi-tenant, own SMTP/WhatsApp/domain
  marketplace/        # Phase 14 — installable modules registry
  security/           # Phase 15 — RBAC, 2FA, audit, rate-limit, JWT rotation
app/api/
  leadgen/run, analyzer/scan, opportunity/score, outreach/*, assistant/*,
  documents/generate, advisor/daily, voice/*, meetings/*  (new route handlers)
components/crm/sections/  # new sections only where a new page is needed; else extend
components/ui/            # extracted reusable primitives (Card, Badge, StatTile, Table…)
```

---

## 3. Phase-by-Phase Roadmap (16 phases, 5-agent waves)

Legend: 🟢 exists (enhance) · 🟡 partial · 🔴 new · 🔑 needs external account/key

| Phase | Feature | Status | Key new files | External |
|-------|---------|--------|---------------|----------|
| 1 | Lead Intelligence Engine | 🟡 | `sources/*` (+14), `enrich/*`, `import/*`, expand `RawLead` | 🔑 per-source |
| 2 | Website Analyzer | 🔴 | `lib/analyzer/*`, `api/analyzer/scan` | 🔑 PageSpeed API |
| 3 | Opportunity Engine | 🔴 | `lib/opportunity/*` | uses Phase 2 output |
| 4 | AI Lead Scoring | 🟡 | `lib/scoring/*` (confidence, closeProb, priority) | 🔑 Claude |
| 5 | AI Outreach | 🟡 | extend `outreach/` (+linkedin, follow-up, proposal-intro) | 🔑 Claude/Twilio |
| 6 | AI Sales Assistant | 🟡 | `lib/assistant/*`, extend `api/ai/chat` | 🔑 Claude |
| 7 | Proposal Generator | 🔴 | `lib/documents/*`, `api/documents/generate` | pdf/docx libs |
| 8 | Marketing Automation | 🟡 | `lib/marketing/*`, extend `Marketing.tsx` | 🔑 Meta/Google Ads |
| 9 | AI Business Advisor | 🔴 | `lib/advisor/*`, `api/advisor/daily` (cron) | 🔑 Claude |
| 10 | Executive Dashboard | 🟢 | extend `Dashboard.tsx` (forecast, cashflow, today) | — |
| 11 | Voice AI | 🔴 | `lib/voice/*`, `api/voice/*` | 🔑 OpenAI Realtime/ElevenLabs |
| 12 | Meeting Intelligence | 🔴 | `lib/meetings/*`, `api/meetings/*` | 🔑 Whisper/transcribe |
| 13 | White Label | 🟡 | `lib/whitelabel/*` (multi-tenant, SMTP, domain) | 🔑 per-tenant |
| 14 | Marketplace | 🔴 | `lib/marketplace/*` module registry | — |
| 15 | Enterprise Security | 🟡 | `lib/security/*` (RBAC, 2FA, audit, rate-limit) | 🔑 Supabase Auth |
| 16 | Enterprise Architecture | ongoing | `components/ui/*` extraction, no-dup, TS strictness | — |

### Delivery model — 5 agents per wave
Each wave = one phase (or tightly-related group). Work is split so **agents never edit the same file** (each owns new files; one agent owns shared registry/wiring). After each wave: `tsc --noEmit` + dev-server compile check + commit. Then next wave. This keeps "nothing missing" without breaking anything.

**Wave order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → (8,10) → 9 → 13 → 15 → 14 → 11 → 12 → 16 polish.
(External-account phases — 11, 12, some of 8 — ship code + graceful mock; go live when keys added.)

---

## 4. Cross-cutting standards (every phase)
- Full TypeScript, no `any` leaks, exported types.
- Real-or-mock: never crash when a key is missing (`try/catch` → mock/heuristic).
- Server Actions for mutations; route handlers for cron/webhooks.
- Dark+light theme via existing token classes; responsive; a11y labels.
- Error handling + `console` logging with `[feature]` prefix (matches existing).
- No hardcoded secrets; all via `.env.local`.
- Backward compatible: additive DB columns/tables, additive sidebar entries, additive registry rows.

---

## 5. External accounts checklist (for full "real" mode)
PageSpeed/Google APIs · Apollo · Hunter · Crunchbase · Clutch/GoodFirms (scrape API e.g. Serper) · IndiaMART/TradeIndia · MCA · Meta Graph · Google Ads · OpenAI Realtime · ElevenLabs · Twilio · Resend/SMTP. Each is optional; code degrades gracefully to mock without it.
