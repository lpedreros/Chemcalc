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
  subscription_status text default 'inactive',  -- 'active' | 'inactive' | 'canceled'

  -- Trello integration (per-user board/list the estimator sends cards to)
  trello_api_key    text,
  trello_token      text,
  trello_board_id   text,
  trello_board_name text,
  trello_list_id    text,
  trello_list_name  text,

  -- Business info (used on printed/emailed estimates)
  biz_name     text,
  biz_tagline  text,
  biz_phone    text,
  biz_email    text,
  biz_website  text,
  biz_address  text,
  biz_prefix   text,
  biz_logo_url text,

  beta_tester boolean default false
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
  estimate_name   text default '',

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

-- ── 5. AFFILIATE_MATERIALS ───────────────────────────────────
-- Sitewide catalog of affiliate-linked materials/products. Read-only
-- to every visitor (logged in or not); only ever written from the
-- dashboard/admin side, not from any client-facing flow in this repo.
create table if not exists public.affiliate_materials (
  id          uuid primary key default gen_random_uuid(),
  aff_key     text unique,        -- stable key affiliate_links.js/estimator code looks up by
  name        text not null,
  url         text,
  section     text not null,      -- which materials-library section this belongs in
  tags        text[] default '{}',
  is_favorite boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.affiliate_materials enable row level security;

create policy "Anyone can read affiliate_materials"
  on public.affiliate_materials for select
  using (true);

-- ── 6. CUSTOM_MATERIALS ──────────────────────────────────────
-- Materials Library entries owned by one user: either a hand-entered
-- "custom" item, or a personal favorite/copy of a catalog
-- affiliate_materials row (source distinguishes the two).
create table if not exists public.custom_materials (
  id           uuid primary key default gen_random_uuid(),
  -- ON DELETE CASCADE assumed to match the profiles/estimates pattern --
  -- live introspection did not surface an on-delete behavior for this column.
  user_id      uuid references auth.users(id) on delete cascade,
  source       text not null check (source in ('custom', 'affiliate')),
  affiliate_id uuid references public.affiliate_materials(id),
  name         text,
  url          text,
  cost         numeric default 0,
  unit         text default 'each',
  markup       numeric default 40,
  notes        text,
  is_favorite  boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.custom_materials enable row level security;

create policy "Users can read their own custom materials"
  on public.custom_materials for select
  using (auth.uid() = user_id);

create policy "Users can insert their own custom materials"
  on public.custom_materials for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own custom materials"
  on public.custom_materials for update
  using (auth.uid() = user_id);

create policy "Users can delete their own custom materials"
  on public.custom_materials for delete
  using (auth.uid() = user_id);

-- ── 7. TASK_PRESETS ──────────────────────────────────────────
-- Sitewide library of reusable repair-task templates (scope steps,
-- material/paint/task line items) offered inside the Estimator.
-- Public read-only, same as affiliate_materials.
create table if not exists public.task_presets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  category      text not null,
  icon          text,
  description   text,
  scope_steps   text[] default '{}',
  material_rows jsonb default '[]',
  paint_rows    jsonb default '[]',
  task_rows     jsonb default '[]',
  sort_order    integer default 0,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.task_presets enable row level security;

create policy "Public can read task_presets"
  on public.task_presets for select
  using (true);

-- Auto-update updated_at on changes (same pattern as the estimates set_updated_at trigger)
create or replace function public.update_task_presets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.task_presets;
create trigger set_updated_at
  before update on public.task_presets
  for each row execute procedure public.update_task_presets_updated_at();

-- ── 8. USER_TASK_TEMPLATES ───────────────────────────────────
-- Task templates owned by one user, distinct from the sitewide
-- task_presets library above.
create table if not exists public.user_task_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id),
  name        text not null,
  scope_steps text,
  task_rows   jsonb,
  created_at  timestamptz default now()
);

alter table public.user_task_templates enable row level security;

create policy "Users manage own task templates"
  on public.user_task_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 9. CALCULATOR_EVENTS ─────────────────────────────────────
-- One row per calculator run, logged from every calculator page
-- (calc-tracker.js) for both anonymous and signed-in visitors.
create table if not exists public.calculator_events (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  calculator     text not null,       -- 'awlgrip' | 'clothcalc' | 'epifanes' | 'mekp' | ...
  inputs         jsonb default '{}',
  results        jsonb default '{}',
  user_id        uuid references auth.users(id),
  session_id     text,
  country        text,
  city           text,
  email_captured boolean default false
);

comment on column public.calculator_events.email_captured is
  'Analytics flag. UNRELIABLE for rows created before 2026-09-16: anonymous sessions could never flip this (no SELECT policy for anon meant the UPDATE silently matched zero rows, with no error). Only 3 pre-fix rows are true, all from authenticated sessions. Filter on created_at >= 2026-09-16 for meaningful capture rates. Fixed via the mark_email_captured() RPC.';

alter table public.calculator_events enable row level security;

create policy "Anyone can log a calculation"
  on public.calculator_events for insert
  with check (true);

create policy "Users can read their own events"
  on public.calculator_events for select
  using (auth.uid() = user_id);

-- Deliberately loose (using true / with check true) -- superseded in
-- practice by the mark_email_captured() RPC below, which is the only
-- code path that actually flips email_captured. Tightening this is a
-- separate decision, not part of this doc-only pass.
create policy "Users can update email_captured on their own session"
  on public.calculator_events for update
  using (true)
  with check (true);

-- ── 10. EMAIL-CAPTURE RPC ────────────────────────────────────
-- Called by email-results.js right after a results email actually
-- sends, so it can mark the row without needing an UPDATE policy
-- scoped to anonymous sessions (see the deliberately-loose policy
-- above, and the column comment on calculator_events.email_captured).
create or replace function public.mark_email_captured(p_session_id text)
returns integer as $$
declare
  v_id uuid;
begin
  if p_session_id is null or p_session_id = '' then
    return 0;
  end if;

  select id into v_id
  from public.calculator_events
  where session_id = p_session_id
  order by created_at desc
  limit 1;

  if v_id is null then
    return 0;
  end if;

  update public.calculator_events
  set email_captured = true
  where id = v_id;

  return 1;
end;
$$ language plpgsql security definer set search_path = public;

-- ── 11. TIPS ──────────────────────────────────────────────────
-- Pro-tip copy shown in help modals. RLS enabled with NO policies --
-- intentionally locked down to every direct client query; the only
-- supported read path is the get_random_tip() RPC below (SECURITY
-- DEFINER, so it can read this table on behalf of the caller).
create table if not exists public.tips (
  id         serial primary key,  -- live default is nextval('tips_id_seq'), same thing
  category   text not null,
  tip        text not null,
  active     boolean default true,
  created_at timestamptz default now()
);

alter table public.tips enable row level security;
-- No policies by design -- see comment above.

-- ── 12. TIP_CATEGORY_CALCULATORS ─────────────────────────────
-- Maps a calculator id to the tips.category it should draw from.
-- Same lockout as tips: RLS enabled, zero policies, reachable only
-- via get_random_tip() below.
create table if not exists public.tip_category_calculators (
  category   text,
  calculator text,
  primary key (category, calculator)
);

alter table public.tip_category_calculators enable row level security;
-- No policies by design -- see comment above.

-- ── 13. RANDOM TIP RPC ───────────────────────────────────────
-- Looks up which tip category a calculator maps to, then returns one
-- random active tip from that category. Falls back to the 'General
-- Pro Tips' category when the calculator has no mapping.
create or replace function public.get_random_tip(p_calculator text)
returns text as $$
declare
  v_category text;
  v_tip text;
begin
  select category into v_category
  from public.tip_category_calculators
  where calculator = p_calculator
  limit 1;

  if v_category is null then
    v_category := 'General Pro Tips';
  end if;

  select tip into v_tip
  from public.tips
  where category = v_category
    and active = true
  order by random()
  limit 1;

  return v_tip;
end;
$$ language plpgsql security definer set search_path = public;

-- ── 14. AFFILIATE_CLICKS ─────────────────────────────────────
-- Click-through tracking for affiliate product links
-- (affiliate-click-tracker.js), anonymous or signed-in.
create table if not exists public.affiliate_clicks (
  id           uuid primary key default gen_random_uuid(),
  product_name text not null,
  product_url  text not null,
  page         text not null,
  session_id   text,
  user_id      uuid references auth.users(id),
  created_at   timestamptz default now()
);

alter table public.affiliate_clicks enable row level security;

create policy "Allow anonymous inserts"
  on public.affiliate_clicks for insert
  with check (true);

create policy "Authenticated users can read"
  on public.affiliate_clicks for select
  using (auth.uid() is not null);

-- ============================================================
-- DONE. After running this:
-- 1. Go to Authentication → Providers → enable Email
-- 2. Go to Authentication → URL Configuration → set Site URL to https://chemcalc.co
-- 3. Add https://chemcalc.co/estimate.html to Redirect URLs
-- ============================================================
