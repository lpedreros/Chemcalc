-- ============================================================
-- ChemCalc Estimator — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
-- One row per user. Created automatically on signup via trigger.
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  created_at      timestamptz default now(),
  email           text,
  full_name       text,
  company_name    text,
  estimate_prefix text default 'EST',   -- e.g. TE, DMG
  logo_url        text,                  -- URL to uploaded logo (premium)
  tier            text default 'free',   -- 'free' | 'pro'
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'inactive'  -- 'active' | 'inactive' | 'canceled'
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── 2. AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
-- Trigger: when a new user signs up, insert a row into profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it already exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 3. ESTIMATES ─────────────────────────────────────────────
create table if not exists public.estimates (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  user_id         uuid references auth.users(id) on delete cascade,
  company_name    text,
  estimate_number text,
  valid_until     date,

  -- Customer info
  customer_first  text,
  customer_last   text,
  customer_phone  text,
  customer_email  text,
  boat_name       text,
  boat_make       text,
  boat_model      text,
  hin             text,

  -- Financials
  materials_total numeric(10,2) default 0,
  paint_total     numeric(10,2) default 0,
  labor_total     numeric(10,2) default 0,
  grand_total     numeric(10,2) default 0,
  hourly_rate     numeric(10,2) default 100,

  -- Full estimate data as JSON (line items, repair tasks, etc.)
  estimate_data   jsonb,

  -- Status
  status          text default 'draft',  -- 'draft' | 'sent' | 'accepted' | 'declined'
  notes           text,

  -- Trello integration
  trello_card_id  text,
  trello_synced_at timestamptz
);

-- Enable Row Level Security
alter table public.estimates enable row level security;

-- Users can only access their own estimates
create policy "Users can view own estimates"
  on public.estimates for select
  using (auth.uid() = user_id);

create policy "Users can insert own estimates"
  on public.estimates for insert
  with check
 (auth.uid() = user_id);

create policy "Users can update own estimates"
  on public.estimates for update
  using (auth.uid() = user_id);

create policy "Users can delete own estimates"
  on public.estimates for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on changes
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.estimates;
create trigger set_updated_at
  before update on public.estimates
  for each row execute procedure public.update_updated_at();

-- ── 4. USEFUL VIEWS ──────────────────────────────────────────
-- Summary view for listing estimates (no full JSON payload)
create or replace view public.estimate_list as
  select
    e.id,
    e.created_at,
    e.estimate_number,
    e.customer_first || ' ' || e.customer_last as customer_name,
    e.boat_make || ' ' || e.boat_model as boat,
    e.grand_total,
    e.status,
    e.valid_until,
    e.trello_card_id
  from public.estimates e
  where e.user_id = auth.uid()
  order by e.created_at desc;

-- ============================================================
-- DONE. After running this:
-- 1. Go to Authentication → Providers → enable Email
-- 2. Go to Authentication → URL Configuration → set Site URL to https://chemcalc.co
-- 3. Add https://chemcalc.co/estimate.html to Redirect URLs
-- ============================================================
