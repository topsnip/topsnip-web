-- migration-v5-hardening.sql
-- Consolidates all DDL required by the 2026-04-17 adversarial-audit fix pass.
-- Idempotent: safe to run multiple times. Run in the Supabase SQL Editor.
--
-- What this does:
--   1. Adds UNIQUE (platform, url) on sources (from migration-v4 that we couldn't
--      apply over the REST API).
--   2. Creates a `locks` table to back the atomic ingest-run claim so two
--      concurrent cron hits cannot both run the pipeline.
--   3. Adds `updated_at` to topics (runtime code already references it but the
--      column didn't exist, so self-heal + claim-release queries were silently
--      no-oping).
--   4. Re-syncs schema-v2/v3 with runtime reality by adding IF NOT EXISTS for
--      the columns the app reads/writes but that were never in committed SQL:
--      source_items.engagement_history, source_items.simhash, topics.topic_type,
--      topics.enrichment_status, topics.is_evergreen, topics.platforms,
--      topics.source_count, stripe_events columns.

-- ═══════════════════════════════════════════════════════════════════
-- 1. sources(platform, url) UNIQUE constraint
-- ═══════════════════════════════════════════════════════════════════

DELETE FROM sources a
USING sources b
WHERE a.ctid < b.ctid
  AND a.platform = b.platform
  AND a.url = b.url;

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_platform_url_unique;
ALTER TABLE sources ADD CONSTRAINT sources_platform_url_unique UNIQUE (platform, url);

-- ═══════════════════════════════════════════════════════════════════
-- 2. locks table for atomic ingest claim
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS locks (
  name              TEXT PRIMARY KEY,
  last_acquired_at  TIMESTAMPTZ
);

ALTER TABLE locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service write locks" ON locks;
CREATE POLICY "Service write locks" ON locks
  FOR ALL USING (auth.role() = 'service_role');

INSERT INTO locks (name, last_acquired_at) VALUES ('ingest', NULL)
  ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 3. topics.updated_at (runtime code already references it)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Auto-touch updated_at on any UPDATE so code doesn't have to remember.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topics_set_updated_at ON topics;
CREATE TRIGGER topics_set_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 4. Schema-drift catch-up (ADD COLUMN IF NOT EXISTS for everything
--    the app already reads/writes but that wasn't in committed SQL).
--    These are all no-ops on prod today (columns already exist) but
--    make a fresh environment deploy correctly.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE source_items
  ADD COLUMN IF NOT EXISTS engagement_history JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS simhash BIGINT;

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS topic_type         TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_status  TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_evergreen       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS platforms          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS source_count       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_breaking        BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS stripe_events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service write stripe_events" ON stripe_events;
CREATE POLICY "Service write stripe_events" ON stripe_events
  FOR ALL USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════
-- 5. Verification queries (uncomment to run manually after migration)
-- ═══════════════════════════════════════════════════════════════════

-- SELECT conname FROM pg_constraint WHERE conname = 'sources_platform_url_unique';
-- SELECT * FROM locks;
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'topics' ORDER BY column_name;
