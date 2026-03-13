-- Topsnip Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- ── Users (extends Supabase auth.users) ────────────────────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text,
  plan          text not null default 'free',  -- 'free' | 'pro'
  stripe_customer_id  text,
  stripe_subscription_id text,
  subscription_status  text,  -- 'active' | 'canceled' | 'past_due'
  searches_today  integer not null default 0,
  searches_date   date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile, but sensitive fields (plan, Stripe, subscription)
-- are protected server-side: the webhook uses a service-role client that bypasses RLS.
-- Keeping the policy simple avoids unnecessary self-referencing subqueries.
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Search cache ────────────────────────────────────────────────────────────
-- Caches YouTube search results per topic to save API quota
create table public.search_cache (
  id            uuid primary key default gen_random_uuid(),
  query         text not null,
  query_slug    text not null unique,
  result        jsonb not null,
  video_count   integer,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '48 hours')
);

create index on public.search_cache (query_slug);
create index on public.search_cache (expires_at);

alter table public.search_cache enable row level security;

-- Cache is readable by anyone (public search results)
create policy "Search cache is publicly readable"
  on public.search_cache for select
  using (true);


-- ── Search history ──────────────────────────────────────────────────────────
create table public.search_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  query         text not null,
  query_slug    text not null,
  result        jsonb,
  created_at    timestamptz not null default now()
);

create index on public.search_history (user_id, created_at desc);

alter table public.search_history enable row level security;

create policy "Users can view their own search history"
  on public.search_history for select
  using (auth.uid() = user_id);

create policy "Users can insert their own search history"
  on public.search_history for insert
  with check (auth.uid() = user_id);


-- ── Atomic search slot claim (prevents race conditions) ─────────────────────
-- Returns true if a slot was claimed, false if limit is hit.
create or replace function public.claim_search_slot(p_user_id uuid, p_limit integer)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_today date := current_date;
  v_updated integer;
begin
  -- Reset counter if it's a new day, then try to claim a slot atomically
  update public.profiles
  set
    searches_today = case
      when searches_date < v_today then 1    -- new day: reset to 1 (claimed)
      else searches_today + 1                -- same day: increment
    end,
    searches_date = v_today
  where id = p_user_id
    and (
      searches_date < v_today               -- new day always allows
      or searches_today < p_limit           -- same day under limit
    );

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- ── Search count reset function ─────────────────────────────────────────────
-- Resets daily search count for all users each day
-- Schedule via Supabase cron (pg_cron) or external cron
create or replace function public.reset_daily_search_counts()
returns void language plpgsql security definer
as $$
begin
  update public.profiles
  set searches_today = 0,
      searches_date = current_date
  where searches_date < current_date;
end;
$$;
