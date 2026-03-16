-- ============================================================================
-- TopSnip v2 Migration
-- Migrates from old schema (transcript-based) to new schema (learning platform)
-- Created: 2026-03-15
-- ============================================================================
--
-- BEFORE RUNNING:
-- 1. Back up your database (Supabase Dashboard → Settings → Database → Backups)
-- 2. Run in a transaction so you can rollback on error
-- 3. Test on a staging project first
--
-- WHAT THIS DOES:
-- ✅ Extends profiles with role, interests, onboarding_complete
-- ✅ Creates all new tables (sources, topics, topic_content, etc.)
-- ✅ Migrates search_history → user_searches
-- ✅ Drops search_cache (replaced by topics + topic_content)
-- ✅ Drops old search_history (after migration)
-- ✅ Keeps claim_search_slot() and reset_daily_search_counts()
-- ✅ Preserves all user accounts and billing data
-- ============================================================================

begin;

-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1: Extend profiles table
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists role text not null default 'general',
  add column if not exists interests text[] not null default '{}',
  add column if not exists onboarding_complete boolean not null default false;

-- Add check constraint for role
alter table public.profiles
  add constraint profiles_role_check check (role in ('general', 'developer', 'pm', 'cto'));

-- Add check constraint for plan (if not already constrained)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('free', 'pro'));
  end if;
end $$;

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create trigger only if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'profiles_updated_at'
  ) then
    create trigger profiles_updated_at
      before update on public.profiles
      for each row execute procedure public.update_updated_at();
  end if;
end $$;

-- Update handle_new_user to set onboarding_complete = false
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, onboarding_complete)
  values (new.id, new.email, false);
  return new;
end;
$$;

-- Mark all existing users as onboarding incomplete (they'll see onboarding on next login)
-- Unless you want to skip onboarding for existing users, change to true:
update public.profiles set onboarding_complete = false where onboarding_complete = false;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2: Create new tables
-- ════════════════════════════════════════════════════════════════════════════

-- ── Sources ─────────────────────────────────────────────────────────────────

create table if not exists public.sources (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  platform            text not null check (platform in ('rss', 'hn', 'reddit', 'youtube', 'arxiv', 'github')),
  url                 text not null,
  check_interval_min  integer not null default 120,
  last_checked_at     timestamptz,
  is_active           boolean not null default true,
  health_status       text not null default 'healthy' check (health_status in ('healthy', 'degraded', 'down')),
  created_at          timestamptz not null default now()
);

alter table public.sources enable row level security;

-- ── Source Items ─────────────────────────────────────────────────────────────

create table if not exists public.source_items (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid not null references public.sources(id) on delete cascade,
  external_id       text not null,
  title             text not null,
  url               text,
  content_snippet   text,
  engagement_score  integer not null default 0,
  published_at      timestamptz,
  ingested_at       timestamptz not null default now(),
  unique (source_id, external_id)
);

create index if not exists idx_source_items_source on public.source_items (source_id);
create index if not exists idx_source_items_ingested on public.source_items (ingested_at desc);
alter table public.source_items enable row level security;

-- ── Tags ────────────────────────────────────────────────────────────────────

create table if not exists public.tags (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique,
  label  text not null
);

alter table public.tags enable row level security;

create policy "Authenticated users can read tags"
  on public.tags for select
  using (auth.role() = 'authenticated');

-- ── Topics ──────────────────────────────────────────────────────────────────

create table if not exists public.topics (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  status            text not null default 'detected'
                    check (status in ('detected', 'generating', 'published', 'archived')),
  trending_score    float not null default 0,
  platform_count    integer not null default 1,
  first_detected_at timestamptz not null default now(),
  published_at      timestamptz,
  is_breaking       boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists idx_topics_status on public.topics (status);
create index if not exists idx_topics_published on public.topics (published_at desc) where status = 'published';
create index if not exists idx_topics_trending on public.topics (trending_score desc) where status = 'published';
create index if not exists idx_topics_slug on public.topics (slug);
alter table public.topics enable row level security;

create policy "Authenticated users can read published topics"
  on public.topics for select
  using (auth.role() = 'authenticated' and status = 'published');

-- ── Topic Sources ───────────────────────────────────────────────────────────

create table if not exists public.topic_sources (
  topic_id       uuid not null references public.topics(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  primary key (topic_id, source_item_id)
);

alter table public.topic_sources enable row level security;

-- ── Topic Tags ──────────────────────────────────────────────────────────────

create table if not exists public.topic_tags (
  topic_id uuid not null references public.topics(id) on delete cascade,
  tag_id   uuid not null references public.tags(id) on delete cascade,
  primary key (topic_id, tag_id)
);

alter table public.topic_tags enable row level security;

create policy "Authenticated users can read topic tags"
  on public.topic_tags for select
  using (auth.role() = 'authenticated');

-- ── Topic Content ───────────────────────────────────────────────────────────

create table if not exists public.topic_content (
  id              uuid primary key default gen_random_uuid(),
  topic_id        uuid not null references public.topics(id) on delete cascade,
  role            text not null check (role in ('general', 'developer', 'pm', 'cto')),
  tldr            text not null,
  what_happened   text not null,
  so_what         text not null,
  now_what        text not null,
  sources_json    jsonb not null default '[]',
  quality_score   float,
  generated_by    text,
  generated_at    timestamptz not null default now(),
  last_updated_at timestamptz,
  changelog       text,
  created_at      timestamptz not null default now(),
  unique (topic_id, role)
);

create index if not exists idx_topic_content_topic on public.topic_content (topic_id);
create index if not exists idx_topic_content_role on public.topic_content (topic_id, role);
alter table public.topic_content enable row level security;

create policy "Users can read topic content for their role"
  on public.topic_content for select
  using (
    auth.role() = 'authenticated'
    and (
      role = 'general'
      or role = (select p.role from public.profiles p where p.id = auth.uid())
    )
  );

-- ── YouTube Recommendations ─────────────────────────────────────────────────

create table if not exists public.youtube_recommendations (
  id                uuid primary key default gen_random_uuid(),
  topic_content_id  uuid not null references public.topic_content(id) on delete cascade,
  video_id          text not null,
  title             text not null,
  channel_name      text not null,
  thumbnail_url     text,
  duration          text,
  reason            text,
  position          integer not null default 1
);

create index if not exists idx_yt_recs_content on public.youtube_recommendations (topic_content_id);
alter table public.youtube_recommendations enable row level security;

create policy "Authenticated users can read youtube recommendations"
  on public.youtube_recommendations for select
  using (auth.role() = 'authenticated');

-- ── User Reads ──────────────────────────────────────────────────────────────

create table if not exists public.user_reads (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  topic_id       uuid not null references public.topics(id) on delete cascade,
  read_at        timestamptz not null default now(),
  time_spent_sec integer,
  unique (user_id, topic_id)
);

create index if not exists idx_user_reads_user on public.user_reads (user_id, read_at desc);
alter table public.user_reads enable row level security;

create policy "Users can view their own reads"
  on public.user_reads for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reads"
  on public.user_reads for insert
  with check (auth.uid() = user_id);

-- ── User Searches (replaces search_history) ─────────────────────────────────

create table if not exists public.user_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  query      text not null,
  topic_id   uuid references public.topics(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_searches_user on public.user_searches (user_id, created_at desc);
alter table public.user_searches enable row level security;

create policy "Users can view their own searches"
  on public.user_searches for select
  using (auth.uid() = user_id);

create policy "Users can insert their own searches"
  on public.user_searches for insert
  with check (auth.uid() = user_id);

-- ── Daily Digests ───────────────────────────────────────────────────────────

create table if not exists public.daily_digests (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  role         text not null check (role in ('general', 'developer', 'pm', 'cto')),
  topic_ids    uuid[] not null default '{}',
  is_quiet_day boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (date, role)
);

create index if not exists idx_daily_digests_date on public.daily_digests (date desc);
alter table public.daily_digests enable row level security;

create policy "Authenticated users can read daily digests"
  on public.daily_digests for select
  using (auth.role() = 'authenticated');

-- ── Anonymous Searches ──────────────────────────────────────────────────────

create table if not exists public.anonymous_searches (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null,
  query      text not null,
  topic_id   uuid references public.topics(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_anon_searches_ip on public.anonymous_searches (ip_hash, created_at desc);
alter table public.anonymous_searches enable row level security;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: New functions
-- ════════════════════════════════════════════════════════════════════════════

-- Get personalized feed for a user
create or replace function public.get_user_feed(p_user_id uuid, p_date date default current_date)
returns table (topic_id uuid, is_quiet_day boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    v_role := 'general';
  end if;

  return query
    select unnest(dd.topic_ids) as topic_id, dd.is_quiet_day
    from public.daily_digests dd
    where dd.date = p_date and dd.role = v_role;
end;
$$;

-- Check anonymous search limit (1/day per IP hash)
create or replace function public.check_anonymous_limit(p_ip_hash text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.anonymous_searches
  where ip_hash = p_ip_hash
    and created_at > current_date::timestamptz;
  return v_count < 1;
end;
$$;

-- Get user knowledge summary (Pro feature)
create or replace function public.get_knowledge_summary(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'topics_read', (select count(*) from public.user_reads where user_id = p_user_id),
    'total_time_sec', (select coalesce(sum(time_spent_sec), 0) from public.user_reads where user_id = p_user_id),
    'tags_covered', (
      select coalesce(jsonb_agg(distinct t.slug), '[]'::jsonb)
      from public.user_reads ur
      join public.topic_tags tt on tt.topic_id = ur.topic_id
      join public.tags t on t.id = tt.tag_id
      where ur.user_id = p_user_id
    ),
    'recent_reads', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'topic_id', ur.topic_id,
        'title', tp.title,
        'read_at', ur.read_at
      ) order by ur.read_at desc), '[]'::jsonb)
      from (
        select * from public.user_reads where user_id = p_user_id order by read_at desc limit 10
      ) ur
      join public.topics tp on tp.id = ur.topic_id
    ),
    'unread_important', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'topic_id', t.id,
        'title', t.title,
        'trending_score', t.trending_score
      ) order by t.trending_score desc), '[]'::jsonb)
      from public.topics t
      where t.status = 'published'
        and t.trending_score > 50
        and t.id not in (select ur2.topic_id from public.user_reads ur2 where ur2.user_id = p_user_id)
      limit 5
    )
  ) into v_result;

  return v_result;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: Migrate data from old tables
-- ════════════════════════════════════════════════════════════════════════════

-- Migrate search_history → user_searches (preserve user search data)
insert into public.user_searches (user_id, query, created_at)
select user_id, query, created_at
from public.search_history
where user_id is not null
on conflict do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: Drop old tables
-- ════════════════════════════════════════════════════════════════════════════

-- Drop old search_history (data migrated to user_searches)
drop table if exists public.search_history cascade;

-- Drop old search_cache (replaced by topics + topic_content)
drop table if exists public.search_cache cascade;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 6: Seed data
-- ════════════════════════════════════════════════════════════════════════════

-- Default tags
insert into public.tags (slug, label) values
  ('llms', 'LLMs & Foundation Models'),
  ('agents', 'AI Agents & Automation'),
  ('computer-vision', 'Computer Vision'),
  ('ai-healthcare', 'AI in Healthcare'),
  ('ai-finance', 'AI in Finance'),
  ('ai-education', 'AI in Education'),
  ('open-source', 'Open Source AI'),
  ('ethics-policy', 'AI Ethics & Policy'),
  ('dev-tools', 'Developer Tools & IDEs'),
  ('hardware', 'AI Hardware & Infrastructure'),
  ('robotics', 'Robotics'),
  ('nlp', 'Natural Language Processing'),
  ('generative-ai', 'Generative AI'),
  ('ml-ops', 'MLOps & Deployment')
on conflict (slug) do nothing;

-- Default sources (v1 monitoring stack)
insert into public.sources (name, platform, url, check_interval_min) values
  ('Hacker News AI', 'hn', 'https://hn.algolia.com/api/v1/search?query=AI&tags=story', 30),
  ('r/MachineLearning', 'reddit', 'https://reddit.com/r/MachineLearning', 60),
  ('r/artificial', 'reddit', 'https://reddit.com/r/artificial', 60),
  ('r/LocalLLaMA', 'reddit', 'https://reddit.com/r/LocalLLaMA', 60),
  ('r/ChatGPT', 'reddit', 'https://reddit.com/r/ChatGPT', 120),
  ('OpenAI Blog', 'rss', 'https://openai.com/blog/rss.xml', 120),
  ('Anthropic Blog', 'rss', 'https://www.anthropic.com/rss.xml', 120),
  ('Google AI Blog', 'rss', 'https://blog.google/technology/ai/rss/', 120),
  ('Meta AI Blog', 'rss', 'https://ai.meta.com/blog/rss/', 120),
  ('Hugging Face Blog', 'rss', 'https://huggingface.co/blog/feed.xml', 120),
  ('DeepMind Blog', 'rss', 'https://deepmind.google/blog/rss.xml', 120),
  ('TLDR AI', 'rss', 'https://tldr.tech/ai/rss', 360),
  ('The Batch (deeplearning.ai)', 'rss', 'https://www.deeplearning.ai/the-batch/feed/', 360),
  ('arXiv cs.AI', 'arxiv', 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=20', 360),
  ('arXiv cs.CL', 'arxiv', 'http://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=20', 360),
  ('GitHub Trending AI', 'github', 'https://api.github.com/search/repositories?q=topic:ai+topic:machine-learning&sort=stars&order=desc', 360),
  ('YouTube AI Trending', 'youtube', 'https://www.googleapis.com/youtube/v3/search', 240)
on conflict do nothing;


commit;

-- ════════════════════════════════════════════════════════════════════════════
-- POST-MIGRATION VERIFICATION
-- ════════════════════════════════════════════════════════════════════════════
-- Run these manually after migration to verify:
--
-- 1. Check profiles still have billing data:
--    SELECT count(*) FROM profiles WHERE stripe_customer_id IS NOT NULL;
--
-- 2. Check new columns exist:
--    SELECT role, interests, onboarding_complete FROM profiles LIMIT 5;
--
-- 3. Check search data migrated:
--    SELECT count(*) FROM user_searches;
--
-- 4. Check old tables are gone:
--    SELECT count(*) FROM search_cache;  -- should error
--    SELECT count(*) FROM search_history;  -- should error
--
-- 5. Check tags seeded:
--    SELECT count(*) FROM tags;  -- should be 14
--
-- 6. Check sources seeded:
--    SELECT count(*) FROM sources;  -- should be 17
-- ════════════════════════════════════════════════════════════════════════════
