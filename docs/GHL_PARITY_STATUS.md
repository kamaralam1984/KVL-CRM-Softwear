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

---

# Phase 35–40 — Closing the Final 6 GHL Gaps

Continues the same table/rules. Full context and per-phase design:
`~/.claude/plans/graceful-foraging-kite.md`. Order: 35, 37, 39, 36 (🔴), 40, 38 (🔴).

| # | Capability | Module | Status | Notes |
|---|-----------|--------|--------|-------|
| 35 | Real Twitter/X Publishing + honest YouTube removal | `lib/social/publish.ts`, `lib/social/twitterOAuth.ts` | 🟢 done | Real OAuth 1.0a (hand-rolled HMAC-SHA1, no SDK) `POST /2/tweets`, gated on `TWITTER_API_KEY/SECRET` + `TWITTER_ACCESS_TOKEN/SECRET`. Twitter un-suppressed from `Social.tsx`'s composer/analytics (was previously hidden even though slated to become real). YouTube removed entirely — Data API v3 is upload-only, there is no public API for a short text "Community" post, so rather than leave it as the one silently-mocked-but-still-selectable platform (a real inconsistency the gap-check found: Twitter was hidden, YouTube wasn't, both equally fake), it's honestly gone from `PLATFORM_CFG`/`SocialPlatform` rather than faked. |
| 37 | SMS DLT-Compliant Template Scaffolding | `lib/actions/smsTemplates.ts`, `lib/messaging/send.ts` | 🟢 done | New `sms_templates` table + a Settings → Communication "DLT Templates" tab where the user records their carrier-approved entity/template IDs once real DLT registration is complete externally. `sendSms(to, body, templateKey)` now logs which approved template an SMS was sent under for audit trail — never blocks sending on a missing/unapproved template. Wired into the 3 existing SMS senders: missed-call auto-reply, review request, birthday wish. |
| 39 | Production Hardening & Observability | `instrumentation.ts`, `instrumentation-client.ts`, `app/global-error.tsx`, `app/api/health/route.ts` | 🟢 done | Sentry error capture wired via Next's own documented hooks (`instrumentation.ts` server init, `instrumentation-client.ts` browser init, `app/global-error.tsx` top-level boundary) — fully gated on `NEXT_PUBLIC_SENTRY_DSN`, silently off otherwise. New `/api/health` (DB-ping liveness check) for an external uptime service to poll. **Real bug fixed**: `app/api/integrations/razorpay/webhook/route.ts` had HMAC signature verification but zero rate limiting — added the same `rateLimit()` call the Twilio inbound routes already use. |
| 36 | Affiliate Payout Automation (Razorpay Route) | `lib/payments/razorpayRoute.ts`, `lib/actions/affiliates.ts` | 🟢 done | 🔴 CHECKPOINT phase. Real RazorpayX Contact → Fund Account (UPI VPA) → Payout REST calls, a third distinct Razorpay credential set (`RAZORPAYX_KEY_ID/SECRET` + `RAZORPAYX_ACCOUNT_NUMBER`) alongside the existing Orders key pair and Connect OAuth credential — never conflated. `Affiliates.tsx` gained a "Payout Details (UPI)" card per affiliate; "Pay Commission" tries the real RazorpayX transfer first and transparently falls back to the existing manual ledger mark whenever RazorpayX isn't configured or that affiliate has no saved fund account yet — a single smart handler rather than the client needing to know server config ahead of time. |
| 40 | Public API + Outbound Webhooks (Marketplace Foundation) | `app/api/v1/*`, `lib/webhooks/dispatch.ts`, `lib/actions/{apiKeys,webhooks}.ts`, `components/crm/sections/Developers.tsx` | 🟢 done | New section (didn't exist before). Real, sha256-hashed API keys (shown once at creation, never persisted in plaintext) authenticate `/api/v1/{leads,contacts,deals}` GET/POST — reuses the exact same `getLeads`/`createLead` etc. the core CRM UI already calls, no parallel data path. Real outbound webhooks: HMAC-SHA256-signed POST fired on `lead.created`/`deal.won`/`order.paid`, with a 2-attempt backoff + a `webhook_deliveries` log. New `"developers"` RBAC resource — deliberately Admin/Super-Admin-only (API keys grant programmatic CRM access). **Explicitly scoped**: this ships marketplace infrastructure, not GoHighLevel's actual app-catalog scale — that comes from years of external developer adoption no code can manufacture. |
| 38 | Native App Shell (Capacitor Hybrid Wrap) | `capacitor.config.ts`, `android/`, `ios/` | 🟢 done | 🔴 CHECKPOINT phase, last of the 6. Real `android/` and `ios/` native projects via `@capacitor/{core,cli,android,ios}`, configured in **remote/hybrid mode** — the native WebView loads `https://crm.kvlbusinesssolutions.com` live rather than bundling a static export (confirmed not viable: 39 `app/api/**` routes + 45 `"use server"` files). Fixed the PWA icon gap first: generated real `192×192`/`512×512`/maskable PNGs from the existing 245×245 logo (upscaled — a higher-res source logo would look sharper) and wired them into `manifest.json`. Hand-generated the full native icon sets too (Android's 5 mipmap densities × legacy/round/adaptive-foreground, iOS's single 1024×1024) directly with Pillow rather than adding `@capacitor/assets` (see Verified below — that package jumped `npm audit` from 6 to 12 findings including 1 critical, rejected on the same "zero new findings" bar every other dependency in this roadmap was held to). |

## Verified (Phase 35)
- `npx tsc --noEmit` — clean (fixed one real type error: `headerParams` needed an explicit `Record<string, string>` annotation for the spread-in `oauth_signature` key).
- `npm run lint` — 185 problems, unchanged (the only findings inside `Social.tsx` are pre-existing, unrelated to this change: an already-unused `TrendingUp` import, an already-unused `onPreFill` prop, and a pre-existing ternary-as-statement in `togglePlatform`).
- `npm test` — 102/102 passing (98 prior + 4 new in `lib/social/twitterOAuth.test.ts`: header format, per-call nonce/timestamp freshness, missing-credential → null, `isTwitterConfigured` partial-credential case). `lib/social/publish.test.ts`'s twitter case re-verified against the real function (still mocks correctly with no env keys set in the test environment).
- **Not achievable by code alone**: Twitter API v2 write access requires a paid Basic tier (~$100/month) — the code path is real and ready, but posting will only actually work once the user activates that paid tier and sets the 4 `TWITTER_*` env vars. Flagged to the user; not implied as free or already active.

## Verified (Phase 37)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged (the two findings inside the touched `Settings.tsx` — an unused `Lock` import, a setState-in-effect at the pre-existing Razorpay-callback handler — are both pre-existing, not introduced by this phase).
- `npm test` — 104/104 passing (102 prior + 2 new in `lib/messaging/send.test.ts`, confirming `sendSms` never throws with or without a `templateKey`, both configured-nothing paths). `smsTemplates.ts` itself has no dedicated test file, matching the established "thin Supabase CRUD" no-forced-test convention (same as every `lib/actions/*.ts` file in this codebase).
- `sms_templates` table verified by review only (idempotent `create table if not exists` + inline composite unique), not applied to a live database in this environment.
- **Not achievable by code alone**: actual DLT entity/template registration (PAN, GST, Letter of Authorization, a specific telecom's DLT portal) is a pure external administrative process — this phase only gives the user somewhere to record the result once they've done it.

## Verified (Phase 39)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 104/104 passing, unchanged (instrumentation/global-error/health are thin infra wiring, matching the established no-forced-test convention for that shape of code — same as every webhook route in this codebase, which are "curl a synthetic request" verified rather than unit-tested).
- `npm run build` — full production build succeeded, `/api/health` present in the route manifest, no Sentry/instrumentation build errors (Next 16 needs no `experimental.instrumentationHook` flag — enabled by default since Next 15).
- **Real smoke test against the live Supabase project**: started the built app locally (`npm start`), curled `/api/health` — `HTTP 200`, `{"ok":true,"dbOk":true,...}`, confirming a genuine round-trip against the real `tbkfldydmgkjylwtowpr` Supabase project already configured in `.env.local`. Server was stopped immediately after.
- `@sentry/nextjs@10.20.0` (approx.) installed; `npm audit` checked — contributes zero new findings (same 6 pre-existing unrelated toolchain advisories: `next`/`postcss`/`sharp`/`@babel/core`/`js-yaml`/`brace-expansion`, all present before this phase).
- **Scoping note**: this phase intentionally does NOT wire the full Sentry build-time source-map-upload pipeline (`withSentryConfig` in `next.config.ts`, `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`) — that needs extra CI secrets and would risk breaking the build if misconfigured. Error capture works fully with just `NEXT_PUBLIC_SENTRY_DSN`; stack traces just won't be source-mapped back to original TypeScript until the user optionally sets that up later.
- **Honesty note carried from the plan**: this phase improves engineering readiness (error visibility, abuse protection on the money-movement webhook, a real health signal) — it does not and cannot manufacture years of real production traffic across many agencies, which is what "maturity/scale" actually means. Not claimed as closed here.
- **Not achievable by code alone**: point an external uptime service (e.g. UptimeRobot, free tier) at `/api/health` — polling it from inside this app wouldn't catch the app itself being down. A free Sentry account (2-minute signup) is needed to get a `NEXT_PUBLIC_SENTRY_DSN` value in the first place.

## Verified (Phase 36)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged. Caught and fixed one real setState-in-effect error introduced while building this (`Affiliates.tsx` was syncing `vpaInput`/`vpaSaved` directly inside the `[selected]` effect) — refactored into a `selectAffiliate()` helper called from every place selection changes (initial load, create, list click) instead, matching the same fix pattern already used for this exact lint rule in Phase 29's `Membership.tsx`.
- `npm test` — 108/108 passing (104 prior + 4 new in `lib/payments/razorpayRoute.test.ts`: unconfigured-check, fund-account mock, payout mock, and the mock-fund-account short-circuit inside `createPayout`).
- `npm run build` — full production build succeeded with the updated `Affiliates.tsx`.
- `affiliates.payout_vpa/razorpayx_contact_id/razorpayx_fund_account_id` and `affiliate_commissions.razorpayx_payout_id` columns verified by review only (idempotent `add column if not exists`), not applied to a live database in this environment.
- **Not achievable by code alone**: real automated payouts need the user's own Razorpay Route product approval plus per-payee KYC from Razorpay — the exact same external dependency this phase's payout code was built ready for, not newly introduced by it.

## Verified (Phase 40)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged (caught and fixed one new ternary-as-statement warning in `Developers.tsx`'s `toggleEvent` before finalizing — same lint rule class as the pre-existing ones elsewhere in this codebase).
- `npm test` — 113/113 passing (108 prior + 5 new: `lib/webhooks/dispatch.test.ts` confirms `dispatchWebhookEvent` never throws for any event type with no Supabase configured; `lib/apiKeys/auth.test.ts` confirms `authenticateApiKey` rejects a missing header, a non-Bearer header, and a well-formed-but-unknown key — using a real `NextRequest` instance, not a mock).
- `npm run build` — full production build succeeded, `/api/v1/{leads,contacts,deals}` all present in the route manifest.
- **Real smoke test against the live Supabase project**: started the built app (`npm start`), curled `/api/v1/leads` with no `Authorization` header → `HTTP 401 {"error":"unauthorized"}`; with a well-formed-but-fake bearer key → `HTTP 401 {"error":"unauthorized"}` (a genuine round-trip that queried the real `api_keys` table and correctly found no match, not a crash); `/api/health` → `HTTP 200 {"ok":true,"dbOk":true,...}`. Server stopped immediately after.
- `api_keys`/`webhooks`/`webhook_deliveries` tables verified by review only (idempotent `create table if not exists`), not applied to a live database in this environment.
- New `"developers"` RBAC resource added to `lib/security/rbac.ts`'s `RESOURCES` — deliberately given no explicit grant in Manager/Marketing/Finance/Support/Viewer (missing entry = denied by default); Admin gets it via its existing wildcard CRUD grant, Super Admin via its omnipotent-role bypass. Confirmed by code review, matching the existing test coverage pattern for `rbac.test.ts` (no new test added since the mechanism itself — missing-entry-denies — is already covered there for other resources).
- **Not achievable by code alone**: the actual marketplace/ecosystem advantage GoHighLevel has — hundreds of 3rd-party apps built by external developers and discovered by agencies — requires years of adoption this phase's infrastructure makes possible but cannot itself create.

## Verified (Phase 38)
- `npx tsc --noEmit` — clean (`capacitor.config.ts` type-checks against `@capacitor/cli`'s `CapacitorConfig` type).
- `npm run lint` — 185 problems, unchanged (native `android/`/`ios/` project files are Kotlin/Swift/XML/Gradle, entirely outside this repo's ESLint globs).
- `npm test` — 113/113 passing, unchanged (this phase is config/scaffolding/static assets, matching the same "verified by code review, not a forced test" convention Phase 34's PWA work already used).
- `npm run build` — full production build succeeded, confirming the native project folders don't interfere with the Next.js build.
- `npx cap doctor` — confirmed `@capacitor/{cli,core,android,ios}@8.5.0` (latest) installed correctly; correctly reported `Xcode is not installed` (expected and unavoidable — this sandbox is Linux; building/archiving the iOS app requires an actual Mac, same as any iOS app in existence, not a limitation this repo introduces).
- `npx cap add android` / `npx cap add ios` / `npx cap sync` all ran cleanly, generating real Gradle/Xcode project structures (not placeholder stubs) with correct `appId` (`com.kvlbusinesssolutions.crm`) and `appName` (`KVl CRM`) propagated into `android/app/build.gradle`, `android/app/src/main/res/values/strings.xml`, and `ios/App/App.xcodeproj/project.pbxproj`.
- **Dependency decision, documented**: `@capacitor/assets` (the official icon/splash generator) was installed, checked, and DELIBERATELY REMOVED — `npm audit` jumped from 6 findings to 12 (including 1 critical, up from 0 critical), a real regression against the "zero new findings" bar held throughout this entire roadmap. Generated all native icon assets by hand instead: Android's 5 mipmap densities (`ic_launcher`/`ic_launcher_round`/`ic_launcher_foreground`, exact pixel dimensions matched to Capacitor's own template output) and iOS's single 1024×1024 App Store icon (alpha-flattened — Apple rejects icons with transparency), all via Pillow (Python), not a new npm dependency. `@capacitor/{core,cli,android,ios}` themselves added 3 new moderate findings (`@capacitor/cli`→`xcode`→`uuid`, a missing-bounds-check advisory that only triggers when a caller supplies uuid's `buf` param — not something this codebase's usage path does; a devDependency never in the shipped server bundle) — accepted as low real-world risk, same tier as the pre-existing next/postcss/sharp/babel/js-yaml/brace-expansion advisories.
- **Not achievable by code alone**: this delivers ready-to-submit native projects, not live store listings. Actual App Store/Play Store distribution needs an Apple Developer Account ($99/yr), a Google Play Developer Account ($25 one-time), code signing certificates, and each store's own review process (Apple's can take days and can reject) — all 100% external/manual, none of it something this repo can do.

---

## Post-Phase-40 gap check

Same independent-audit convention as the earlier post-Phase-34 round: 3 dispatched
agents (schema idempotency, dead-code/registration, security/RBAC on the new public
API) — not trusting this doc's own 🟢 claims. Found and fixed:

- **RBAC "developers" gate was soft-mode-bypassable — a real, high-severity gap.**
  `assertCan`'s Phase-18 soft mode (missing token ⇒ allow + warn) is a deliberate
  incremental-rollout choice for ordinary CRUD, but `lib/actions/apiKeys.ts` and
  `lib/actions/webhooks.ts` are `"use server"` functions — directly callable RPC
  endpoints once a page referencing them has loaded, no cookie required. An
  unauthenticated caller omitting `accessToken` could have minted a live API key
  (full `/api/v1/{leads,contacts,deals}` read/write) or registered a webhook to
  their own server. **Fixed**: new `assertCanStrict()` in
  `lib/security/requireAction.ts` — denies outright when no token is presented,
  used only by the two Developers action files (every other action keeps
  `assertCan`'s existing soft mode; this is a scoped, documented exception for a
  resource whose actions mint standing credentials, not a broader RBAC rewrite).
- **Unmitigated SSRF via user-supplied webhook `endpoint_url` — genuinely new risk
  class.** Confirmed by audit: this is the first user-supplied-URL fetch anywhere
  in this codebase (every other server-side fetch targets a fixed/env-configured
  host), so it didn't actually match the "same risk class as existing integration
  secrets" the original code comment claimed. **Fixed**: new
  `lib/security/ssrfGuard.ts` resolves the hostname and rejects loopback/private/
  link-local targets (including the `169.254.169.254` cloud-metadata address) —
  checked both when a webhook is created AND again at dispatch time (DNS can
  change between those two moments — rebinding), fails closed on any resolution
  error.
- **`getWebhookDeliveries` was exported but never called from any UI** — same
  dead-code class the earlier gap-check round found (`sendReviewRequest`,
  `updateProduct`/`deleteProduct`). **Fixed**: wired into a real expand-on-click
  delivery-history log per webhook in `Developers.tsx`.
- **`social_posts.platform`'s check constraint still listed `'youtube'`** after
  Phase 35 removed it from the app's `SocialPlatform` type — harmless (the app can
  no longer insert that value) but stale. **Fixed**: tightened both the table
  definition and an idempotent `alter table ... drop/add constraint` for
  already-existing databases.
- **Minor consistency fix**: the 3 `app/api/v1/*` GET handlers weren't wrapped in
  try/catch, unlike their POST siblings. Added for consistency/logging, not a
  known live bug (the underlying `get*` functions already degrade to seed data on
  DB error rather than throwing).
- Everything else the 3 agents checked — schema.sql applied twice in a row
  against a real throwaway Postgres container (all of it, not just the new
  tables) with zero errors; every new FK type/reference verified against the
  live schema; every TypeScript action file cross-checked column-by-column
  against the actual SQL (zero camelCase/snake_case mismatches); 3-registry
  section registration for `Developers`; `Affiliates.tsx`'s selection-switch
  logic; the `Settings.tsx` DLT Templates block's JSX structure — came back
  clean.

Re-verified after every fix above: `npx tsc --noEmit` clean, `npm test` 124/124
(113 prior + 11 new: 3 `assertCanStrict` cases in `requireAction.test.ts`, 8 in
new `lib/security/ssrfGuard.test.ts`), `npm run lint` 185 (unchanged), and
`npm run build` succeeds.

---

## Phase 35–40: all 6 complete (35, 37, 39, 36, 40, 38 🟢). Both 🔴 checkpoints (36, 38) cleared, independent gap-check passed with 1 high-severity + several minor findings fixed. Full roadmap (Phase 18–40) is now done — see the "Not achievable by code alone" table above and each phase's own notes for what still needs action outside this repo before a given feature is truly live in production.

---

# Phase 41–44 — Closing the Last 4 GHL Gaps

A user-supplied GHL "Get more leads in the door" feature screenshot was checked item-by-
item against the real codebase (not assumptions). 4 items came back real-but-partial or
fully absent: Voice AI (never places a real call), Forms/Surveys/Quizzes (one hardcoded
marketing quiz, no builder), Call Tracking (only missed-call-text-back exists), Social DMs
(Instagram/Messenger channel values reserved in schema but never implemented). Full
context and per-phase design: `~/.claude/plans/graceful-foraging-kite.md`.
Order: 42, 43, 41, 44 (🔴).

| # | Capability | Module | Status | Notes |
|---|-----------|--------|--------|-------|
| 42 | Social DMs (Instagram + Messenger) | `app/api/meta/inbound/route.ts`, `lib/messaging/{metaSignature,send}.ts` | 🟢 done | Real inbound webhook — GET handshake (`hub.challenge`) + POST event delivery, HMAC-SHA256 `X-Hub-Signature-256` verified (new `lib/messaging/metaSignature.ts`, structurally mirrors `razorpay.ts`'s webhook verify). Real outbound send via Graph API's Send API (`sendInstagramDm`/`sendMessengerMessage`), reusing the exact `META_PAGE_ACCESS_TOKEN`/`META_PAGE_ID`/`META_INSTAGRAM_USER_ID` env vars `lib/social/publish.ts` already uses for posting — same credential, a different endpoint. Closes the literal stub in `conversations.ts::sendMessage()` ("isn't wired to a real send yet"). `KVlHelpdesk.tsx`'s `LiveChatTab` (already reading real `conversations`/`messages`) now also lists and replies to Instagram/Messenger threads with a small channel badge, not just webchat — no new inbox UI built. No identity resolution on inbound (a DM sender's PSID/IGSID carries no phone/email, and `resolveIdentity()` requires one — same honest gap webchat's own inbound route already has). |

## Verified (Phase 42)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 133/133 passing (124 prior + 9 new: 6 in `lib/messaging/metaSignature.test.ts` covering correct/tampered/wrong-secret/missing/malformed-prefix/unconfigured signature cases, 3 in `lib/messaging/send.test.ts` covering `sendInstagramDm`/`sendMessengerMessage` mock fallback + `isMetaMessagingConfigured`).
- `npm run build` — full production build succeeded, `/api/meta/inbound` present in the route manifest.
- `conversations`/`messages` schema needed no changes — `instagram`/`messenger` channel values were already present in the check constraint from Phase 21, confirmed by the pre-work audit; this phase is pure application-code wiring.
- **Not achievable by code alone**: real production use needs Meta App Review for the `pages_messaging`/`instagram_manage_messages` permissions — Meta manually reviews new messaging-API access requests, can take weeks and isn't guaranteed, same risk class already flagged for Phase 26's Google Business review and Phase 25's Meta post-publish permissions.

| # | Capability | Module | Status | Notes |
|---|-----------|--------|--------|-------|
| 43 | Forms, Surveys & Quiz Builder | `components/crm/sections/Forms.tsx`, `lib/forms/fields.ts`, `lib/actions/forms.ts`, `app/forms/[slug]` | 🟢 done | New section, new `forms`/`form_submissions` tables — deliberately separate from Phase 24's funnel builder (a form/quiz needs to exist standalone, matching GHL, not only nested in a funnel page). One typed field model (`text/email/phone/textarea/select/radio/checkbox/rating`) covers form, survey, and quiz — a `scoreWeight` on an option is what turns a survey into a scored quiz, generalizing the hardcoded `recommendPlan()` pattern already in `components/marketing/Quiz.tsx`. Builder reuses the exact `@dnd-kit` sortable pattern proven in `KVlPages.tsx`, but as a simpler linear field list, not a free-form canvas. New `form_submission` leadgen source feeds real respondents (with an identifiable name/email/phone) into the existing pipeline, mirroring `webForm.ts`'s poll-and-mark-processed shape. The existing hardcoded `/quiz` marketing page and `Quiz.tsx` are untouched — this adds a general-purpose builder alongside them, not a replacement. |

## Verified (Phase 43)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 143/143 passing (133 prior + 10 new in `lib/forms/fields.test.ts`: every field type has a working default, unique ids, options-vs-no-options per type, and 8 `computeScore`/`matchScoreBand` cases covering single/multiple selections, mixed field types, no-answer, unmatched-value, and score-band matching/no-match).
- `npm run build` — full production build succeeded, `/forms/[slug]` present in the route manifest.
- `forms`/`form_submissions` schema verified by review only (idempotent `create table if not exists` + composite unique on `(site_id, slug)`), not applied to a live database in this environment.
- **Not achievable by code alone**: none — this phase is fully code-completable, no external approval or paid tier required (unlike the other 3 phases in this round).

| # | Capability | Module | Status | Notes |
|---|-----------|--------|--------|-------|
| 41 | Call Tracking (Dynamic Number Insertion) | `lib/telephony/numbers.ts`, `lib/actions/callTracking.ts`, `app/api/telephony/{inbound-call,call-status}` | 🟢 done | New `tracking_numbers`/`call_logs` tables. Real Twilio `IncomingPhoneNumbers` search-and-buy REST call (mock-assigns a fake number when unconfigured). Every call to a tracking number gets attributed to its campaign by reusing the EXACT `recordSessionStart` + `recordTouchpoint` calls Phase 22's missed-call route already makes (no new attribution primitive), is logged to `call_logs`, then forwarded via TwiML `<Dial>` — the caller's experience never changes. A second `call-status` webhook (Twilio's `statusCallback`) fills in final duration/recording once the call ends. New Marketing → "Call Tracking" tab: provision a number, see the pool, see recent calls. |

## Verified (Phase 41)
- `npx tsc --noEmit` — clean.
- `npm run lint` — 185 problems, unchanged.
- `npm test` — 146/146 passing (143 prior + 3 new in `lib/telephony/numbers.test.ts`: configured-check, mock-number format, and mock-id uniqueness across calls).
- `npm run build` — full production build succeeded, `/api/telephony/inbound-call` and `/api/telephony/call-status` both present in the route manifest.
- `tracking_numbers`/`call_logs` schema verified by review only (idempotent `create table if not exists`, FK types checked against `campaigns.id bigserial`), not applied to a live database in this environment.
- **Not achievable by code alone**: buying real phone numbers costs a recurring per-number monthly fee from Twilio — flagged directly in the "Call Tracking" tab's own UI copy, not silently implied as free. India-specific virtual numbers additionally carry extra regulatory/KYC requirements beyond what this US-focused `IncomingPhoneNumbers` search covers.

| # | Capability | Module | Status | Notes |
|---|-----------|--------|--------|-------|
| 44 | Voice AI Live Audio Bridge | `voice-relay/server.js`, `lib/voice/providers.ts` | 🟢 done | 🔴 CHECKPOINT phase, last of the whole roadmap. New **standalone** Node process (plain JS, `voice-relay/server.js` — deliberately NOT part of the Next.js app, since a stock `next start` deployment has no WebSocket-upgrade-handling server) bridges Twilio Media Streams ↔ OpenAI's Realtime API. Both sides speak `g711_ulaw` — no manual PCM transcoding needed, just re-wrapping the same base64 audio payload in each side's own JSON envelope. `lib/voice/providers.ts::initiateCall()`'s `twilio` branch now genuinely places a call (Twilio Calls API + inline `<Connect><Stream>` TwiML) instead of just acknowledging the credential — gated on **both** Twilio creds **and** `VOICE_RELAY_WSS_URL` (a real call with nowhere for its audio to go would be worse than an honest mock). `openai_realtime`/`elevenlabs` alone still only acknowledge + queue, correctly — neither has a telephony carrier of its own; the `twilio` path is what carries their audio. Reuses Phase 41's `call_logs` table (new `is_ai_call`/`ai_provider`/`ai_transcript` columns) rather than a parallel one — the relay's `finalize()` updates the row by `provider_call_sid` once a call ends. |

## Verified (Phase 44)
- `npx tsc --noEmit` — clean (`voice-relay/server.js` is plain `.js`, outside `tsconfig.json`'s `include` globs — same reasoning as `android/`/`ios/`).
- `npm run lint` — 185 problems, unchanged (`voice-relay/**` added to `eslint.config.mjs`'s `globalIgnores` — it's a standalone deployed script, not part of the app bundle, same treatment as the native app folders).
- `npm test` — 151/151 passing (146 prior + 5 new in `lib/voice/providers.test.ts`, specifically covering the new gating logic: missing-`to` never throws, mock-when-no-creds, `openai_realtime` correctly queues-not-places even with a key, and — the actual gap-check-relevant cases — `twilio` provider mocks when Twilio creds are set but `VOICE_RELAY_WSS_URL` isn't, and vice versa).
- `npm run build` — full production build succeeded; `voice-relay/server.js` correctly does not appear in the Next.js route manifest (it's not part of that app).
- **Real smoke test of the relay itself**: started `voice-relay/server.js` locally (`node voice-relay/server.js`), curled its health endpoint (`HTTP 200 "voice-relay ok"`), and opened a real WebSocket connection to `/voice-stream` from a separate Node script — confirmed the server accepts the upgrade and, with `OPENAI_API_KEY` intentionally unset, logs the expected error and closes the connection cleanly rather than crashing. Process stopped immediately after.
- `ws`/`@types/ws` installed; `npm audit` checked before and after — 9 findings both times (0 new): the pre-existing 6 (next/postcss/sharp/babel/js-yaml/brace-expansion) plus the 3 moderate `@capacitor/cli`→`xcode`→`uuid` findings already accepted and documented in Phase 38.
- `call_logs.is_ai_call`/`ai_provider`/`ai_transcript` columns verified by review only (idempotent, part of the table's original `create table if not exists` from Phase 41 — no separate `alter table` needed since this table didn't exist before that phase), not applied to a live database in this environment.
- **Not achievable by code alone / real recurring cost, explicitly flagged**: OpenAI Realtime API and Twilio Voice + Media Streams both bill per-minute, meaningfully more than a normal LLM text call — an ongoing operating cost once live, not a one-time fee. **Deployment** (code-ready, VPS commands not run by Claude — no direct VPS access, same constraint as every other phase in this roadmap):
  ```bash
  # On the VPS, inside /var/www/kvl-crm, after the usual git pull + npm install:
  pm2 start voice-relay/server.js --name kvl-voice-relay --node-args="--env-file=.env.local"
  pm2 save
  ```
  Then add a new `location` block to the **existing** `crm.kvlbusinesssolutions.com` Nginx site file (its own config — no other site's file is touched):
  ```nginx
  location /voice-stream {
      proxy_pass http://127.0.0.1:4001;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
  }
  ```
  `nginx -t` before `systemctl reload nginx` (reload, never restart — same discipline the deploy skill always uses). Finally set `VOICE_RELAY_WSS_URL=wss://crm.kvlbusinesssolutions.com/voice-stream` **and** a real random `VOICE_RELAY_SHARED_SECRET` (e.g. `openssl rand -hex 32`) in `.env.local`, then restart `kvl-crm` so the main app picks both up — both env vars are required (see the gap-check section below for why the secret specifically is not optional).

---

## Post-Phase-44 gap check

Same independent-audit convention as the prior two rounds: 3 dispatched agents (schema
idempotency, dead-code/registration, security) — not trusting this doc's own 🟢 claims.
Found and fixed:

- **CRITICAL — the voice-relay WebSocket had zero authentication.** Confirmed by the audit
  and by a real live test against a running instance of `voice-relay/server.js`: *any*
  client that discovered or guessed the `wss://` URL could open a connection, and the
  server would immediately open a real, billed OpenAI Realtime session with the deployer's
  own `OPENAI_API_KEY` — no check that the caller was actually Twilio. Worse, `finalize()`
  updated `call_logs` by trusting a `callSid` read straight from the untrusted client's own
  `start` message, so an attacker who knew or guessed a real `provider_call_sid` could
  overwrite that call's logged transcript/status. **Fixed** with two layers: (1) a
  `VOICE_RELAY_SHARED_SECRET` token required in the connection URL's query string, checked
  with a constant-time compare *before anything else happens on the connection* — a
  missing/invalid token now closes the socket (code 1008) before the code path that would
  ever touch OpenAI; (2) the OpenAI Realtime session is no longer opened at connection
  time at all — it's now deferred until Twilio's `start` event arrives with a `callSid`
  that's confirmed, via a live Supabase lookup, to match a real `call_logs` row this
  process itself created via `lib/voice/providers.ts::placeTwilioStreamCall` for an actual
  outbound call. `initiateCall()`'s `twilio` provider path now also requires
  `VOICE_RELAY_SHARED_SECRET` to be set (not just the WSS URL) before attempting a real
  call — placing a real, billed call that the relay would then refuse to bridge would be
  worse than an honest mock. Re-verified live: no-token and wrong-token connections are
  now rejected in milliseconds with close code 1008, confirmed via a real WebSocket client
  against a running instance of the updated server.
- **HIGH — `submitForm()` (a genuinely public, unauthenticated write path) had no rate
  limiting**, unlike every comparable public write path in this codebase (`app/api/webchat/
  message`, `app/api/analytics/collect`). **Fixed**: added `rateLimit()` keyed by client IP
  (read via `next/headers`'s `headers()`, since a Server Action has no `NextRequest` to
  pull an IP from the way an API route does).
- **MEDIUM — no size/length bounds on a form submission's `answers`.** A visitor could POST
  an arbitrarily large JSON blob repeatedly. **Fixed**: a new `sanitizeAnswers()` truncates
  each answer to 2000 characters (arrays to 50 items) and caps total fields per submission
  at 100 — same truncation discipline `app/api/analytics/shared.ts`'s `str()` already uses
  elsewhere in this codebase.
- **Real bug — `Forms.tsx`'s "Publish" button silently no-op'd on a brand-new form's first
  click.** A stale-closure bug: `publish()` awaited `save()` then read the *component's own*
  `form.id` prop, which for a never-before-saved form was still stuck on the local
  `"draft-..."` placeholder even after `save()` had already persisted a real row — so the
  form saved but never actually published until a second click. **Fixed**: `save()` now
  returns the saved row, and `publish()` uses that return value directly instead of the
  stale closure.
- **Dead code found and wired in**: `lib/telephony/numbers.ts::isTwilioNumberProvisioningConfigured`
  was exported but only ever referenced by its own test file. **Fixed**: a new
  `isTelephonyConfigured()` server-action wrapper in `lib/actions/callTracking.ts` (the
  underlying function reads `process.env` directly, so it can never be imported into
  `Marketing.tsx`'s client component without the exact env-var-leak bug class this
  codebase has guarded against all along) — `CallTrackingTab` now shows a real "Twilio
  Connected" / "Twilio Not Configured — will mock" badge before the user tries
  provisioning a number, instead of only finding out after the fact.
- Everything else the 3 agents checked came back clean: `forms`/`form_submissions`/
  `tracking_numbers`/`call_logs` schema applied twice in a row against a real throwaway
  Postgres container with zero errors (including confirming Phase 44's `is_ai_call`/
  `ai_provider`/`ai_transcript` columns really do live inside Phase 41's original
  `call_logs` table, not a separate `alter table`); every FK type/reference verified
  against the live schema; every TypeScript file cross-checked column-by-column against
  the actual SQL; `Forms`/`Developers` 3-registry section registration; `KVlHelpdesk.tsx`'s
  multi-channel `LiveChatTab` send-routing logic; the Meta inbound webhook's
  signature-verification ordering and fail-closed behavior; the Twilio telephony routes'
  signature verification and rate limiting.

Re-verified after every fix above: `npx tsc --noEmit` clean, `npm test` 152/152 (151 prior
+ 1 new covering the `VOICE_RELAY_SHARED_SECRET` gating), `npm run lint` 185 (unchanged),
`npm run build` succeeds, and a real live WebSocket client confirmed the relay's new
auth-rejection behavior against a running instance of the updated server.
