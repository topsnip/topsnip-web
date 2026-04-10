-- migration-v3.sql
-- TopSnip v3: Personal AI Dashboard schema changes
-- Run in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- 0. Fix existing RLS policies for auth-free personal dashboard
-- ═══════════════════════════════════════════════════════════════

-- topics: allow public read of published topics
DROP POLICY IF EXISTS "Users can view published topics" ON topics;
DROP POLICY IF EXISTS "Authenticated users can view published topics" ON topics;
CREATE POLICY "Public read published topics" ON topics
  FOR SELECT USING (status = 'published');
CREATE POLICY "Service write topics" ON topics
  FOR ALL USING (auth.role() = 'service_role');

-- source_items: allow public read
DROP POLICY IF EXISTS "Authenticated users can view source items" ON source_items;
CREATE POLICY "Public read source items" ON source_items
  FOR SELECT USING (true);

-- topic_sources: allow public read
DROP POLICY IF EXISTS "Authenticated users can view topic sources" ON topic_sources;
CREATE POLICY "Public read topic sources" ON topic_sources
  FOR SELECT USING (true);

-- youtube_recommendations: allow public read
DROP POLICY IF EXISTS "Users can view youtube recommendations" ON youtube_recommendations;
DROP POLICY IF EXISTS "Authenticated users can view youtube recommendations" ON youtube_recommendations;
CREATE POLICY "Public read youtube recs" ON youtube_recommendations
  FOR SELECT USING (true);

-- tags + topic_tags: allow public read
DROP POLICY IF EXISTS "Anyone can view tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON tags;
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view topic_tags" ON topic_tags;
DROP POLICY IF EXISTS "Authenticated users can view topic_tags" ON topic_tags;
CREATE POLICY "Public read topic_tags" ON topic_tags FOR SELECT USING (true);

-- sources: allow public read
DROP POLICY IF EXISTS "Authenticated users can view sources" ON sources;
CREATE POLICY "Public read sources" ON sources FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 1. Create topic_cards table (replaces topic_content)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS topic_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_fact TEXT,
  category_tag TEXT,
  image_url TEXT,
  learn_brief JSONB NOT NULL DEFAULT '{}',
  illustration_prompt TEXT,
  quality_score INTEGER DEFAULT 0,
  generated_by TEXT DEFAULT 'claude-sonnet-4-5',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_topic_card UNIQUE (topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_cards_quality ON topic_cards(quality_score);

-- RLS for topic_cards
ALTER TABLE topic_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on topic_cards" ON topic_cards
  FOR SELECT USING (true);
CREATE POLICY "Allow service write on topic_cards" ON topic_cards
  FOR ALL USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- 2. Migrate youtube_recommendations FK
-- ═══════════════════════════════════════════════════════════════

-- Add new FK column
ALTER TABLE youtube_recommendations
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;

-- Backfill from existing data
UPDATE youtube_recommendations yr
SET topic_id = tc.topic_id
FROM topic_content tc
WHERE yr.topic_content_id = tc.id
  AND yr.topic_id IS NULL;

-- Drop old FK column (only if topic_id is populated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_recommendations' AND column_name = 'topic_content_id'
  ) THEN
    ALTER TABLE youtube_recommendations DROP COLUMN topic_content_id;
  END IF;
END $$;

-- Make topic_id NOT NULL after backfill
ALTER TABLE youtube_recommendations ALTER COLUMN topic_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_youtube_recs_topic ON youtube_recommendations(topic_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. Add new RSS feed sources
-- ═══════════════════════════════════════════════════════════════

INSERT INTO sources (name, platform, url, is_active) VALUES
  ('Anthropic Blog', 'rss', 'https://www.anthropic.com/blog/rss', true),
  ('OpenAI Blog', 'rss', 'https://openai.com/blog/rss.xml', true)
ON CONFLICT DO NOTHING;
