-- Run this in your Supabase SQL editor to set up the CRM schema
--
-- Gap-check fix: this file used to start with
--   alter database postgres set "app.jwt_secret" to 'your-jwt-secret';
-- Real Supabase Postgres denies "permission denied to set parameter
-- app.jwt_secret" for the standard `postgres` role (confirmed by actually
-- running this file against a live project) — Supabase manages the JWT
-- secret itself via its own infra; this manual override was never needed
-- for auth.uid()/auth.role()/RLS to work. Removed rather than worked around.

-- ── Profiles (extends auth.users) ──────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  role       text not null default 'Member',
  avatar     text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile"   on profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'Member')
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Leads ──────────────────────────────────────────────────────────────────
create table if not exists leads (
  id           bigserial primary key,
  name         text not null,
  company      text not null default '',
  email        text not null default '',
  phone        text default '',
  score        int  not null default 50 check (score between 0 and 100),
  status       text not null default 'warm' check (status in ('hot','warm','cold')),
  stage        text not null default 'Discovery' check (stage in ('Discovery','Qualified','Proposal','Negotiation','Closed')),
  value        numeric not null default 0,
  owner        text not null default '',
  avatar       text default '',
  last_contact text default '',
  tags         text[] default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table leads enable row level security;
drop policy if exists "Authenticated users can CRUD leads" on leads;
create policy "Authenticated users can CRUD leads" on leads for all using (auth.role() = 'authenticated');

-- ── Web-form submissions ─────────────────────────────────────────────────────
-- Inbound leads captured by your public landing-page form. Polled by
-- lib/leadgen/sources/webForm.ts, which reads unprocessed rows and flips
-- `processed` to true so they aren't pulled again.
create table if not exists web_form_submissions (
  id           bigserial primary key,
  name         text default '',
  company      text default '',
  email        text default '',
  phone        text default '',
  message      text default '',
  processed    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists web_form_submissions_processed_idx on web_form_submissions (processed, created_at);
alter table web_form_submissions enable row level security;
drop policy if exists "Authenticated users can CRUD web_form_submissions" on web_form_submissions;
create policy "Authenticated users can CRUD web_form_submissions" on web_form_submissions for all using (auth.role() = 'authenticated');

-- ── Customers ──────────────────────────────────────────────────────────────
create table if not exists customers (
  id            bigserial primary key,
  name          text not null,
  contact       text not null default '',
  email         text not null default '',
  phone         text default '',
  value         numeric not null default 0,
  segment       text not null default 'SMB' check (segment in ('Enterprise','SMB','Startup','Agency','Freelance')),
  health        int  not null default 80 check (health between 0 and 100),
  status        text not null default 'active' check (status in ('active','at-risk','champion','churned')),
  avatar        text default '',
  since         text default '',
  next_renewal  text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table customers enable row level security;
drop policy if exists "Authenticated users can CRUD customers" on customers;
create policy "Authenticated users can CRUD customers" on customers for all using (auth.role() = 'authenticated');

-- ── Customer NPS responses ───────────────────────────────────────────────────
-- Manually-logged Net Promoter Score responses (see components/crm/sections/
-- Customers.tsx NPSManagementTab / lib/actions/nps.ts). No seed/demo fallback —
-- an empty table is the honest state until real responses are logged.
create table if not exists customer_nps_responses (
  id            bigserial primary key,
  customer_name text not null default '',
  score         int  not null check (score between 0 and 10),
  comment       text default '',
  created_at    timestamptz not null default now()
);
create index if not exists customer_nps_responses_created_idx on customer_nps_responses (created_at);
alter table customer_nps_responses enable row level security;
drop policy if exists "Authenticated users can CRUD customer_nps_responses" on customer_nps_responses;
create policy "Authenticated users can CRUD customer_nps_responses" on customer_nps_responses for all using (auth.role() = 'authenticated');

-- ── Deals ──────────────────────────────────────────────────────────────────
create table if not exists deals (
  id             bigserial primary key,
  name           text not null,
  company        text not null default '',
  value          numeric not null default 0,
  probability    int  not null default 20 check (probability between 0 and 100),
  stage          text not null default 'Discovery' check (stage in ('Discovery','Qualified','Proposal','Negotiation','Closed Won','Closed Lost')),
  owner          text not null default '',
  avatar         text default '',
  days_in_stage  int  not null default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table deals enable row level security;
drop policy if exists "Authenticated users can CRUD deals" on deals;
create policy "Authenticated users can CRUD deals" on deals for all using (auth.role() = 'authenticated');

-- ── Tasks ──────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id         bigserial primary key,
  title      text not null,
  priority   text not null default 'medium' check (priority in ('high','medium','low')),
  due        text default '',
  assignee   text not null default '',
  status     text not null default 'pending' check (status in ('pending','in-progress','completed')),
  tags       text[] default '{}',
  company    text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tasks enable row level security;
drop policy if exists "Authenticated users can CRUD tasks" on tasks;
create policy "Authenticated users can CRUD tasks" on tasks for all using (auth.role() = 'authenticated');

-- ── Calendar events ──────────────────────────────────────────────────────
create table if not exists calendar_events (
  id         bigserial primary key,
  day        int not null,
  month      int not null,
  year       int not null,
  title      text not null,
  time       text default '',
  type       text not null default 'meeting',
  color      text not null default 'blue',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table calendar_events enable row level security;
drop policy if exists "Authenticated users can CRUD calendar_events" on calendar_events;
create policy "Authenticated users can CRUD calendar_events" on calendar_events for all using (auth.role() = 'authenticated');

-- ── Integration connections (OAuth-connected third-party apps) ──────────────
-- One row per connected provider (e.g. Razorpay Connect). access_token is the
-- provider's OAuth token, never exposed to the browser — only read/written by
-- server actions and the OAuth callback route.
create table if not exists integration_connections (
  id                bigserial primary key,
  provider          text not null unique,
  access_token      text default '',
  account_ref       text default '',
  connected_at      timestamptz not null default now()
);
alter table integration_connections enable row level security;
drop policy if exists "Authenticated users can CRUD integration_connections" on integration_connections;
create policy "Authenticated users can CRUD integration_connections" on integration_connections for all using (auth.role() = 'authenticated');

-- ── Invoices ───────────────────────────────────────────────────────────────
create table if not exists invoices (
  id         text primary key,
  client     text not null,
  amount     numeric not null default 0,
  status     text not null default 'pending' check (status in ('paid','pending','overdue')),
  date       text default '',
  due        text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table invoices enable row level security;
drop policy if exists "Authenticated users can CRUD invoices" on invoices;
create policy "Authenticated users can CRUD invoices" on invoices for all using (auth.role() = 'authenticated');

-- ── Team members ───────────────────────────────────────────────────────────
create table if not exists team_members (
  id          bigserial primary key,
  name        text not null,
  role        text not null default 'Member',
  email       text not null default '',
  avatar      text default '',
  deals       int  not null default 0,
  revenue     numeric not null default 0,
  target      numeric not null default 0,
  performance int  not null default 0,
  status      text not null default 'offline' check (status in ('online','away','offline')),
  joined      text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table team_members enable row level security;
drop policy if exists "Authenticated users can CRUD team_members" on team_members;
create policy "Authenticated users can CRUD team_members" on team_members for all using (auth.role() = 'authenticated');

-- ── Email campaigns ────────────────────────────────────────────────────────
create table if not exists email_campaigns (
  id          bigserial primary key,
  name        text not null,
  status      text not null default 'draft' check (status in ('sent','scheduled','draft')),
  sent        int  not null default 0,
  opened      int  not null default 0,
  clicked     int  not null default 0,
  bounced     int  not null default 0,
  "openRate"  numeric not null default 0,
  "clickRate" numeric not null default 0,
  date        text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table email_campaigns enable row level security;
drop policy if exists "Authenticated users can CRUD email_campaigns" on email_campaigns;
create policy "Authenticated users can CRUD email_campaigns" on email_campaigns for all using (auth.role() = 'authenticated');

-- ── WhatsApp conversations ─────────────────────────────────────────────────
create table if not exists whatsapp_conversations (
  id         bigserial primary key,
  contact    text not null,
  company    text not null default '',
  message    text default '',
  time       text default '',
  unread     int  not null default 0,
  status     text not null default 'active' check (status in ('active','inactive')),
  avatar     text default '',
  contact_phone text default '', -- Phase 21: E.164 phone, when known, enables a real Twilio send
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table whatsapp_conversations enable row level security;
drop policy if exists "Authenticated users can CRUD whatsapp_conversations" on whatsapp_conversations;
create policy "Authenticated users can CRUD whatsapp_conversations" on whatsapp_conversations for all using (auth.role() = 'authenticated');
-- Phase 21: idempotent for a table created before this column existed.
alter table whatsapp_conversations add column if not exists contact_phone text default '';

-- ── Activity feed ──────────────────────────────────────────────────────────
create table if not exists activity_feed (
  id         bigserial primary key,
  type       text not null default '',
  text       text not null default '',
  time       text default '',
  icon       text default '',
  color      text default '',
  created_at timestamptz default now()
);
alter table activity_feed enable row level security;
drop policy if exists "Authenticated users can CRUD activity_feed" on activity_feed;
create policy "Authenticated users can CRUD activity_feed" on activity_feed for all using (auth.role() = 'authenticated');

-- ── Visitors (Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1) ────
-- Anonymous, first-party visitor identity. Never store PII here — PII only
-- arrives voluntarily via /api/analytics/identify once a visitor self-identifies.
create table if not exists visitors (
  id                    bigserial primary key,
  visitor_id            text unique not null,
  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  page_views            int  not null default 0,
  session_count         int  not null default 0,
  device                text default '',
  browser               text default '',
  os                    text default '',
  language              text default '',
  timezone              text default '',
  country               text default '',
  region                text default '',
  referrer              text default '',
  landing_page          text default '',
  first_touch_source    text default '',
  first_touch_medium    text default '',
  first_touch_campaign  text default '',
  first_touch_term      text default '',
  first_touch_content   text default '',
  first_touch_gclid     text default '',
  first_touch_fbclid    text default '',
  first_touch_msclkid   text default '',
  last_touch_source     text default '',
  last_touch_medium     text default '',
  last_touch_campaign   text default '',
  last_touch_term       text default '',
  last_touch_content    text default '',
  last_touch_gclid      text default '',
  last_touch_fbclid     text default '',
  last_touch_msclkid    text default '',
  identified            boolean not null default false,
  consent_status        text not null default 'unknown' check (consent_status in ('granted','denied','unknown')),
  created_at            timestamptz default now()
);
create index if not exists visitors_visitor_id_idx   on visitors (visitor_id);
create index if not exists visitors_last_seen_at_idx on visitors (last_seen_at desc);
alter table visitors enable row level security;
drop policy if exists "Authenticated users can CRUD visitors" on visitors;
create policy "Authenticated users can CRUD visitors" on visitors for all using (auth.role() = 'authenticated');

-- ── Visitor sessions ─────────────────────────────────────────────────────
create table if not exists visitor_sessions (
  id                bigserial primary key,
  session_id        text unique not null,
  visitor_id        text not null references visitors(visitor_id) on delete cascade,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  landing_page      text default '',
  exit_page         text default '',
  pages_viewed      int not null default 0,
  duration_seconds  int not null default 0,
  source            text default '',
  medium            text default '',
  campaign          text default '',
  term              text default '',
  content           text default '',
  gclid             text default '',
  fbclid            text default '',
  msclkid           text default '',
  device            text default '',
  browser           text default '',
  os                text default '',
  created_at        timestamptz default now()
);
create index if not exists visitor_sessions_visitor_id_idx on visitor_sessions (visitor_id);
alter table visitor_sessions enable row level security;
drop policy if exists "Authenticated users can CRUD visitor_sessions" on visitor_sessions;
create policy "Authenticated users can CRUD visitor_sessions" on visitor_sessions for all using (auth.role() = 'authenticated');

-- ── Visitor events ───────────────────────────────────────────────────────
-- High-volume append-only event log. Never store passwords/payment data
-- (spec §16/§36); `properties` should stay small (UI/engagement metadata only).
create table if not exists visitor_events (
  id           bigserial primary key,
  visitor_id   text not null references visitors(visitor_id) on delete cascade,
  session_id   text references visitor_sessions(session_id) on delete cascade,
  event_name   text not null,
  page_url     text default '',
  properties   jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists visitor_events_visitor_created_idx on visitor_events (visitor_id, created_at desc);
create index if not exists visitor_events_event_name_idx      on visitor_events (event_name);
alter table visitor_events enable row level security;
drop policy if exists "Authenticated users can CRUD visitor_events" on visitor_events;
create policy "Authenticated users can CRUD visitor_events" on visitor_events for all using (auth.role() = 'authenticated');

-- ── Tracking consent log ─────────────────────────────────────────────────
create table if not exists tracking_consents (
  id              bigserial primary key,
  visitor_id      text not null,
  consent_status  text not null check (consent_status in ('granted','denied')),
  categories      jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists tracking_consents_visitor_id_idx on tracking_consents (visitor_id);
alter table tracking_consents enable row level security;
drop policy if exists "Authenticated users can CRUD tracking_consents" on tracking_consents;
create policy "Authenticated users can CRUD tracking_consents" on tracking_consents for all using (auth.role() = 'authenticated');

-- ── Campaigns (Phase 17 — Lead Intelligence & Acquisition Engine, Wave 2) ───
-- Auto-created the first time a named utm_campaign is seen; spend/budget/status
-- are then editable from the CRM. Direct/organic traffic never creates a row here
-- (campaign_touchpoints.source/medium covers source-level reporting instead).
create table if not exists campaigns (
  id              bigserial primary key,
  campaign_key    text unique not null,
  name            text not null,
  source          text default '',
  medium          text default '',
  spend           numeric not null default 0,
  budget          numeric not null default 0,
  status          text not null default 'active' check (status in ('active','paused','ended')),
  notes           text default '',
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists campaigns_campaign_key_idx on campaigns (campaign_key);
alter table campaigns enable row level security;
drop policy if exists "Authenticated users can CRUD campaigns" on campaigns;
create policy "Authenticated users can CRUD campaigns" on campaigns for all using (auth.role() = 'authenticated');

-- ── Campaign touchpoints ─────────────────────────────────────────────────
-- Durable, append-only attribution ledger — decoupled from visitor_sessions so
-- multi-touch models survive independently of session/event retention limits.
create table if not exists campaign_touchpoints (
  id           bigserial primary key,
  visitor_id   text not null references visitors(visitor_id) on delete cascade,
  session_id   text references visitor_sessions(session_id) on delete cascade,
  campaign_id  bigint references campaigns(id) on delete set null,
  source       text not null default '',
  medium       text not null default '',
  campaign     text default '',
  occurred_at  timestamptz not null default now()
);
create index if not exists campaign_touchpoints_visitor_id_idx   on campaign_touchpoints (visitor_id);
create index if not exists campaign_touchpoints_campaign_id_idx  on campaign_touchpoints (campaign_id);
alter table campaign_touchpoints enable row level security;
drop policy if exists "Authenticated users can CRUD campaign_touchpoints" on campaign_touchpoints;
create policy "Authenticated users can CRUD campaign_touchpoints" on campaign_touchpoints for all using (auth.role() = 'authenticated');

-- ── Landing pages ────────────────────────────────────────────────────────
-- Traffic-only rollup for now — bounce rate / form completion / revenue land
-- once a lead/deal join exists (Wave 3+).
create table if not exists landing_pages (
  id             bigserial primary key,
  url_path       text unique not null,
  hits           int not null default 0,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  created_at     timestamptz default now()
);
create index if not exists landing_pages_url_path_idx on landing_pages (url_path);
alter table landing_pages enable row level security;
drop policy if exists "Authenticated users can CRUD landing_pages" on landing_pages;
create policy "Authenticated users can CRUD landing_pages" on landing_pages for all using (auth.role() = 'authenticated');

-- ── Leads: acquisition-engine attribution columns (Phase 17, Wave 3) ───────
-- `leads` already exists from the original schema above — a fresh
-- `create table if not exists` would be a no-op on a live DB, so new columns
-- are added explicitly (idempotent, safe to re-run).
alter table leads add column if not exists source text default '';
alter table leads add column if not exists campaign text default '';
alter table leads add column if not exists visitor_id text references visitors(visitor_id) on delete set null;
create index if not exists leads_visitor_id_idx on leads (visitor_id);

-- ── Visitor identity links (Phase 17, Wave 3 — Identity Resolution) ─────────
-- Durable visitor↔lead mapping. A visitor resolves to exactly one lead;
-- repeat identify() calls are idempotent against this table (unique visitor_id).
create table if not exists visitor_identity_links (
  id           bigserial primary key,
  visitor_id   text not null unique references visitors(visitor_id) on delete cascade,
  lead_id      bigint not null references leads(id) on delete cascade,
  matched_on   text not null check (matched_on in ('phone','email','new')),
  matched_at   timestamptz not null default now()
);
create index if not exists visitor_identity_links_lead_id_idx on visitor_identity_links (lead_id);
alter table visitor_identity_links enable row level security;
drop policy if exists "Authenticated users can CRUD visitor_identity_links" on visitor_identity_links;
create policy "Authenticated users can CRUD visitor_identity_links" on visitor_identity_links for all using (auth.role() = 'authenticated');

-- ── Visitors: intent scoring columns (Phase 17, Wave 4) ─────────────────────
alter table visitors add column if not exists intent_score int not null default 0 check (intent_score between 0 and 100);
alter table visitors add column if not exists intent_band text not null default 'cold' check (intent_band in ('cold','warm','hot','very_hot'));

-- ── Intent scoring rules (Phase 17, Wave 4 — Lead Intent Scoring) ───────────
-- Generic event→points / band-threshold config so scoring is admin-configurable,
-- not hardcoded (spec §34). No settings UI yet (Wave 7) — edited directly for now.
create table if not exists intent_scoring_rules (
  id           bigserial primary key,
  rule_key     text unique not null,
  points       int not null default 0,
  description  text default '',
  updated_at   timestamptz default now()
);
alter table intent_scoring_rules enable row level security;
drop policy if exists "Authenticated users can CRUD intent_scoring_rules" on intent_scoring_rules;
create policy "Authenticated users can CRUD intent_scoring_rules" on intent_scoring_rules for all using (auth.role() = 'authenticated');


-- ── Acquisition settings (Phase 17, Wave 7 — Campaign ROI + Admin Controls) ─
-- Generic key/value, same pattern as intent_scoring_rules. `tracking_enabled`
-- is read by the public /api/analytics/config route the SDK checks on init() —
-- the only setting here actually enforced at runtime this wave; the others are
-- genuinely persisted/editable but not yet wired into new enforcement logic.
create table if not exists acquisition_settings (
  id           bigserial primary key,
  setting_key  text unique not null,
  value        text not null default '',
  updated_at   timestamptz default now()
);
alter table acquisition_settings enable row level security;
drop policy if exists "Authenticated users can CRUD acquisition_settings" on acquisition_settings;
create policy "Authenticated users can CRUD acquisition_settings" on acquisition_settings for all using (auth.role() = 'authenticated');


-- ── Push subscriptions (Phase 17, Wave 9 — Growth & Re-engagement Channels) ─
-- Anonymous re-engagement channel: a browser Push subscription tied only to
-- visitor_id, deliberately collecting no name/email/phone. Lets the site
-- re-reach a visitor who never identified, without ever knowing who they are.
create table if not exists push_subscriptions (
  id           bigserial primary key,
  visitor_id   text not null references visitors(visitor_id) on delete cascade,
  endpoint     text unique not null,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);
create index if not exists push_subscriptions_visitor_id_idx on push_subscriptions (visitor_id);
alter table push_subscriptions enable row level security;
drop policy if exists "Authenticated users can CRUD push_subscriptions" on push_subscriptions;
create policy "Authenticated users can CRUD push_subscriptions" on push_subscriptions for all using (auth.role() = 'authenticated');

-- ── Sites (Phase 17, Wave 10 — Multi-Tenant Embed) ──────────────────────────
-- Public embeddable identity for a website using the tracking SDK. KVL's own
-- marketing site is bootstrapped as 'kvl-default' below so every existing
-- single-tenant row/behavior keeps working with zero changes after this
-- migration. `domains` empty = no Origin restriction — used only by the
-- bootstrap site (served same-origin from this app); any other site must
-- register real domains and is strictly enforced (see lib/sites/http.ts).
create table if not exists sites (
  id           bigserial primary key,
  site_id      text unique not null,
  name         text not null default '',
  owner_email  text default '',
  domains      text[] not null default '{}',
  active       boolean not null default true,
  created_at   timestamptz default now()
);
alter table sites enable row level security;
drop policy if exists "Authenticated users can CRUD sites" on sites;
create policy "Authenticated users can CRUD sites" on sites for all using (auth.role() = 'authenticated');

insert into sites (site_id, name, domains) values
  ('kvl-default', 'KVL CRM (default)', '{}')
on conflict (site_id) do nothing;

-- Permanently seeded (not created ad-hoc via the Admin Panel) so it survives
-- a fresh migration on any Supabase project this schema is run against —
-- kvlbusinesssolutions.com belongs to this same owner and should always have
-- an isolated, embeddable site ready, with zero manual setup required.
insert into sites (site_id, name, domains) values
  ('kvl-business-solutions', 'KVL Business Solutions', '{https://kvlbusinesssolutions.com,https://www.kvlbusinesssolutions.com}')
on conflict (site_id) do nothing;

-- ── site_id columns (Phase 17, Wave 10) ─────────────────────────────────────
-- Every column defaults to 'kvl-default' so existing rows and any code path
-- that doesn't yet pass a siteId keep behaving exactly as before this
-- migration — nothing here is a required change for current single-tenant
-- behavior to keep working. Only the human/derived-string keys below
-- (campaign_key, url_path, rule_key, setting_key) get a real composite-unique
-- constraint — visitor_id/session_id stay globally unique as generated
-- (random hex, effectively collision-free across any number of sites; giving
-- them a composite key too would force composite-FK surgery on every table
-- that references them, for no real benefit).
alter table visitors               add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table visitor_sessions       add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table visitor_events         add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table tracking_consents      add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table campaigns              add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table campaign_touchpoints   add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table landing_pages          add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table visitor_identity_links add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table intent_scoring_rules   add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table acquisition_settings   add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table push_subscriptions     add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
alter table leads                  add column if not exists site_id text not null default 'kvl-default' references sites(site_id);

create index if not exists visitors_site_id_idx  on visitors (site_id);
create index if not exists campaigns_site_id_idx on campaigns (site_id);
create index if not exists leads_site_phone_idx  on leads (site_id, phone);
create index if not exists leads_site_email_idx  on leads (site_id, email);

-- Composite-unique on the human/derived-string keys — drop the old
-- single-column unique constraint (Postgres's default auto-generated name
-- for an inline `unique` column), add the composite one. `if exists` /
-- `if not exists` throughout keeps this idempotent and safe to re-run.
alter table campaigns drop constraint if exists campaigns_campaign_key_key;
alter table campaigns drop constraint if exists campaigns_site_campaign_key_unique;
alter table campaigns add constraint campaigns_site_campaign_key_unique unique (site_id, campaign_key);
drop index if exists campaigns_campaign_key_idx;
create index if not exists campaigns_site_campaign_key_idx on campaigns (site_id, campaign_key);

alter table landing_pages drop constraint if exists landing_pages_url_path_key;
alter table landing_pages drop constraint if exists landing_pages_site_url_path_unique;
alter table landing_pages add constraint landing_pages_site_url_path_unique unique (site_id, url_path);
drop index if exists landing_pages_url_path_idx;
create index if not exists landing_pages_site_url_path_idx on landing_pages (site_id, url_path);

alter table intent_scoring_rules drop constraint if exists intent_scoring_rules_rule_key_key;
alter table intent_scoring_rules drop constraint if exists intent_scoring_rules_site_rule_key_unique;
alter table intent_scoring_rules add constraint intent_scoring_rules_site_rule_key_unique unique (site_id, rule_key);

alter table acquisition_settings drop constraint if exists acquisition_settings_setting_key_key;
alter table acquisition_settings drop constraint if exists acquisition_settings_site_setting_key_unique;
alter table acquisition_settings add constraint acquisition_settings_site_setting_key_unique unique (site_id, setting_key);

-- Seed rows for intent_scoring_rules/acquisition_settings moved here (from
-- right after their `create table`) — gap-check fix. They insert with an
-- explicit (site_id, key) ON CONFLICT target, which only exists once the
-- composite unique constraints directly above are in place; inserting
-- earlier in the file (before site_id even existed on these tables) broke
-- both a fresh run (site_id column not yet added) and every re-run
-- (ON CONFLICT (key) alone stopped matching once Wave 10 replaced that
-- single-column constraint with the composite one).
insert into intent_scoring_rules (rule_key, points, description) values
  ('event:page_view', 5, 'Any page viewed'),
  ('event:pricing_view', 10, 'Pricing page viewed'),
  ('event:demo_click', 15, 'Demo CTA clicked'),
  ('event:whatsapp_click', 15, 'WhatsApp CTA clicked'),
  ('event:form_start', 10, 'Form interaction started'),
  ('event:form_submit', 25, 'Form submitted'),
  ('event:phone_click', 10, 'Phone number clicked'),
  ('event:email_click', 8, 'Email link clicked'),
  ('event:video_play', 5, 'Video played'),
  ('event:video_complete', 10, 'Video watched to completion'),
  ('event:cta_click', 5, 'Generic CTA clicked'),
  ('event:outbound_click', 3, 'Outbound link clicked'),
  ('event:download', 8, 'File downloaded'),
  ('event:scroll_depth', 2, 'Deep scroll on a page'),
  ('bonus:repeat_visit', 10, 'Returning visitor started a new session'),
  ('bonus:return_within_7_days', 10, 'Returned within 7 days of last visit'),
  ('event:quiz_completed', 20, 'Completed the plan-recommendation quiz'),
  ('event:push_subscribed', 10, 'Opted in to push notifications'),
  ('threshold:warm', 31, 'Minimum score for Warm band'),
  ('threshold:hot', 61, 'Minimum score for Hot band'),
  ('threshold:very_hot', 81, 'Minimum score for Very Hot band')
on conflict (site_id, rule_key) do nothing;

insert into acquisition_settings (setting_key, value) values
  ('tracking_enabled', 'true'),
  ('default_consent_mode', 'granted'),
  ('retention_days', '365'),
  ('missed_call_number', '')
on conflict (site_id, setting_key) do nothing;

-- ── updated_at auto-trigger ────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at     before update on leads     for each row execute procedure set_updated_at();
drop trigger if exists customers_updated_at on customers;
create trigger customers_updated_at before update on customers for each row execute procedure set_updated_at();
drop trigger if exists deals_updated_at on deals;
create trigger deals_updated_at     before update on deals     for each row execute procedure set_updated_at();
drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at     before update on tasks     for each row execute procedure set_updated_at();
drop trigger if exists invoices_updated_at on invoices;
create trigger invoices_updated_at  before update on invoices  for each row execute procedure set_updated_at();
drop trigger if exists team_members_updated_at on team_members;
create trigger team_members_updated_at    before update on team_members    for each row execute procedure set_updated_at();
drop trigger if exists email_campaigns_updated_at on email_campaigns;
create trigger email_campaigns_updated_at before update on email_campaigns for each row execute procedure set_updated_at();
drop trigger if exists whatsapp_conversations_updated_at on whatsapp_conversations;
create trigger whatsapp_conversations_updated_at before update on whatsapp_conversations for each row execute procedure set_updated_at();
drop trigger if exists campaigns_updated_at on campaigns;
create trigger campaigns_updated_at before update on campaigns for each row execute procedure set_updated_at();
drop trigger if exists intent_scoring_rules_updated_at on intent_scoring_rules;
create trigger intent_scoring_rules_updated_at before update on intent_scoring_rules for each row execute procedure set_updated_at();
drop trigger if exists acquisition_settings_updated_at on acquisition_settings;
create trigger acquisition_settings_updated_at before update on acquisition_settings for each row execute procedure set_updated_at();

-- ── Phase 19 — Automation Core: DB-backed workflow runs + active toggle ────
-- lib/automation/store.ts's run-log/active-toggle was localStorage-only
-- before this (client-scoped, no-ops server-side). These two tables give
-- automation a real, cross-device, cross-restart source of truth; the
-- existing hardcoded trigger functions in lib/automation/engine.ts are
-- untouched — this is additive persistence underneath them, not a rewrite.
create table if not exists workflows (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,        -- matches WorkflowDef.id, e.g. "lead-nurture"
  name        text not null,
  trigger_key text not null default '',
  description text default '',
  active      boolean not null default true,
  steps       jsonb not null default '[]', -- string[] display labels, mirrors WorkflowDef.steps
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table workflows enable row level security;
drop policy if exists "Authenticated can access workflows" on workflows;
create policy "Authenticated can access workflows" on workflows for all using (auth.role() = 'authenticated');
drop trigger if exists workflows_updated_at on workflows;
create trigger workflows_updated_at before update on workflows for each row execute procedure set_updated_at();

create table if not exists workflow_runs (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid references workflows(id) on delete set null,
  workflow_key  text not null,   -- denormalized so a run survives a deleted workflow row
  workflow_name text not null,
  trigger_label text not null default '',
  entity        text not null default '',
  steps         jsonb not null default '[]', -- RunStep[]
  ok            boolean not null default true,
  ran_at        timestamptz default now()
);
alter table workflow_runs enable row level security;
drop policy if exists "Authenticated can access workflow_runs" on workflow_runs;
create policy "Authenticated can access workflow_runs" on workflow_runs for all using (auth.role() = 'authenticated');
create index if not exists workflow_runs_workflow_key_idx on workflow_runs (workflow_key);
create index if not exists workflow_runs_ran_at_idx on workflow_runs (ran_at desc);

-- ── Phase 20 — Visual Drag-Drop Workflow Builder ────────────────────────────
-- One graph per workflow key. nodes/edges are shaped 1:1 to @xyflow/react's
-- own model (see lib/automation/graph/types.ts) so the canvas reads/writes
-- this jsonb directly with no translation layer.
create table if not exists workflow_graphs (
  id           uuid primary key default gen_random_uuid(),
  workflow_key text not null unique,
  nodes        jsonb not null default '[]',
  edges        jsonb not null default '[]',
  version      int not null default 1,
  updated_at   timestamptz default now()
);
alter table workflow_graphs enable row level security;
drop policy if exists "Authenticated can access workflow_graphs" on workflow_graphs;
create policy "Authenticated can access workflow_graphs" on workflow_graphs for all using (auth.role() = 'authenticated');
drop trigger if exists workflow_graphs_updated_at on workflow_graphs;
create trigger workflow_graphs_updated_at before update on workflow_graphs for each row execute procedure set_updated_at();

-- ── Phase 21 — Unified Conversations + real inbound/outbound WhatsApp/SMS ──
-- Channel-agnostic inbox model. The pre-existing `whatsapp_conversations`
-- table (flat, no message-thread, no inbound support) is left untouched —
-- lib/actions/conversations.ts falls back to it as legacy/seed data, exactly
-- like every other lib/actions/*.ts file falls back to lib/data.ts.
create table if not exists conversations (
  id              uuid primary key default gen_random_uuid(),
  channel         text not null check (channel in ('whatsapp','sms','instagram','messenger','webchat')),
  external_thread_id text,
  contact_name    text default '',
  contact_phone   text default '',
  contact_email   text default '',
  lead_id         int references leads(id) on delete set null,
  customer_id     int references customers(id) on delete set null,
  last_message_at timestamptz default now(),
  unread_count    int not null default 0,
  status          text not null default 'open',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table conversations enable row level security;
drop policy if exists "Authenticated can access conversations" on conversations;
create policy "Authenticated can access conversations" on conversations for all using (auth.role() = 'authenticated');
create index if not exists conversations_channel_phone_idx on conversations (channel, contact_phone);
create index if not exists conversations_last_message_idx on conversations (last_message_at desc);
drop trigger if exists conversations_updated_at on conversations;
create trigger conversations_updated_at before update on conversations for each row execute procedure set_updated_at();

-- Phase 23: webchat is genuinely multi-tenant-embeddable (unlike WhatsApp/SMS,
-- which are KVL's own single numbers) — scope it by site, matching every
-- other Phase 17 table's "not null default 'kvl-default'" convention.
alter table conversations add column if not exists site_id text not null default 'kvl-default' references sites(site_id);
create index if not exists conversations_site_thread_idx on conversations (site_id, channel, external_thread_id);

create table if not exists messages (
  id                   uuid primary key default gen_random_uuid(),
  conversation_id      uuid not null references conversations(id) on delete cascade,
  direction            text not null check (direction in ('inbound','outbound')),
  body                 text default '',
  media_url            text,
  provider_message_id  text,
  status               text default 'sent',
  sent_by              text default '',
  created_at           timestamptz default now()
);
alter table messages enable row level security;
drop policy if exists "Authenticated can access messages" on messages;
create policy "Authenticated can access messages" on messages for all using (auth.role() = 'authenticated');
create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

-- ── Phase 24 — Funnel / Landing-Page Drag-Drop Builder ──────────────────────
-- `landing_pages` (Wave 2) was intentionally traffic-only (url_path/hits) —
-- gains the authoring fields a real builder needs, additively. Idempotent
-- `add column if not exists` for a table created before this phase.
alter table landing_pages add column if not exists name text default '';
alter table landing_pages add column if not exists status text not null default 'draft' check (status in ('draft','published','paused'));
alter table landing_pages add column if not exists template text default '';
alter table landing_pages add column if not exists blocks jsonb not null default '[]';
-- site_id was already added to landing_pages in Wave 10 above — not repeated here.
alter table landing_pages add column if not exists updated_at timestamptz default now();
drop trigger if exists landing_pages_updated_at on landing_pages;
create trigger landing_pages_updated_at before update on landing_pages for each row execute procedure set_updated_at();

create table if not exists funnels (
  id         uuid primary key default gen_random_uuid(),
  site_id    text not null default 'kvl-default' references sites(site_id),
  name       text not null,
  status     text not null default 'draft' check (status in ('draft','published','paused')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table funnels enable row level security;
drop policy if exists "Authenticated can access funnels" on funnels;
create policy "Authenticated can access funnels" on funnels for all using (auth.role() = 'authenticated');
drop trigger if exists funnels_updated_at on funnels;
create trigger funnels_updated_at before update on funnels for each row execute procedure set_updated_at();

create table if not exists funnel_steps (
  id          uuid primary key default gen_random_uuid(),
  funnel_id   uuid not null references funnels(id) on delete cascade,
  step_order  int not null default 0,
  page_id     bigint references landing_pages(id) on delete set null,
  step_type   text not null default 'landing' check (step_type in ('landing','upsell','downsell','thankyou'))
);
alter table funnel_steps enable row level security;
drop policy if exists "Authenticated can access funnel_steps" on funnel_steps;
create policy "Authenticated can access funnel_steps" on funnel_steps for all using (auth.role() = 'authenticated');
create index if not exists funnel_steps_funnel_idx on funnel_steps (funnel_id, step_order);

-- ── Phase 25 — Social Planner: real organic publish + scheduling ───────────
-- Wires components/crm/sections/Social.tsx's already-complete content-calendar
-- UI (previously 100% local useState, zero persistence) to a real table +
-- real Meta/LinkedIn organic-post publish (lib/social/publish.ts) — distinct
-- from lib/marketing/channels.ts, which only ever published PAID ad campaigns.
create table if not exists social_posts (
  id             uuid primary key default gen_random_uuid(),
  site_id        text not null default 'kvl-default' references sites(site_id),
  platform       text not null check (platform in ('facebook','instagram','linkedin','twitter')),
  post_type      text not null default 'text' check (post_type in ('image','video','text','story','reel')),
  content        text not null default '',
  media_urls     jsonb not null default '[]',
  scheduled_at   timestamptz,
  status         text not null default 'draft' check (status in ('draft','scheduled','published','failed')),
  external_post_id text,
  published_at   timestamptz,
  created_at     timestamptz default now()
);
alter table social_posts enable row level security;
drop policy if exists "Authenticated can access social_posts" on social_posts;
create policy "Authenticated can access social_posts" on social_posts for all using (auth.role() = 'authenticated');
create index if not exists social_posts_status_scheduled_idx on social_posts (status, scheduled_at);

-- ── Phase 26 — Reputation Management ────────────────────────────────────────
create table if not exists reviews (
  id               uuid primary key default gen_random_uuid(),
  site_id          text not null default 'kvl-default' references sites(site_id),
  source           text not null default 'google',
  external_review_id text,
  author_name      text default '',
  rating           int check (rating between 1 and 5),
  review_text      text default '',
  reply_text       text default '',
  reply_status     text not null default 'none' check (reply_status in ('none','draft','posted')),
  reviewed_at      timestamptz,
  created_at       timestamptz default now()
);
alter table reviews enable row level security;
drop policy if exists "Authenticated can access reviews" on reviews;
create policy "Authenticated can access reviews" on reviews for all using (auth.role() = 'authenticated');
create unique index if not exists reviews_source_external_idx on reviews (source, external_review_id) where external_review_id is not null;

create table if not exists review_requests (
  id          uuid primary key default gen_random_uuid(),
  customer_id int references customers(id) on delete set null,
  channel     text not null default 'whatsapp',
  sent_at     timestamptz default now(),
  status      text not null default 'sent'
);
alter table review_requests enable row level security;
drop policy if exists "Authenticated can access review_requests" on review_requests;
create policy "Authenticated can access review_requests" on review_requests for all using (auth.role() = 'authenticated');

-- ── Phase 27 — Commerce Suite I: real orders + Razorpay Orders/Payment Links ─
-- Rebuilds components/crm/sections/KVlCommerce.tsx (previously 972 lines,
-- fully mock) in place. IDs are uuid (not the "#VC-1042"-style display ids
-- the mock data uses) — the UI formats a short id for display but always
-- persists/updates against the real uuid.
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  site_id     text not null default 'kvl-default' references sites(site_id),
  name        text not null,
  sku         text default '',
  price       numeric not null default 0,
  stock       int not null default 0,
  reorder_level int not null default 0,
  category    text default '',
  description text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table products enable row level security;
drop policy if exists "Authenticated can access products" on products;
create policy "Authenticated can access products" on products for all using (auth.role() = 'authenticated');
drop trigger if exists products_updated_at on products;
create trigger products_updated_at before update on products for each row execute procedure set_updated_at();

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  site_id         text not null default 'kvl-default' references sites(site_id),
  customer_id     int references customers(id) on delete set null,
  order_number    text unique,
  customer_name   text default '',
  customer_email  text default '',
  status          text not null default 'Pending' check (status in ('Pending','Processing','Shipped','Delivered','Refunded')),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid','paid','failed','refunded')),
  payment_provider_ref text,
  payment_method  text default '',
  shipping_method text default '',
  amount          numeric not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table orders enable row level security;
drop policy if exists "Authenticated can access orders" on orders;
create policy "Authenticated can access orders" on orders for all using (auth.role() = 'authenticated');
drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders for each row execute procedure set_updated_at();

create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid references products(id) on delete set null,
  name_snapshot text not null default '',
  qty           int not null default 1,
  price         numeric not null default 0
);
alter table order_items enable row level security;
drop policy if exists "Authenticated can access order_items" on order_items;
create policy "Authenticated can access order_items" on order_items for all using (auth.role() = 'authenticated');
create index if not exists order_items_order_idx on order_items (order_id);

-- ── Phase 28 — Commerce Suite II: Gift Cards, Loyalty, Upsell/Downsell ──────
create table if not exists gift_cards (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  initial_value numeric not null,
  balance       numeric not null,
  customer_id   int references customers(id) on delete set null,
  status        text not null default 'active' check (status in ('active','redeemed','expired')),
  expires_at    timestamptz,
  created_at    timestamptz default now()
);
alter table gift_cards enable row level security;
drop policy if exists "Authenticated can access gift_cards" on gift_cards;
create policy "Authenticated can access gift_cards" on gift_cards for all using (auth.role() = 'authenticated');

-- Append-only ledger — balance is sum(points) per customer, computed on
-- read, not a mutable column. Gives free audit history with no extra work.
create table if not exists loyalty_points (
  id          uuid primary key default gen_random_uuid(),
  customer_id int not null references customers(id) on delete cascade,
  points      int not null,
  reason      text not null default '',
  order_id    uuid references orders(id) on delete set null,
  created_at  timestamptz default now()
);
alter table loyalty_points enable row level security;
drop policy if exists "Authenticated can access loyalty_points" on loyalty_points;
create policy "Authenticated can access loyalty_points" on loyalty_points for all using (auth.role() = 'authenticated');
create index if not exists loyalty_points_customer_idx on loyalty_points (customer_id);

-- ── Phase 29 — Membership & Courses ──────────────────────────────────────────
-- Gives KVlCommerce.tsx's existing course-shaped placeholder products
-- (CRS-AI-1, CRS-AI-2, SVC-CLD-1) a real backing model.
create table if not exists membership_tiers (
  id            uuid primary key default gen_random_uuid(),
  site_id       text not null default 'kvl-default' references sites(site_id),
  name          text not null,
  price         numeric not null default 0,
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly','yearly','one_time')),
  razorpay_plan_id text,
  created_at    timestamptz default now()
);
alter table membership_tiers enable row level security;
drop policy if exists "Authenticated can access membership_tiers" on membership_tiers;
create policy "Authenticated can access membership_tiers" on membership_tiers for all using (auth.role() = 'authenticated');

create table if not exists memberships (
  id            uuid primary key default gen_random_uuid(),
  customer_id   int not null references customers(id) on delete cascade,
  tier_id       uuid not null references membership_tiers(id) on delete cascade,
  status        text not null default 'active' check (status in ('active','past_due','cancelled')),
  razorpay_subscription_id text,
  current_period_end timestamptz,
  created_at    timestamptz default now()
);
alter table memberships enable row level security;
drop policy if exists "Authenticated can access memberships" on memberships;
create policy "Authenticated can access memberships" on memberships for all using (auth.role() = 'authenticated');
create index if not exists memberships_tier_idx on memberships (tier_id);
create unique index if not exists memberships_subscription_idx on memberships (razorpay_subscription_id) where razorpay_subscription_id is not null;

create table if not exists course_content (
  id          uuid primary key default gen_random_uuid(),
  tier_id     uuid references membership_tiers(id) on delete cascade, -- null = free/public content
  title       text not null,
  content_type text not null default 'video' check (content_type in ('video','document','link','text')),
  content_url text default '',
  drip_day    int not null default 0, -- unlocks N days after membership start; 0 = immediately
  sort_order  int not null default 0
);
alter table course_content enable row level security;
drop policy if exists "Authenticated can access course_content" on course_content;
create policy "Authenticated can access course_content" on course_content for all using (auth.role() = 'authenticated');
create index if not exists course_content_tier_idx on course_content (tier_id, sort_order);

-- ── Phase 30 — Affiliate Manager ─────────────────────────────────────────────
-- Reuses the existing acquisition-attribution stack rather than building
-- parallel tracking: an affiliate's link is just a normal `?utm_source=<code>`
-- link (lib/tracking/attribution.ts already parses utm_source with zero
-- changes needed), which lands on leads.source (Phase 17) once identified.
create table if not exists affiliates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text default '',
  referral_code   text not null unique,
  commission_rate numeric not null default 0.1,
  status          text not null default 'active' check (status in ('active','paused')),
  created_at      timestamptz default now()
);
alter table affiliates enable row level security;
drop policy if exists "Authenticated can access affiliates" on affiliates;
create policy "Authenticated can access affiliates" on affiliates for all using (auth.role() = 'authenticated');

create table if not exists affiliate_commissions (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  order_id     uuid references orders(id) on delete set null,
  amount       numeric not null default 0,
  status       text not null default 'pending' check (status in ('pending','paid_out')),
  paid_at      timestamptz,
  created_at   timestamptz default now()
);
alter table affiliate_commissions enable row level security;
drop policy if exists "Authenticated can access affiliate_commissions" on affiliate_commissions;
create policy "Authenticated can access affiliate_commissions" on affiliate_commissions for all using (auth.role() = 'authenticated');
create index if not exists affiliate_commissions_affiliate_idx on affiliate_commissions (affiliate_id);

-- ── Phase 31 — SaaS Mode: Tenant Billing & Self-Signup ──────────────────────
-- Mirrors lib/whitelabel/types.ts's Tenant interface field-for-field, plus
-- new billing columns. lib/whitelabel/store.ts (the one domain that was
-- localStorage-only, unlike every other) dual-writes here — same pattern as
-- Phase 19's automation store.
create table if not exists tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  brand_name    text not null default '',
  tagline       text default '',
  logo_url      text default '',
  primary_color text default '',
  domain        text default '',
  support_email text default '',
  smtp          jsonb,
  whatsapp      jsonb,
  plan          text default '',
  active        boolean not null default true,
  -- Billing (new in Phase 31)
  razorpay_customer_id     text,
  razorpay_subscription_id text,
  billing_status text not null default 'trialing' check (billing_status in ('trialing','active','past_due','cancelled')),
  trial_ends_at  timestamptz,
  created_at    timestamptz default now()
);
alter table tenants enable row level security;
drop policy if exists "Authenticated can access tenants" on tenants;
create policy "Authenticated can access tenants" on tenants for all using (auth.role() = 'authenticated');

-- Links a Supabase Auth user (Phase 18's real auth path) to a tenant —
-- nothing currently connects auth.users to tenants at all.
create table if not exists tenant_users (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'owner',
  primary key (tenant_id, user_id)
);
alter table tenant_users enable row level security;
drop policy if exists "Authenticated can access tenant_users" on tenant_users;
create policy "Authenticated can access tenant_users" on tenant_users for all using (auth.role() = 'authenticated');

-- ── Phase 33 — Birthday / Seasonal Auto-Campaigns ───────────────────────────
-- Additive only — extends existing lib/outreach/lib/marketing senders,
-- no new campaign engine. recurrence_rule is a simple field-reference string
-- ("customer.birthday" or "yearly:MM-DD"), not a full RRULE parser — the
-- minimum needed, matching this codebase's "hand-roll the minimum" convention.
alter table customers add column if not exists birthday date;
alter table campaigns add column if not exists recurrence_rule text;

-- ── Phase 37 — SMS DLT-Compliant Template Scaffolding ───────────────────────
-- India's TRAI DLT regime requires SMS content to match a pre-registered,
-- carrier-approved template. Registration itself (PAN/GST/Letter of
-- Authorization, a per-carrier DLT portal) is a pure external administrative
-- process this codebase cannot do — this table just gives the user somewhere
-- to record their approved entity/template IDs once they have them, so
-- lib/messaging/send.ts can look them up and log which approved template an
-- SMS was sent under (audit trail), matching the "ready to consume it the
-- moment you have it" convention used for every other external-approval gap.
create table if not exists sms_templates (
  id             uuid primary key default gen_random_uuid(),
  site_id        text not null default 'kvl-default' references sites(site_id),
  template_key   text not null,
  dlt_entity_id  text default '',
  dlt_template_id text default '',
  content        text not null default '',
  approved       boolean not null default false,
  created_at     timestamptz default now(),
  unique (site_id, template_key)
);
alter table sms_templates enable row level security;
drop policy if exists "Authenticated can access sms_templates" on sms_templates;
create policy "Authenticated can access sms_templates" on sms_templates for all using (auth.role() = 'authenticated');

-- ── Phase 36 — Affiliate Payout Automation (Razorpay Route/RazorpayX) ───────
-- Additive columns only. A payee needs a RazorpayX Contact + Fund Account
-- (UPI VPA) created before any real payout can be requested against them —
-- see lib/payments/razorpayRoute.ts. Real use still requires the user's own
-- Razorpay Route product approval + per-payee KYC (external, not code-
-- completable) — these columns just hold the result once that's done.
alter table affiliates add column if not exists payout_vpa text default '';
alter table affiliates add column if not exists razorpayx_contact_id text default '';
alter table affiliates add column if not exists razorpayx_fund_account_id text default '';
alter table affiliate_commissions add column if not exists razorpayx_payout_id text default '';

-- ── Phase 40 — Public API + Outbound Webhooks (Marketplace Foundation) ──────
-- This is the infrastructure a marketplace needs (scoped API keys, an
-- outbound webhook fan-out), NOT a claim of GHL's actual app-catalog scale —
-- that comes from years of external developer adoption, which no table can
-- manufacture. key_hash is a sha256 hex digest; the plaintext key is shown
-- to the user exactly once at creation time and never persisted anywhere.
create table if not exists api_keys (
  id            uuid primary key default gen_random_uuid(),
  site_id       text not null default 'kvl-default' references sites(site_id),
  name          text not null default '',
  key_hash      text not null unique,
  key_prefix    text not null,
  active        boolean not null default true,
  last_used_at  timestamptz,
  created_at    timestamptz default now()
);
alter table api_keys enable row level security;
drop policy if exists "Authenticated can access api_keys" on api_keys;
create policy "Authenticated can access api_keys" on api_keys for all using (auth.role() = 'authenticated');

create table if not exists webhooks (
  id             uuid primary key default gen_random_uuid(),
  site_id        text not null default 'kvl-default' references sites(site_id),
  endpoint_url   text not null,
  events         text[] not null default '{}',
  signing_secret text not null,
  active         boolean not null default true,
  created_at     timestamptz default now()
);
alter table webhooks enable row level security;
drop policy if exists "Authenticated can access webhooks" on webhooks;
create policy "Authenticated can access webhooks" on webhooks for all using (auth.role() = 'authenticated');

create table if not exists webhook_deliveries (
  id          uuid primary key default gen_random_uuid(),
  webhook_id  uuid not null references webhooks(id) on delete cascade,
  event       text not null,
  status_code int not null default 0,
  ok          boolean not null default false,
  created_at  timestamptz default now()
);
alter table webhook_deliveries enable row level security;
drop policy if exists "Authenticated can access webhook_deliveries" on webhook_deliveries;
create policy "Authenticated can access webhook_deliveries" on webhook_deliveries for all using (auth.role() = 'authenticated');
create index if not exists webhook_deliveries_webhook_idx on webhook_deliveries (webhook_id);

-- Gap-check fix (Phase 35) — social_posts.platform's check constraint still
-- listed 'youtube' after YouTube was removed from lib/social/publish.ts's
-- SocialPlatform type. Harmless (the app can no longer insert that value
-- anyway) but stale; tightened for consistency. Safe to re-run: no existing
-- row can violate the new check, since none was ever platform='youtube'
-- outside this same development cycle.
alter table social_posts drop constraint if exists social_posts_platform_check;
alter table social_posts add constraint social_posts_platform_check check (platform in ('facebook','instagram','linkedin','twitter'));

-- ── Phase 43 — Forms, Surveys & Quiz Builder ────────────────────────────────
-- General-purpose, separate from the Phase 24 funnel/page builder's fixed
-- FormBlock — a form/survey/quiz needs to exist on its own (linked/embedded
-- directly, matching GHL), not only nested inside a funnel page. One field
-- model covers all three "kinds": scoreWeight on a field's option is what
-- turns a plain survey into a scored quiz (see lib/forms/fields.ts).
create table if not exists forms (
  id             uuid primary key default gen_random_uuid(),
  site_id        text not null default 'kvl-default' references sites(site_id),
  slug           text not null,
  name           text not null default '',
  kind           text not null default 'form' check (kind in ('form','survey','quiz')),
  fields         jsonb not null default '[]',
  scoring_rules  jsonb not null default '[]',
  published      boolean not null default false,
  created_at     timestamptz default now(),
  unique (site_id, slug)
);
alter table forms enable row level security;
drop policy if exists "Authenticated can access forms" on forms;
create policy "Authenticated can access forms" on forms for all using (auth.role() = 'authenticated');

create table if not exists form_submissions (
  id             uuid primary key default gen_random_uuid(),
  form_id        uuid not null references forms(id) on delete cascade,
  answers        jsonb not null default '{}',
  computed_score int,
  contact_name   text default '',
  contact_email  text default '',
  contact_phone  text default '',
  processed      boolean not null default false,
  created_at     timestamptz default now()
);
alter table form_submissions enable row level security;
drop policy if exists "Authenticated can access form_submissions" on form_submissions;
create policy "Authenticated can access form_submissions" on form_submissions for all using (auth.role() = 'authenticated');
create index if not exists form_submissions_form_idx on form_submissions (form_id);

-- ── Phase 41 — Call Tracking (Dynamic Number Insertion) ─────────────────────
-- A pool of real (or mock) phone numbers, each mapped to a campaign, so an
-- inbound call's SOURCE is attributable — reuses the existing campaigns/
-- campaign_touchpoints attribution ledger (lib/attribution/*) instead of a
-- new attribution table. call_logs is a general call record, not just
-- missed calls — the existing Phase 22 missed-call-text-back flow is
-- untouched (still its own route/table-free flow).
create table if not exists tracking_numbers (
  id                 uuid primary key default gen_random_uuid(),
  site_id            text not null default 'kvl-default' references sites(site_id),
  phone_number       text not null unique,
  twilio_sid         text default '',
  campaign_id        bigint references campaigns(id) on delete set null,
  campaign_name      text not null default '',
  forward_to_number  text not null default '',
  created_at         timestamptz default now()
);
alter table tracking_numbers enable row level security;
drop policy if exists "Authenticated can access tracking_numbers" on tracking_numbers;
create policy "Authenticated can access tracking_numbers" on tracking_numbers for all using (auth.role() = 'authenticated');

create table if not exists call_logs (
  id                  uuid primary key default gen_random_uuid(),
  tracking_number_id  uuid references tracking_numbers(id) on delete set null,
  from_number         text not null default '',
  direction           text not null default 'inbound' check (direction in ('inbound','outbound')),
  status               text not null default 'ringing',
  duration_seconds    int,
  recording_url       text default '',
  campaign_id         bigint references campaigns(id) on delete set null,
  provider_call_sid   text default '',
  -- Phase 44 — Voice AI extends this same log rather than a parallel table.
  is_ai_call          boolean not null default false,
  ai_provider         text default '',
  ai_transcript       text default '',
  created_at          timestamptz default now()
);
alter table call_logs enable row level security;
drop policy if exists "Authenticated can access call_logs" on call_logs;
create policy "Authenticated can access call_logs" on call_logs for all using (auth.role() = 'authenticated');
create index if not exists call_logs_tracking_number_idx on call_logs (tracking_number_id);
create index if not exists call_logs_provider_sid_idx on call_logs (provider_call_sid);
