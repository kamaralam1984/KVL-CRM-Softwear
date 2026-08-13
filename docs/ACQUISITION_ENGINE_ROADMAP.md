# KVL Lead Intelligence & Acquisition Engine — Phase 17 Roadmap

**Rule:** Same as `docs/GROWTH_PLATFORM_ROADMAP.md` — extend only, no UI redesign, no
route changes, no removed features, full backward compatibility, real-API-when-key-present
else mock/degrade gracefully.

**Non-negotiable privacy rule (spec-mandated):** never secretly retrieve or infer a
visitor's name, phone, email, or social identity from an ad click or anonymous browsing
alone. A visitor stays anonymous — visible only as a `visitor_id`, source/campaign
attribution, pages viewed, and an intent score — until they voluntarily identify
themselves (form submit, WhatsApp click-through, signup, demo/quote request, or another
legitimate first-party action). No invasive device fingerprinting. No selling visitor data.

---

## 1. What already existed (reused, not rebuilt)

| Area | Files | Reused for |
|------|-------|------------|
| Server action CRUD pattern (`getX/createX/updateX`, Supabase + graceful fallback) | `lib/actions/*.ts` | `lib/actions/visitors.ts` |
| Service-role Supabase client | `lib/supabase/server.ts` | all `lib/tracking/store.ts` writes |
| Rate limiter (in-memory fixed window) | `lib/security/rateLimit.ts` | `/api/analytics/*` |
| Route handler conventions (`{ok, ...}` responses, try/catch, `dynamic="force-dynamic"`) | `app/api/scoring/score/route.ts` and others | `/api/analytics/*` |
| Section shell + `sectionMap` + Sidebar wiring | `app/page.tsx`, `components/crm/Sidebar.tsx` | `AcquisitionOverview` |
| `components/ui` primitives (Card, StatTile, Badge, SectionHeader, EmptyState, DataTable) | `components/ui/*` | `AcquisitionOverview` |
| Lead scoring engine (factor-weighted, AI-augmented) | `lib/scoring/{index,factors,ai}.ts` | to be **extended** in Wave 4, not duplicated |
| Automation trigger pattern (`triggerLeadCreated`, imperative, no generic rule engine) | `lib/automation/engine.ts` | to be **extended** in Wave 5 |
| Lead ingestion pipeline (source → dedupe → score → save) | `lib/leadgen/pipeline.ts` | integration point for Wave 3 identity resolution |

**Confirmed absent before Phase 17:** no visitor/session/event/attribution tables, no
tracking SDK, no click-id capture anywhere in the codebase.

---

## 2. Target `lib/tracking` tree

```
lib/tracking/
  types.ts          # Visitor, VisitorSession, VisitorEvent, AttributionParams
  ids.ts            # generateVisitorId() / generateSessionId()  (KV-V-xxxx / KV-S-xxxx)
  attribution.ts     # parseAttribution() — UTM + click-id + referrer inference
  store.ts           # server-only Supabase read/write helpers (used by API routes)
  sdk/
    client.ts         # kvlAnalytics — init/page/track/identify/setConsent
    AnalyticsTracker.tsx  # client component mounted on public pages
  # Wave 2+:
  # lib/attribution/   — campaigns, multi-touch models (first/last/linear/position/time-decay)
  # lib/identity/       — Wave 3 identity resolution (merge visitor → lead)
```

`app/api/analytics/{collect,session,identify,consent}/route.ts` — the only public,
unauthenticated write surface into this system; protected by rate limiting + strict
payload validation instead of the cron-secret bearer auth used elsewhere.

**Note on `landing_pages` (Wave 2):** intentionally traffic-only (`url_path`, `hits`,
first/last seen). Bounce rate, form completion rate, and revenue-per-page need a
lead/deal join that doesn't exist until Wave 3+ — those columns are additive later,
not retrofitted now.

---

## 3. Wave-by-wave plan

Legend: 🟢 done · 🔴 not started

| Wave | Scope | Key new files | Status |
|------|-------|----------------|--------|
| **17.1** | **Foundation** — `visitors`/`visitor_sessions`/`visitor_events`/`tracking_consents` tables, tracking SDK, `/api/analytics/*` collection routes, minimal "Visitor Intelligence" CRM screen | `lib/tracking/*`, `app/api/analytics/*`, `lib/actions/visitors.ts`, `components/crm/sections/AcquisitionOverview.tsx` | 🟢 |
| **17.2** | **Attribution engine + campaigns** — `campaigns` (auto-created on first named `utm_campaign` sighting, manually editable spend/budget/status), `campaign_touchpoints` (durable per-visitor ledger), `landing_pages` (traffic rollup); 5 selectable attribution models (first/last/linear/position-based/time-decay); Campaigns tab added to the Visitor Intelligence screen | `lib/attribution/*`, `lib/actions/campaigns.ts` | 🟢 |
| **17.3** | **Identity resolution** — `visitor_identity_links`, merge anonymous history into a Lead on `identify()` (dedupe by verified phone then email, idempotent re-identify), auto-create only when email/phone is present; `leads` gained `source`/`campaign`/`visitor_id` columns; fixed a real gap where `/contact` never called `kvlAnalytics.identify()`; Source badge added to the Leads screen | `lib/identity/*` | 🟢 |
| **17.4** | **Lead intent scoring** — new standalone `lib/intent/*` engine (kept separate from `lib/scoring/*`, which serves a different purpose — cold/scraped lead evaluation); live event-driven 0–100 score with DB-configurable rules (`intent_scoring_rules`, seeded to spec §9's exact point values); score mirrors onto a linked Lead's `score`/`status`; fixed two real gaps — `/pricing` never fired `pricing_view`, the landing page's demo modal never fired `demo_click`/`identify()` | `lib/intent/*` | 🟢 |
| **17.5** | **Automation + AI integration** — `triggerHighIntentVisitor` + `triggerLeadScoreSpike` in `lib/automation/engine.ts` (reuses existing `triggerLeadCreated` for the "new lead from identify()" case rather than duplicating it); fixed `app/api/ai/chat/route.ts`'s system prompt, which was **entirely hardcoded fake CRM data** — replaced with `lib/ai/context.ts`'s `buildCrmSnapshot()`, a real query across leads/deals/customers/team/visitors/campaigns | `lib/ai/context.ts`, edits to `lib/automation/engine.ts`, `lib/intent/score.ts`, `lib/identity/resolve.ts`, `app/api/ai/chat/route.ts` | 🟢 |
| **17.6a** | **Acquisition dashboard core** — Overview tab (stat tiles + a real Visitor→Engaged→High Intent→Lead→Qualified→Closed funnel, computed from live `visitors`/`leads` data) and Live Activity tab (visitors active in the last 5 min, 15s client poll — no websocket/Realtime infra exists in this codebase, so polling is the honest equivalent); `AcquisitionOverview.tsx` refactored into a tab-shell over `components/crm/sections/acquisition/*` | `components/crm/sections/acquisition/{OverviewTab,VisitorsTab,CampaignsTab,LiveActivityTab}.tsx` | 🟢 |
| **17.6b** | **Attribution + Landing Pages + Lead Journey** — Campaigns tab gained a 5-model attribution selector (`computeCampaignRoiMultiTouch`, finally wiring `lib/attribution/models.ts`); new Pages tab computes bounce rate/avg session duration/leads-generated per landing page from real `visitor_sessions` (the Wave 2 `landing_pages` table stays as a lighter traffic-only rollup, not replaced); Visitors tab gained a per-visitor "Journey" drill-down modal merging touchpoints + events + identity resolution, fetched on-demand | `lib/actions/{touchpoints,sessions,journey}.ts`, `components/crm/sections/acquisition/{LandingPagesTab,JourneyModal}.tsx` | 🟢 |
| **17.7** | **Campaign ROI + Admin controls** — `lib/attribution/roi.ts` (revenue = `leads.value` where `stage="Closed"`, matched by source/name — **first-touch attribution**, labeled as such; no `deals`/`customers` → lead FK exists in this schema, so this stops at Lead revenue, not Deal/Customer — see 17.6a's funnel note); new `acquisition_settings` table + public `GET /api/analytics/config` the SDK actually checks on `init()` — `tracking_enabled` is genuinely enforced, `default_consent_mode`/`retention_days` are stored/editable but not yet wired to new enforcement; new "Acquisition Engine" tab in Admin Panel (tracking toggle + Wave 4's intent scoring rules get a real edit UI); Campaigns tab gained Revenue/ROAS columns; Reports gained a Campaign ROI CSV export | `lib/attribution/roi.ts`, `lib/actions/{acquisitionSettings,intentRules}.ts`, `app/api/analytics/config/route.ts` | 🟢 |
| **17.8** | **Security hardening + tests** — Vitest added (project had zero test infra before this); unit tests for every pure function built across Waves 1–7 (attribution parsing, all 5 attribution models, ROI math, intent-score banding, `resolve.ts` helpers) plus a **mocked** `resolveIdentity()` test covering spec's explicit "Anonymous → Identified Lead" critical case (new lead, idempotent re-identify, cross-visitor email dedup, phone-before-email priority, name-only no-op); `lib/security/audit.ts` — a Phase 15 module that had never been called from anywhere in the app — now wired to tracking-config changes in Admin Panel; documented (not silently patched) a codebase-wide gap: `lib/security/rbac.ts` is never enforced server-side by any of the ~20+ action files, this app's or pre-existing | `vitest.config.ts`, `**/*.test.ts` | 🟢 |

**Phase 17 complete.** All 8 waves shipped. See §4/§4b above and this row for the full list of documented, deliberate gaps (decay-free intent scoring, browser-only automation run feed, first-touch-only campaign ROI, no server-side RBAC) — each was a scoped, stated trade-off, not an oversight.

---

## 4. Cross-cutting standards (adds to the existing list)

- Never fingerprint; never collect PII before a voluntary `identify()` call.
- Every collection endpoint fails soft — a tracking failure must never break the visitor's
  page or surface a 500 to a real browser.
- First-touch attribution is set once and never overwritten; last-touch always refreshes.
- High-volume tables (`visitor_events`) get indexes from day one, not retrofitted later.
- `console` logging prefixed `[tracking]` / `[analytics]` / `[attribution]` / `[identity]` /
  `[intent]`, matching the existing `[feature]` convention.

**Known scope cut (Wave 4):** intent scoring is positive/event-driven only — no
inactivity or bounce decay. That needs time-based background recomputation, and this
codebase has no scheduled-job mechanism beyond the unrelated `leadgen-daily.yml` GitHub
Action. Revisit once a scheduling primitive exists.

**Known scope cut (Wave 5):** `lib/automation/engine.ts`'s run history + per-workflow
on/off toggle (`lib/automation/store.ts`) are `localStorage`-only (browser-scoped).
Acquisition Engine triggers fire from server-side API routes hit by anonymous visitors —
they create real Tasks/Activities (genuine Supabase writes) but never appear in the
Automation page's run feed and always run regardless of a toggle set in some salesperson's
browser. A DB-backed run log would fix this properly; deferred until it's worth the schema
+ UI work.

## 4b. Pre-existing issue found in Wave 3, fixed in the post-Wave-8 gap check

`lib/data.ts`'s seed leads used `lastContact` (camelCase) while the real `leads` table
column is `last_contact` (snake_case, `lib/supabase/schema.sql`) — predates Phase 17.
Originally flagged as "out of scope, touches unrelated code" in Wave 3. A follow-up gap
audit found this was more serious than first scoped: it silently broke **Wave 3's own
flagship feature** — `resolveIdentity()`'s new-lead-creation path called the same buggy
`createLead()`, so against a real Supabase instance the "Anonymous → Identified Lead"
flow (spec's explicit critical test case) would create the `visitor_identity_links` row
but the `leads` insert itself would throw and get swallowed by the outer fail-soft
try/catch — net effect, no lead ever actually appeared. The same bug also affected the
pre-existing `lib/leadgen` pipeline's `saveLeads()`. **Fixed**: renamed `lastContact` →
`last_contact` consistently across `lib/data.ts`, `lib/identity/resolve.ts`,
`lib/executive/index.ts`, `lib/leadgen/{types,score}.ts`, and `components/crm/sections/Leads.tsx`.
No schema change needed — the DB column was already correct.

**Related, not fixed:** `lib/leadgen`'s `ScoredLead.source` (a `LeadSource` enum like
`"google_maps"`/`"web_form"`) and Phase 17's `leads.source` (an attribution channel like
`"google"`/`"facebook"`) are two different concepts sharing one `leads.source` column.
Whichever system touches a lead last wins. Both are pre-existing/adjacent designs: the
leadgen pipeline predates Phase 17, and `leads.source` was already the natural column
name before either concept collided. Untangling this would mean renaming one of the two
(a real migration), not a Wave 8 gap-check fix — flagged for a future pass.

## 4c. Post-Wave-8 gap check — additional findings and fixes

An independent audit pass after Wave 8 (not trusting this doc's own 🟢 claims — re-verifying
against actual code) found three more real gaps, all now fixed:

- **Race conditions on first-ever writes.** `upsertVisitor`/`recordSessionStart`
  (`lib/tracking/store.ts`), `resolveCampaign` (`lib/attribution/campaigns.ts`), and
  `recordLandingPageHit` (`lib/attribution/landingPages.ts`) used a select-then-insert
  pattern against columns with unique constraints (`visitors.visitor_id`,
  `campaigns.campaign_key`, `landing_pages.url_path`). Two concurrent first-ever writes for
  the same brand-new visitor/campaign/page could both see "not found," and the losing
  insert would throw a unique-violation that the fail-soft `try/catch` silently swallowed —
  losing that request's data entirely. **Fixed** by switching row-creation to atomic
  `.upsert(..., {onConflict, ignoreDuplicates})`, which turns a losing race into a silent
  no-op instead of a thrown/lost write. **Not fixed** (documented, smaller residual risk):
  the *increment* itself (`page_views + 1`, `session_count + 1`, `hits + 1`) is still a
  read-modify-write, not a single atomic SQL statement — under true concurrency it can
  rarely under-count by one. A real fix needs a Postgres RPC function for atomic
  increments; a larger, separate change.
- **Audit log was write-only.** Wave 8 wired `logAudit()` (`lib/security/audit.ts`) to
  tracking-config changes, but nothing ever read `getAuditLog()` back — no viewer existed.
  **Fixed**: a "Recent Changes" card in the Admin Panel's Acquisition Engine tab now shows
  the last 10 acquisition-related audit entries.
- **No consent-capture UI existed anywhere.** `kvlAnalytics.setConsent()` and
  `POST /api/analytics/consent` (both Wave 1) had zero real callers — spec §25's
  "Cookie/Tracking Consent" UI was never built, so `visitors.consent_status` could never
  actually become `granted`/`denied` from a real visitor. **Fixed**: a minimal first-party
  `ConsentBanner` (`lib/tracking/sdk/ConsentBanner.tsx`), mounted alongside
  `AnalyticsTracker` on every marketing entry point. Accept/Decline calls the existing
  `setConsent()`; declining stops all future tracking but does not retroactively purge
  anything already sent (nothing personally identifying was ever in it, by design).

## 5. External accounts checklist (later waves)

Meta Graph API / Google Ads API (ad spend + campaign metadata for Wave 7 ROI), a
telephony provider for call attribution (§18 of the spec — no consent/compliance work
started). All optional — the engine runs on first-party data alone until these are added.

**Added in Wave 9:**
- **Telephony provider** (Exotel/Knowlarity/MyOperator-style) — required for
  `POST /api/telephony/missed-call` to receive real calls. The route itself is fully
  built and testable via a synthetic `curl` today; it stays 501 ("not configured")
  until `MISSED_CALL_WEBHOOK_SECRET` is set.
- **Truecaller for Business Partner Key** — required for the One-Tap Verify button
  to render at all (`NEXT_PUBLIC_TRUECALLER_PARTNER_KEY`) and for the callback to
  verify anything (`TRUECALLER_PARTNER_KEY` / `TRUECALLER_PARTNER_SECRET`, server-only).
  `lib/integrations/truecaller.ts` isolates the one seam whose exact endpoint/payload
  shape needs re-verification against Truecaller's current docs once real credentials
  exist — nothing else in the codebase depends on those details.
- **VAPID keys (Web Push)** — the one item here that needs **zero** external account.
  Generate once with `npx web-push generate-vapid-keys` and set
  `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
  Without them, `PushOptIn` simply never renders — no broken UI.

---

## 6. Wave 9 — Growth & Re-engagement Channels

Built in response to a request to "reach" ad-clickers who never fill a form. Full
identity capture from a bare ad click was refused (violates this doc's own §0 privacy
rule, most ad platforms' ToS, and India's DPDP Act / global privacy law). Instead, four
**voluntary, low-friction** identification/re-engagement channels were built, all reusing
the existing `resolveIdentity()` pipeline rather than inventing parallel lead-creation paths:

| Channel | Voluntary action | Status |
|---|---|---|
| Interactive Quiz (`/quiz`, `components/marketing/Quiz.tsx`) | Visitor answers questions for their own benefit, gives phone to receive the result | 🟢 fully self-contained, no external account |
| Web Push (`components/marketing/PushOptIn.tsx`, `public/sw.js`) | Visitor taps the browser's own permission prompt — **no name/email/phone ever collected** | 🟢 fully self-contained (needs only self-generated VAPID keys) |
| Missed-Call (`components/marketing/MissedCallBanner.tsx`, `/api/telephony/missed-call`) | Visitor voluntarily dials a number — caller ID sharing during a call is inherent, not covert | 🟡 code complete, needs a telephony provider account to receive real calls |
| Truecaller One-Tap (`components/marketing/TruecallerButton.tsx`, `lib/integrations/truecaller.ts`) | Visitor taps Truecaller's own in-app consent screen | 🟡 code complete, needs a Truecaller for Business Partner Key; one adapter function flagged for endpoint re-verification |

`intent_scoring_rules` gained `event:quiz_completed` and `event:push_subscribed` —
no code change needed for scoring, since `applyEventPoints()` (`lib/intent/score.ts`)
already looks up `event:<name>` generically for any tracked event name.
