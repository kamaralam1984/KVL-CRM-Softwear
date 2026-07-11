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
