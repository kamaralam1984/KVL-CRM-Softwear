-- Run this in your Supabase SQL editor to set up the CRM schema

-- Enable RLS
alter database postgres set "app.jwt_secret" to 'your-jwt-secret';

-- ── Profiles (extends auth.users) ──────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  role       text not null default 'Member',
  avatar     text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile"   on profiles for select using (auth.uid() = id);
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
create policy "Authenticated users can CRUD leads" on leads for all using (auth.role() = 'authenticated');

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
create policy "Authenticated users can CRUD customers" on customers for all using (auth.role() = 'authenticated');

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
create policy "Authenticated users can CRUD tasks" on tasks for all using (auth.role() = 'authenticated');

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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table whatsapp_conversations enable row level security;
create policy "Authenticated users can CRUD whatsapp_conversations" on whatsapp_conversations for all using (auth.role() = 'authenticated');

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
create policy "Authenticated users can CRUD intent_scoring_rules" on intent_scoring_rules for all using (auth.role() = 'authenticated');

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
on conflict (rule_key) do nothing;

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
create policy "Authenticated users can CRUD acquisition_settings" on acquisition_settings for all using (auth.role() = 'authenticated');

insert into acquisition_settings (setting_key, value) values
  ('tracking_enabled', 'true'),
  ('default_consent_mode', 'granted'),
  ('retention_days', '365'),
  ('missed_call_number', '')
on conflict (setting_key) do nothing;

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
alter table campaigns add constraint campaigns_site_campaign_key_unique unique (site_id, campaign_key);
drop index if exists campaigns_campaign_key_idx;
create index if not exists campaigns_site_campaign_key_idx on campaigns (site_id, campaign_key);

alter table landing_pages drop constraint if exists landing_pages_url_path_key;
alter table landing_pages add constraint landing_pages_site_url_path_unique unique (site_id, url_path);
drop index if exists landing_pages_url_path_idx;
create index if not exists landing_pages_site_url_path_idx on landing_pages (site_id, url_path);

alter table intent_scoring_rules drop constraint if exists intent_scoring_rules_rule_key_key;
alter table intent_scoring_rules add constraint intent_scoring_rules_site_rule_key_unique unique (site_id, rule_key);

alter table acquisition_settings drop constraint if exists acquisition_settings_setting_key_key;
alter table acquisition_settings add constraint acquisition_settings_site_setting_key_unique unique (site_id, setting_key);

-- ── updated_at auto-trigger ────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger leads_updated_at     before update on leads     for each row execute procedure set_updated_at();
create trigger customers_updated_at before update on customers for each row execute procedure set_updated_at();
create trigger deals_updated_at     before update on deals     for each row execute procedure set_updated_at();
create trigger tasks_updated_at     before update on tasks     for each row execute procedure set_updated_at();
create trigger invoices_updated_at  before update on invoices  for each row execute procedure set_updated_at();
create trigger team_members_updated_at    before update on team_members    for each row execute procedure set_updated_at();
create trigger email_campaigns_updated_at before update on email_campaigns for each row execute procedure set_updated_at();
create trigger whatsapp_conversations_updated_at before update on whatsapp_conversations for each row execute procedure set_updated_at();
create trigger campaigns_updated_at before update on campaigns for each row execute procedure set_updated_at();
create trigger intent_scoring_rules_updated_at before update on intent_scoring_rules for each row execute procedure set_updated_at();
create trigger acquisition_settings_updated_at before update on acquisition_settings for each row execute procedure set_updated_at();
