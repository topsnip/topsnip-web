-- migration-v6-review-remediation.sql
-- TopSnip review remediation: RLS tightening, storage setup, usage ledger,
-- idempotent policy repair, source media, and card action fields.
-- Run this after migration-v5-hardening.sql. It assumes v3 topic_cards and
-- v5 schema-drift columns already exist.

-- 1. topic_cards action/novelty fields
ALTER TABLE topic_cards
  ADD COLUMN IF NOT EXISTS action_label TEXT,
  ADD COLUMN IF NOT EXISTS novelty_note TEXT;

-- 2. source_items optional media field for image fallback
ALTER TABLE source_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. API usage ledger for cost controls
CREATE TABLE IF NOT EXISTS api_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_events_created_at
  ON api_usage_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_events_provider_created_at
  ON api_usage_events(provider, created_at DESC);

ALTER TABLE api_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service write api_usage_events" ON api_usage_events;
CREATE POLICY "Service write api_usage_events" ON api_usage_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Storage bucket for generated illustrations
INSERT INTO storage.buckets (id, name, public)
VALUES ('topic-illustrations', 'topic-illustrations', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read topic illustrations" ON storage.objects;
CREATE POLICY "Public read topic illustrations" ON storage.objects
  FOR SELECT USING (bucket_id = 'topic-illustrations');

DROP POLICY IF EXISTS "Service write topic illustrations" ON storage.objects;
CREATE POLICY "Service write topic illustrations" ON storage.objects
  FOR ALL USING (bucket_id = 'topic-illustrations' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'topic-illustrations' AND auth.role() = 'service_role');

-- 5. Tighten public RLS policies for raw ingestion tables.
DROP POLICY IF EXISTS "Public read source items" ON source_items;
DROP POLICY IF EXISTS "Public read source_items for published topics" ON source_items;
CREATE POLICY "Public read source_items for published topics" ON source_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM topic_sources ts
      JOIN topics t ON t.id = ts.topic_id
      WHERE ts.source_item_id = source_items.id
        AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Public read topic sources" ON topic_sources;
DROP POLICY IF EXISTS "Public read topic_sources for published topics" ON topic_sources;
CREATE POLICY "Public read topic_sources for published topics" ON topic_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM topics t
      WHERE t.id = topic_sources.topic_id
        AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Public read sources" ON sources;
DROP POLICY IF EXISTS "Public read sources used by published topics" ON sources;
CREATE POLICY "Public read sources used by published topics" ON sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM source_items si
      JOIN topic_sources ts ON ts.source_item_id = si.id
      JOIN topics t ON t.id = ts.topic_id
      WHERE si.source_id = sources.id
        AND t.status = 'published'
    )
  );

-- 6. Make existing created policies idempotent for future reruns.
DROP POLICY IF EXISTS "Service write topics" ON topics;
CREATE POLICY "Service write topics" ON topics
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow public read on topic_cards" ON topic_cards;
CREATE POLICY "Allow public read on topic_cards" ON topic_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topics t
      WHERE t.id = topic_cards.topic_id
        AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Allow service write on topic_cards" ON topic_cards;
CREATE POLICY "Allow service write on topic_cards" ON topic_cards
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
