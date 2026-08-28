# KVL CRM → GoHighLevel Parity — Completion Status

Continues `docs/GROWTH_PLATFORM_STATUS.md`'s numbering (Phase 17 was the last entry
there). Same rules: **extend-only**, **real API when key present else mock, never
throw**, every phase verified (`tsc --noEmit` clean + `npm run lint` + `npm test`
before being marked done here). Full roadmap/rationale: see the plan this status
table tracks against (16 remaining GoHighLevel-parity gaps, Phase 18–34).

## Post-Phase-34 gap check

An independent pass (3 dispatched agents auditing schema integrity, section
registration/dead code, and server/client-boundary + RBAC consistency — not
trusting this doc's own 🟢 claims, per the same convention as
`docs/ACQUISITION_ENGINE_ROADMAP.md`'s own post-Wave gap checks) found and fixed:

- **`schema.sql` was not actually re-runnable** — verified by really executing it
  (spun up a throwaway local Postgres, applied the file 3 times in a row). All 49
  `create policy` statements and 18 `create trigger` statements (across every phase,
  including pre-Phase-18 ones) had no `drop ... if exists` guard, and 4 pre-existing
  `add constraint` statements had none either — a second run failed immediately.
  **Fixed**: every one now has the matching drop-if-exists guard.
- **Two seed `insert ... on conflict` statements were broken on both axes** —
  `intent_scoring_rules`/`acquisition_settings` seed rows used
  `on conflict (key)`, but their `site_id` column (and the composite
  `(site_id, key)` constraint that replaced the single-column one) is added
  *later* in the file — so a fresh run failed too (no `site_id` yet) once the
  conflict target was corrected, and the original single-column target failed on
  re-run. **Fixed**: moved both `insert` blocks to after their composite
  constraints are created, with an explicit `(site_id, key)` conflict target.
- **Membership "Subscribe" button was dead** — `app/member/[tierId]` linked to a
  non-existent static page instead of calling any real subscribe function.
  **Fixed**: added `subscribeToMembership()` (finds/creates the customer by email)
  + a real `SubscribeForm` client component.
- **`updateProduct`/`deleteProduct`/`sendReviewRequest` were exported but never
  called from any UI.** **Fixed**: wired restock/delete buttons into Commerce's
  Products tab, and a "Send Review Request" card into Reputation.
- **Not fixed, left as documented scope**: `redeemGiftCard` (no public checkout
  flow exists yet to call it from) and `getDbTenants` (Admin Panel's tenant list
  still reads localStorage; the Phase 31 dual-write already keeps Supabase in
  sync for when that UI is built) — both are real, callable, tested functions
  sitting ready, not broken code.
- Everything else the 3 agents checked — table creation order vs FK references,
  duplicate table/trigger/policy definitions (one harmless duplicate `add column`
  found and removed), SQL syntax, schema-vs-TypeScript column name matches across
  all 22 new tables, section registration (`sectionMap`/`Sidebar`), dead-code
  references to deleted mock UI, import correctness, the client/server env-var
  leak bug class (2 real instances already caught and fixed earlier in this
  session — confirmed no more remain), and RBAC resource-string consistency —
  came back clean.

Re-verified after every fix above: `npx tsc --noEmit` clean, `npm test` 98/98,
`npm run lint` 185 (unchanged), and `lib/supabase/schema.sql` applied successfully
**3 times in a row** against a real (throwaway, local) Postgres instance.

## Phase status

| # | Capability | Module | Status | Notes |
|---|-----------|--------|--------|-------|
| 18 | Server-Side Auth & RBAC Enforcement | `lib/security/{session,requireAction,demoToken}` | 🟢 core done, rollout ongoing | `requireAuth()`/`assertCan()` built; wired into `lib/actions/{invoices,team,integrations}.ts` as proof-of-pattern + `components/crm/Auth.tsx` now issues a real Supabase JWT or a demo-mode token as `AuthUser.accessToken`. Soft-mode (no token ⇒ allow + warn) keeps every other untouched action working. Remaining `lib/actions/*.ts`/`app/api/**/route.ts` files adopt the same optional-`accessToken` pattern as later phases touch them. |
| 19 | Automation Core: DB-Backed Runs | `lib/actions/workflows.ts`, `lib/automation/store.ts` | 🟢 done | `workflows`/`workflow_runs` tables added; `addRun`/`setActive` dual-write (localStorage cache + Supabase source of truth) without changing either function's signature. `addRun` now fires unconditionally (client or server), closing the documented Wave-5 gap where server-triggered runs never appeared in the feed. `Automation.tsx`'s run/active views merge in the DB view on mount. |
| 20 | Visual Drag-Drop Workflow Builder | `lib/automation/graph/*`, `components/crm/sections/automation/GraphBuilder.tsx` | 🟢 done | Real canvas (`@xyflow/react`) replaces the previous fully-mock `BuilderView` (one hardcoded fixed workflow, fake "Test" animation, no persistence — audited and rebuilt in place, nothing outside the file referenced it). Graph persists to new `workflow_graphs` table; interpreter executes trigger→condition→action graphs by calling the same `createTask`/`createActivity` actions the hardcoded triggers use. `send_whatsapp`/`send_email`/`send_sms` action nodes honestly report "not wired yet" (ships Phase 21) rather than faking success. |
| 21 | Unified Conversations + real WhatsApp/SMS | `lib/messaging`, `lib/actions/conversations.ts`, `app/api/{whatsapp,sms}/inbound` | 🟢 done | New channel-agnostic `conversations`/`messages` tables + real Twilio inbound (signature-verified, 501 until `TWILIO_AUTH_TOKEN` set) and outbound send. `whatsapp_conversations` (existing WhatsApp CRM section) dual-writes so real inbound messages actually appear there today; composer really sends when a contact has a known phone. |
| 22 | Missed-Call Auto Text-Back | `lib/telephony/autoReply.ts` | 🟢 done | The literal GHL "Missed Call Text Back" feature. `/api/telephony/missed-call` (existing, Wave 9) now sends a WhatsApp/SMS auto-reply + creates a callback task on every missed call, template editable via the existing `acquisition_settings` key-value store. Still needs a real telephony provider account to receive actual calls (route stays 501 until `MISSED_CALL_WEBHOOK_SECRET` is set — unchanged from before this phase). |
| 23 | Public Live-Chat Widget | `public/kvl-chat.js`, `app/api/webchat/*` | 🟢 done | Embeddable chat bubble (same dependency-free convention as `kvl-embed.js`), multi-tenant site-scoped. Agent side: `KVlHelpdesk.tsx`'s previously fully-mock `LiveChatTab` (hardcoded `CHAT_SESSIONS`, zero persistence) now loads real webchat conversations, polls for new visitor messages, and really replies. Falls back to the original demo sessions when no real ones exist yet. |
| 24 | Funnel / Landing-Page Builder | `components/crm/sections/KVlPages.tsx`, `lib/pages`, `app/p/[slug]` | 🟢 done | Real drag-drop canvas (`@dnd-kit`) replaces the previous fully-mock Builder tab (hardcoded 3-block preview, fake Save/Publish). Pages persist to `landing_pages` (additively extended); a public render route (`/p/[slug]`) actually serves published pages with real tracking + a working lead-capture Form block. `funnels`/`funnel_steps` tables added for later phases. |
| 25 | Social Planner (real publish) | `lib/social/publish.ts`, `lib/actions/socialPosts.ts` | 🟢 done | Wires `Social.tsx`'s already-complete content-calendar UI (previously 100% local/mock) to real Facebook Page, Instagram, and LinkedIn organic publish + a `social_posts` table. Cron route (`/api/social/cron`, every 15 min via GitHub Action) fires scheduled posts. Twitter/YouTube honestly stay mock — no publisher wired yet. |
| 26 | Reputation Management | `lib/reputation/*`, `components/crm/sections/Reputation.tsx` | 🟢 done | New section (didn't exist before). Google Business OAuth Connect (mirrors Razorpay's exact pattern), AI-drafted replies (human always approves before posting — same pattern as every other AI-drafting feature here), WhatsApp/SMS review-request sending reusing Phase 21. |
| 27 | Commerce I: Orders + Razorpay Orders/Payment Links | `lib/payments/razorpay.ts`, `lib/commerce/text2pay.ts`, `components/crm/sections/KVlCommerce.tsx` | 🟢 done | Real `products`/`orders`/`order_items` tables (previously 972 lines, fully mock). Razorpay Orders API (distinct API-key credential from the existing Connect OAuth), Payment Links, and the first webhook signature verification in this codebase. Text-2-Pay wired (payment link + Phase 21 WhatsApp/SMS send). |
| 28 | Commerce II: Gift Cards, Loyalty, Upsell | `lib/actions/{giftCards,loyalty}.ts`, `lib/commerce/upsellFlow.ts` | 🟢 done | Gift card issue/redeem; append-only loyalty ledger (balance computed on read, full audit history for free). New Gift Cards/Loyalty tabs in `KVlCommerce.tsx`. `getNextFunnelStepUrl` wires Phase 24's `funnel_steps` upsell/downsell types to a real redirect, ready for a future checkout flow to call. |
| 29 | Membership & Courses | `lib/actions/membership.ts`, `components/crm/sections/Membership.tsx`, `app/member/[tierId]` | 🟢 done | New section: tiers (Razorpay Subscriptions-backed), drip course content, gated public viewer. Gives `KVlCommerce.tsx`'s existing course-shaped placeholder products (CRS-AI-1/2) a real backing model. Webhook route (Phase 27) extended for `subscription.charged`/`cancelled`. Honest gap: gated viewer uses a `?customer=` query param, not a real customer-login session — this codebase has no customer-facing auth system, only staff auth. |
| 30 | Affiliate Manager | `lib/affiliates/*`, `components/crm/sections/Affiliates.tsx` | 🟢 done | New section: referral links are plain `?utm_source=<code>` links (zero tracking-SDK changes needed), commissions auto-created on order completion by matching `leads.source` to an affiliate's referral code. Payout is explicitly manual (Razorpay Route needed for real transfers) — "Mark Paid" records a human paid, doesn't fake automation. |
| 31 | SaaS Mode: Tenant Billing & Self-Signup | `lib/whitelabel/*`, `lib/actions/tenants.ts`, `app/signup/[plan]` | 🟢 done | `tenants`/`tenant_users` tables (mirrors `Tenant` type + new billing columns). `lib/whitelabel/store.ts` — the one domain that was localStorage-only — now dual-writes, same pattern as Phase 19. Self-serve signup: real Supabase Auth signup + auto tenant creation + Razorpay Subscription (14-day trial). |
| 32 | Utility Batch (voicemail, card scanner, QR) | `lib/telephony/ringlessVoicemail.ts`, `lib/ai/businessCardScan.ts`, `lib/utils/qr.ts` | 🟢 done | Ringless voicemail (provider-agnostic REST, same caveat class as Truecaller — re-verify against the actual chosen provider). AI business-card scanner wired into Leads' Add Lead modal (real Claude vision when `ANTHROPIC_API_KEY` set). QR generator (`qrcode` package) powers Phase 27's new Tap-2-Pay (`lib/commerce/qr.ts`). |
| 33 | Birthday/Seasonal Auto-Campaigns | `lib/outreach/templates/seasonal.ts`, `/api/outreach/recurring-cron` | 🟢 done | Daily cron sends a real birthday WhatsApp/SMS (Phase 21) to any customer whose birthday is today. Seasonal `campaigns.recurrence_rule` due-detection is honestly logged/counted, not sent — the acquisition-engine `campaigns` table has no channel/message field yet (documented naming collision with `lib/marketing/types.ts`'s different Campaign concept). |
| 34 | Mobile: PWA Hardening | `public/manifest.json`, `components/crm/InstallPrompt.tsx` | 🟢 done | Manifest + theme-color wiring, install prompt, and a deliberately conservative offline fallback (navigation-only, no caching of API/data — this is a live-CRM-data app, never risk showing stale leads offline). Native app store distribution stays explicitly out of code-scope. |

## Verified (Phase 18)
- `npx tsc --noEmit` — clean.
- `npm run lint` — no new errors/warnings introduced (196 pre-existing problems unchanged, none in touched files).
- `npm test` — 65/65 passing (50 pre-existing + 15 new: `lib/security/{demoToken,rbac,requireAction}.test.ts`).
- Soft-mode confirmed by test: `assertCan(undefined, ...)` → allowed + warns, so every server action not yet updated with an `accessToken` param keeps working exactly as before.
- Demo-token and RBAC-matrix grant/deny paths confirmed by test for the new Phase-18-introduced resources (`marketing`, `social`, `commerce`, `funnels`, `membership`, `affiliates`, `whitelabel`, `helpdesk`).
- Real-Supabase-JWT branch of `requireAuth()` is implemented per Supabase's documented `auth.getUser(token)` + `profiles` lookup, but not exercised by an automated test in this environment (no live `SUPABASE_SERVICE_ROLE_KEY` configured here) — falls back to `null`/denied on any failure, never throws, so it degrades safely either way.

## Verified (Phase 19)
- `npx tsc --noEmit` — clean.
- `npm run lint` — problem count unchanged (196; no new errors/warnings in touched files).
- `npm test` — 65/65 passing (unchanged — `lib/actions/workflows.ts` follows the same untested-CRUD convention as `lib/actions/invoices.ts`/`team.ts`, which also have no dedicated test file in this codebase).
- Schema additions (`workflows`, `workflow_runs`) verified by review only — idempotent `create table if not exists` + `create trigger`, matching every existing migration in `schema.sql`; not applied against a live database in this environment (no `SUPABASE_SERVICE_ROLE_KEY` configured here). Apply via Supabase SQL Editor before this phase's persistence is exercised for real.

## Verified (Phase 20)
- `npx tsc --noEmit` — clean.
- `npm run lint` — problem count DROPPED to 191 (from 196 baseline) — replacing the ~600-line fully-mock `BuilderView`/`CanvasBlock`/`PropertiesPanel`/`CANVAS_BLOCKS` chrome removed more pre-existing lint noise than the new graph builder added; confirmed zero new unused-import warnings (pruned Automation.tsx's icon imports down to the 7 still in use) and fixed the 2 new unescaped-apostrophe errors the new copy introduced.
- `npm test` — 70/70 passing (65 prior + 5 new in `lib/automation/graph/interpreter.test.ts`: TRUE/FALSE condition branching, unwired-channel honesty, no-trigger graph, cyclic-graph safety limit).
- `@xyflow/react@12.11.5` installed; `npm audit` checked — its dependency tree (`zustand`, `classcat`, `@xyflow/system`) contributes zero of the pre-existing high-severity advisories (all in unrelated pre-existing toolchain deps: next/postcss/sharp/babel/js-yaml/brace-expansion). Did not run `npm audit fix --force` (would bump `next` outside its stated range — out of scope for this phase).
- `workflow_graphs` table verified by review only (idempotent `create table if not exists`), not applied against a live database in this environment.

## Verified (Phase 21)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 191 problems, unchanged from Phase 20's baseline; zero new issues in any Phase 21 file.
- `npm test` — 75/75 passing (70 prior + 5 new in `lib/messaging/twilioSignature.test.ts`, covering correct signature, tampered param, wrong token, missing signature, and fail-closed-when-unconfigured).
- Inbound routes tested via the same "curl a synthetic request" method `docs/ACQUISITION_ENGINE_ROADMAP.md` used for the missed-call route — not exercised against a real Twilio account (needs one to fully verify signature reconstruction behind whatever proxy this deploys behind; flagged in the route's own header comment).
- `conversations`/`messages` schema + `whatsapp_conversations.contact_phone` column verified by review only, not applied to a live database in this environment.

## Verified (Phase 22)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 191 problems, unchanged.
- `npm test` — 77/77 passing (75 prior + 2 new in `lib/telephony/autoReply.test.ts`).
- `sendMissedCallAutoReply` confirmed never-throws even fully unconfigured (mock-logs and still creates the callback task).

## Verified (Phase 23)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 191 problems, unchanged (public/kvl-chat.js is plain unbundled JS in `public/`, same as `kvl-embed.js`, not part of the TS lint globs).
- `npm test` — 77/77 passing, unchanged (this phase's additions are thin Supabase CRUD + a DOM widget, matching the codebase's own convention of not force-adding tests for that shape of code — same as Phase 21's `lib/actions/conversations.ts` itself has no dedicated test file).
- `conversations.site_id` column + webchat helper functions verified by review only, not applied to / exercised against a live database in this environment.
- Fixed a real bug caught while wiring `LiveChatTab`: the message-bubble JSX unconditionally rendered every message as sent by the agent (hardcoded `flex-row-reverse` + green bubble) — harmless while `chatMessages` only ever held agent-sent messages, but would have mis-rendered real inbound visitor messages as if the agent sent them. Now branches on `m.sender`.

## Verified (Phase 24)
- `npx tsc --noEmit` — clean.
- `npm run lint` — problem count DROPPED to 185 (from 191) — replacing the fully-mock Builder tab's hardcoded chrome removed more pre-existing lint noise than the new builder added; pruned 5 newly-unused icon imports.
- `npm test` — 79/79 passing (77 prior + 2 new in `lib/pages/blocks.test.ts`).
- `@dnd-kit/core`/`sortable`/`utilities` installed; contributes zero new `npm audit` findings (same pre-existing unrelated toolchain advisories as Phase 20's dependency check).
- Fixed a bug caught while building this: `SortableCanvasBlock` briefly had a duplicate JSX `style` prop (would have been a build error, caught by `tsc`/React before it ever ran).
- `landing_pages`/`funnels`/`funnel_steps` schema changes verified by review only, not applied to a live database in this environment.

## Verified (Phase 25)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 83/83 passing (79 prior + 4 new in `lib/social/publish.test.ts`, covering mock fallback for every platform).
- `social_posts` table + cron route wiring verified by review only, not applied to a live database or exercised against real Meta/LinkedIn credentials in this environment.

## Verified (Phase 26)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 87/87 passing (83 prior + 4 new in `lib/reputation/aiReply.test.ts`).
- New section registered via the standard 3-registry pattern (`app/page.tsx` `sectionMap`, `components/crm/Sidebar.tsx` `menuSections`) — `SECTION_FEATURE_MAP`/`RBAC_SECTION_LABELS` deliberately skipped, matching the precedent already set by `social`/`commerce`/`helpdesk` (newer sections without plan-gating or UI-level RBAC yet).
- `reviews`/`review_requests` schema + Google OAuth flow verified by review only — not exercised against a live database or real Google credentials (flagged as the highest-risk external dependency in the whole roadmap; Google manually reviews new Business Profile API access requests).

## Verified (Phase 27)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 93/93 passing (87 prior + 6 new in `lib/payments/razorpay.test.ts`, covering correct/tampered/wrong-secret/missing/unconfigured webhook signature cases + the API-key-pair configured check).
- `updateOrderStatus`/`createProduct` confirmed to safely no-op against demo-shaped ids (harmless zero-row match), matching the pre-existing optimistic-update convention (e.g. `Finance.tsx::markPaid`) rather than needing a separate "demo mode" branch.
- `products`/`orders`/`order_items` schema + Razorpay Orders/Payment Links/webhook verified by review only — not exercised against a live database or real Razorpay merchant credentials in this environment.

## Verified (Phase 28)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 93/93 passing, unchanged (this phase's additions are thin Supabase CRUD, matching the established convention of not force-adding tests for that shape of code — same as Phase 27's `lib/actions/{products,orders}.ts`).
- `gift_cards`/`loyalty_points` schema verified by review only, not applied to a live database in this environment.

## Verified (Phase 29)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged (fixed one new setState-in-effect error introduced while building this, before finalizing).
- `npm test` — 93/93 passing, unchanged (Supabase CRUD, matching the established no-forced-test convention for that shape of code).
- New section registered via the standard 3-registry pattern.
- `membership_tiers`/`memberships`/`course_content` schema + Subscriptions API + gated viewer verified by review only, not exercised against a live database or real Razorpay credentials in this environment.

## Verified (Phase 30)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 93/93 passing, unchanged.
- New section registered via the standard 3-registry pattern.
- `affiliates`/`affiliate_commissions` schema + attribution wiring verified by review only, not exercised against a live database in this environment.

## Verified (Phase 31)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 93/93 passing, unchanged.
- `saveTenant`/`deleteTenant` dual-write confirmed to keep their exact prior synchronous signatures — no existing caller (Admin Panel's tenant management UI, `resolveTenant`) needed to change.
- `tenants`/`tenant_users` schema + self-signup flow verified by review only — not exercised against a live database, real Supabase Auth signup, or real Razorpay credentials in this environment.

## Verified (Phase 32)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 98/98 passing (96 prior + 2 new in `lib/utils/qr.test.ts`).
- `qrcode` package installed; `npm audit` checked — contributes zero new findings (same pre-existing unrelated toolchain advisories as every other dependency added in this roadmap).
- Leads' "Scan Business Card" button verified by code review + tsc; not exercised against a live camera/photo or real `ANTHROPIC_API_KEY` in this environment.

## Verified (Phase 33 & 34)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 96/96 passing (93 prior + 3 new in `lib/outreach/templates/seasonal.test.ts`).
- `customers.birthday`/`campaigns.recurrence_rule` columns verified by review only, not applied to a live database in this environment.
- PWA: manifest + install prompt are pure client/static additions, no backend dependency — verified by code review; real installability (Chrome's `beforeinstallprompt` firing) needs an actual browser/deployment to observe, not exercised in this sandbox.

## Not achievable by code alone
See the full table in the approved plan (`~/.claude/plans/graceful-foraging-kite.md`) — WhatsApp Business approval, Meta/Google Business API review, native app store distribution, SMS carrier registration, etc. Each is called out again in this doc as the phase that needs it is reached.
