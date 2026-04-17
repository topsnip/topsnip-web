-- migration-v4-ai-sources.sql
-- TopSnip: expand RSS coverage to full official AI source set
--
-- What this does:
--   1. Adds a unique constraint on (platform, url) so future source inserts
--      can use real ON CONFLICT dedup (current migration-v3 relied on PK conflict
--      which never fires for generated UUIDs).
--   2. Fixes the broken Anthropic RSS URL (www.anthropic.com/rss.xml returns 404
--      as of 2026-04; Anthropic exposes no public native RSS).
--   3. Adds 20 new verified RSS sources covering official AI labs, research,
--      tooling, newsletters, and Google News RSS proxies for labs without
--      native feeds (Mistral, xAI, Perplexity, ElevenLabs, Cohere, Anthropic).
--
-- Run in Supabase SQL Editor.

-- ══════════════════════════════════════════════════════════════════
-- 0. Unique constraint for clean upserts
-- ══════════════════════════════════════════════════════════════════

-- Drop duplicate rows first (defensive: v3 migration allowed duplicates)
DELETE FROM sources a
USING sources b
WHERE a.ctid < b.ctid
  AND a.platform = b.platform
  AND a.url = b.url;

ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_platform_url_unique;

ALTER TABLE sources
  ADD CONSTRAINT sources_platform_url_unique UNIQUE (platform, url);

-- ══════════════════════════════════════════════════════════════════
-- 1. Fix broken Anthropic feed
-- ══════════════════════════════════════════════════════════════════

-- The existing 'Anthropic Blog' rows point at URLs that return 404.
-- Delete both old variants; re-add as a Google News RSS proxy below.
DELETE FROM sources
WHERE platform = 'rss'
  AND url IN (
    'https://www.anthropic.com/rss.xml',
    'https://www.anthropic.com/blog/rss'
  );

-- ══════════════════════════════════════════════════════════════════
-- 2. New sources (all URLs verified 2026-04-17: HTTP 200, valid RSS/Atom)
-- ══════════════════════════════════════════════════════════════════

INSERT INTO sources (name, platform, url, check_interval_min, is_active) VALUES

  -- Labs with native RSS
  ('NVIDIA Blog',              'rss', 'https://blogs.nvidia.com/feed/',                                   180, true),
  ('Microsoft AI Blog',        'rss', 'https://blogs.microsoft.com/ai/feed/',                             180, true),
  ('Apple Machine Learning',   'rss', 'https://machinelearning.apple.com/rss.xml',                        360, true),
  ('Stability AI News',        'rss', 'https://stability.ai/news-updates?format=rss',                     240, true),
  ('Replicate Blog',           'rss', 'https://replicate.com/blog/rss',                                   240, true),
  ('GitHub Blog',              'rss', 'https://github.blog/feed/',                                        240, true),
  ('OpenAI News',              'rss', 'https://openai.com/news/rss.xml',                                  120, true),

  -- Research / tooling / devtools
  ('LangChain Blog',           'rss', 'https://langchain.substack.com/feed',                              360, true),

  -- High-signal curators and researchers
  ('Simon Willison',           'rss', 'https://simonwillison.net/atom/everything/',                       120, true),
  ('Import AI (Jack Clark)',   'rss', 'https://jack-clark.net/feed/',                                     720, true),
  ('Last Week in AI',          'rss', 'https://lastweekin.ai/feed',                                       720, true),
  ('The Sequence',             'rss', 'https://thesequence.substack.com/feed',                            720, true),
  ('Ben''s Bites',             'rss', 'https://www.bensbites.com/feed',                                   360, true),

  -- Industry press (AI-only sections)
  ('The Verge AI',             'rss', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',180, true),
  ('TechCrunch AI',            'rss', 'https://techcrunch.com/category/artificial-intelligence/feed/',    180, true),

  -- Google News RSS proxies (for labs that publish no native RSS).
  -- These scope by site: so results come straight from the lab's own site.
  ('Anthropic (Google News)',  'rss', 'https://news.google.com/rss/search?q=site:anthropic.com&hl=en-US&gl=US&ceid=US:en',  180, true),
  ('Mistral (Google News)',    'rss', 'https://news.google.com/rss/search?q=site:mistral.ai&hl=en-US&gl=US&ceid=US:en',     180, true),
  ('Perplexity (Google News)', 'rss', 'https://news.google.com/rss/search?q=site:perplexity.ai&hl=en-US&gl=US&ceid=US:en',  240, true),
  ('ElevenLabs (Google News)', 'rss', 'https://news.google.com/rss/search?q=site:elevenlabs.io&hl=en-US&gl=US&ceid=US:en',  240, true),
  ('Cohere (Google News)',     'rss', 'https://news.google.com/rss/search?q=site:cohere.com+announce&hl=en-US&gl=US&ceid=US:en', 360, true),
  ('xAI / Grok (Google News)', 'rss', 'https://news.google.com/rss/search?q=%22xAI%22+Grok+OR+%22x.ai%22&hl=en-US&gl=US&ceid=US:en', 240, true)

ON CONFLICT (platform, url) DO UPDATE
  SET name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      check_interval_min = EXCLUDED.check_interval_min;

-- ══════════════════════════════════════════════════════════════════
-- 3. Sanity report
-- ══════════════════════════════════════════════════════════════════

-- After running, this SELECT should show 20+ RSS sources:
-- SELECT platform, count(*) FROM sources WHERE is_active GROUP BY platform ORDER BY platform;
