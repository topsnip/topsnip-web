-- ============================================================================
-- TopSnip v2 — Complete Database Schema
-- AI Learning Intelligence Platform
-- Created: 2026-03-15
-- ============================================================================
-- Run this in a FRESH Supabase project, OR use migration-v2.sql to migrate
-- from the old schema.
-- ============================================================================

-- ── Profiles (extends Supabase auth.users) ──────────────────────────────────

create table public.profiles (
  id                     uuid references auth.users(id) on delete cascade primary key,
  email                  text,
  plan                   text not null default 'free' check (plan in ('free', 'pro')),
  role                   text not null default 'general' check (role in ('general', 'developer', 'pm', 'cto')),
  interests              text[] not null default '{}',
  onboarding_complete    boolean not null default false,
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text check (subscription_status in ('active', 'canceled', 'past_due', null)),
  searches_today         integer not null default 0,
  searches_date          date not null default current_date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Restrictive UPDATE: users can only change role, interests, onboarding_complete.
-- Billing fields (plan, stripe_*, subscription_status) and search counters are
-- protected — only writable via service role (webhooks, RPCs).
create policy "Users can update their own safe fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and plan = (select p.plan from public.profiles p where p.id = auth.uid())
    and stripe_customer_id is not distinct from (select p.stripe_customer_id from public.profiles p where p.id = auth.uid())
    and stripe_subscription_id is not distinct from (select p.stripe_subscription_id from public.profiles p where p.id = auth.uid())
    and subscription_status is not distinct from (select p.subscription_status from public.profiles p where p.id = auth.uid())
    and searches_today = (select p.searches_today from public.profiles p where p.id = auth.uid())
    and searches_date = (select p.searches_date from public.profiles p where p.id = auth.uid())
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, onboarding_complete)
  values (new.id, new.email, false);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();


-- ── Sources (RSS feeds, APIs we monitor) ────────────────────────────────────

create table public.sources (
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

-- Sources are internal — no public access
alter table public.sources enable row level security;


-- ── Source Items (individual posts/articles ingested) ────────────────────────

create table public.source_items (
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

create index idx_source_items_source on public.source_items (source_id);
create index idx_source_items_ingested on public.source_items (ingested_at desc);

alter table public.source_items enable row level security;


-- ── Tags (topic categories) ─────────────────────────────────────────────────

create table public.tags (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique,
  label  text not null
);

alter table public.tags enable row level security;

-- Tags are readable by authenticated users (for interest picker)
create policy "Authenticated users can read tags"
  on public.tags for select
  using (auth.role() = 'authenticated');


-- ── Topics (AI topics detected from multiple sources) ───────────────────────

create table public.topics (
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

create index idx_topics_status on public.topics (status);
create index idx_topics_published on public.topics (published_at desc) where status = 'published';
create index idx_topics_trending on public.topics (trending_score desc) where status = 'published';
create index idx_topics_slug on public.topics (slug);

alter table public.topics enable row level security;

-- Published topics are readable by authenticated users
create policy "Authenticated users can read published topics"
  on public.topics for select
  using (auth.role() = 'authenticated' and status = 'published');


-- ── Topic Sources (join: which source items led to a topic) ─────────────────

create table public.topic_sources (
  topic_id       uuid not null references public.topics(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  primary key (topic_id, source_item_id)
);

alter table public.topic_sources enable row level security;


-- ── Topic Tags (join: topics ↔ tags) ────────────────────────────────────────

create table public.topic_tags (
  topic_id uuid not null references public.topics(id) on delete cascade,
  tag_id   uuid not null references public.tags(id) on delete cascade,
  primary key (topic_id, tag_id)
);

alter table public.topic_tags enable row level security;

create policy "Authenticated users can read topic tags"
  on public.topic_tags for select
  using (auth.role() = 'authenticated');


-- ── Topic Content (the core — one row per topic × role) ─────────────────────

create table public.topic_content (
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

create index idx_topic_content_topic on public.topic_content (topic_id);
create index idx_topic_content_role on public.topic_content (topic_id, role);

alter table public.topic_content enable row level security;

-- Users can read content for their role or 'general'
create policy "Users can read topic content for their role"
  on public.topic_content for select
  using (
    auth.role() = 'authenticated'
    and (
      role = 'general'
      or role = (select p.role from public.profiles p where p.id = auth.uid())
    )
  );


-- ── YouTube Recommendations (2-3 per topic content) ─────────────────────────

create table public.youtube_recommendations (
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

create index idx_yt_recs_content on public.youtube_recommendations (topic_content_id);

alter table public.youtube_recommendations enable row level security;

create policy "Authenticated users can read youtube recommendations"
  on public.youtube_recommendations for select
  using (auth.role() = 'authenticated');


-- ── User Reads (knowledge tracking — what they've read) ─────────────────────

create table public.user_reads (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  topic_id       uuid not null references public.topics(id) on delete cascade,
  read_at        timestamptz not null default now(),
  time_spent_sec integer,

  unique (user_id, topic_id)
);

create index idx_user_reads_user on public.user_reads (user_id, read_at desc);

alter table public.user_reads enable row level security;

create policy "Users can view their own reads"
  on public.user_reads for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reads"
  on public.user_reads for insert
  with check (auth.uid() = user_id);


-- ── User Searches ───────────────────────────────────────────────────────────

create table public.user_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  query      text not null,
  query_slug text not null,
  result     jsonb,
  topic_id   uuid references public.topics(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_user_searches_user on public.user_searches (user_id, created_at desc);

alter table public.user_searches enable row level security;

create policy "Users can view their own searches"
  on public.user_searches for select
  using (auth.uid() = user_id);

create policy "Users can insert their own searches"
  on public.user_searches for insert
  with check (auth.uid() = user_id);


-- ── Daily Digests (pre-computed feed per role per day) ───────────────────────

create table public.daily_digests (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  role         text not null check (role in ('general', 'developer', 'pm', 'cto')),
  topic_ids    uuid[] not null default '{}',
  is_quiet_day boolean not null default false,
  created_at   timestamptz not null default now(),

  unique (date, role)
);

create index idx_daily_digests_date on public.daily_digests (date desc);

alter table public.daily_digests enable row level security;

create policy "Authenticated users can read daily digests"
  on public.daily_digests for select
  using (auth.role() = 'authenticated');


-- ── Search Cache (deduplicates expensive pipeline runs) ──────────────────────

create table public.search_cache (
  id          uuid primary key default gen_random_uuid(),
  query       text not null,
  query_slug  text not null unique,
  result      jsonb not null,
  video_count integer not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '48 hours')
);

create index idx_search_cache_slug on public.search_cache (query_slug);
create index idx_search_cache_expires on public.search_cache (expires_at);

alter table public.search_cache enable row level security;
-- No public access — server-side only via service role


-- ── Anonymous Search Tracking (IP-based, 1/day) ─────────────────────────────

create table public.anonymous_searches (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null,
  query      text not null,
  topic_id   uuid references public.topics(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_anon_searches_ip on public.anonymous_searches (ip_hash, created_at desc);

alter table public.anonymous_searches enable row level security;
-- No public access — server-side only via service role


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ── Atomic search slot claim (prevents race conditions) ─────────────────────
-- Returns true if a slot was claimed, false if limit is hit.

create or replace function public.claim_search_slot(p_user_id uuid, p_limit integer)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_today date := current_date;
  v_updated integer;
begin
  update public.profiles
  set
    searches_today = case
      when searches_date < v_today then 1
      else searches_today + 1
    end,
    searches_date = v_today
  where id = p_user_id
    and (
      searches_date < v_today
      or searches_today < p_limit
    );

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- ── Reset daily search counts ───────────────────────────────────────────────

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

-- ── Get personalized feed for a user ────────────────────────────────────────
-- Returns topic IDs for the user's role on a given date.

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

-- ── Check anonymous search limit (3/day per IP hash) ────────────────────────

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

  return v_count < 3;
end;
$$;

-- ── Get user knowledge summary (Pro feature) ────────────────────────────────

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
        and t.id not in (select topic_id from public.user_reads where user_id = p_user_id)
      limit 5
    )
  ) into v_result;

  return v_result;
end;
$$;


-- ============================================================================
-- SEED DATA — Default Tags
-- ============================================================================

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


-- ============================================================================
-- SEED DATA — Default Sources (v1 monitoring stack)
-- ============================================================================

insert into public.sources (name, platform, url, check_interval_min) values
  -- Hacker News (free, no auth)
  ('Hacker News AI', 'hn', 'https://hn.algolia.com/api/v1/search?query=AI&tags=story', 30),

  -- Reddit (PRAW — free tier)
  ('r/MachineLearning', 'reddit', 'https://reddit.com/r/MachineLearning', 60),
  ('r/artificial', 'reddit', 'https://reddit.com/r/artificial', 60),
  ('r/LocalLLaMA', 'reddit', 'https://reddit.com/r/LocalLLaMA', 60),
  ('r/ChatGPT', 'reddit', 'https://reddit.com/r/ChatGPT', 120),

  -- Official blogs (RSS)
  ('OpenAI Blog', 'rss', 'https://openai.com/blog/rss.xml', 120),
  ('Anthropic Blog', 'rss', 'https://www.anthropic.com/rss.xml', 120),
  ('Google AI Blog', 'rss', 'https://blog.google/technology/ai/rss/', 120),
  ('Meta AI Blog', 'rss', 'https://ai.meta.com/blog/rss/', 120),
  ('Hugging Face Blog', 'rss', 'https://huggingface.co/blog/feed.xml', 120),
  ('DeepMind Blog', 'rss', 'https://deepmind.google/blog/rss.xml', 120),

  -- Newsletters (RSS via Substack/etc)
  ('TLDR AI', 'rss', 'https://tldr.tech/ai/rss', 360),
  ('The Batch (deeplearning.ai)', 'rss', 'https://www.deeplearning.ai/the-batch/feed/', 360),

  -- arXiv
  ('arXiv cs.AI', 'arxiv', 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=20', 360),
  ('arXiv cs.CL', 'arxiv', 'http://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=20', 360),

  -- GitHub trending
  ('GitHub Trending AI', 'github', 'https://api.github.com/search/repositories?q=topic:ai+topic:machine-learning&sort=stars&order=desc', 360),

  -- YouTube keyword search
  ('YouTube AI Trending', 'youtube', 'https://www.googleapis.com/youtube/v3/search', 240)
on conflict do nothing;
