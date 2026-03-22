-- ============================================================================
-- Step 9: Content Intelligence Upgrade — Schema Changes
-- Adds topic type classification, flexible content storage, SimHash dedup,
-- velocity scoring, story clustering metadata, and enrichment tracking.
-- Spec: docs/superpowers/specs/2026-03-21-topsnip-v2-content-intelligence.md
-- Created: 2026-03-21
-- ============================================================================

-- ── A. Topic Type Classification ──────────────────────────────────────────────
-- Classifies each topic so content generation can pick the right adaptive format.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'topics' AND column_name = 'topic_type'
  ) THEN
    ALTER TABLE topics ADD COLUMN topic_type text DEFAULT 'industry_news';
    ALTER TABLE topics ADD CONSTRAINT topics_topic_type_check
      CHECK (topic_type IN ('tool_launch', 'research_paper', 'industry_news', 'regulatory', 'tutorial', 'opinion_debate'));
  END IF;
END $$;

-- ── B. Flexible Content Storage ───────────────────────────────────────────────
-- content_json stores the format-specific structure (varies by topic_type).
-- Reader checks content_json first; falls back to legacy columns for pre-v2 content.

ALTER TABLE topic_content ADD COLUMN IF NOT EXISTS content_json jsonb;

-- Drop NOT NULL on legacy columns so new format types don't need fake values.
-- tldr stays NOT NULL — every format has a tldr field.
ALTER TABLE topic_content ALTER COLUMN what_happened DROP NOT NULL;
ALTER TABLE topic_content ALTER COLUMN so_what DROP NOT NULL;
ALTER TABLE topic_content ALTER COLUMN now_what DROP NOT NULL;

-- ── C. SimHash for Near-Duplicate Detection ───────────────────────────────────
-- 64-bit SimHash fingerprint on title + first 200 chars of content_snippet.
-- Hamming distance ≤3 bits = duplicate. Checked against 72-hour rolling window.
-- No index needed: sequential scan with bitwise XOR + popcount is fast enough
-- at our scale (~500 items per 72-hour window).

ALTER TABLE source_items ADD COLUMN IF NOT EXISTS simhash bigint;

-- ── D. Engagement History for Velocity Scoring ────────────────────────────────
-- Array of {timestamp, value} snapshots used to compute velocity
-- (rate of change) instead of raw volume.

ALTER TABLE source_items ADD COLUMN IF NOT EXISTS engagement_history jsonb DEFAULT '[]';

-- ── E. Story Clustering Metadata ──────────────────────────────────────────────
-- When multiple sources cover the same story, they cluster into one topic.
-- source_count = how many distinct sources back this topic.
-- platforms = which platforms reported it (e.g. ['hackernews', 'youtube', 'reddit']).

ALTER TABLE topics ADD COLUMN IF NOT EXISTS source_count integer DEFAULT 1;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{}';

-- ── F. Enrichment Status Tracking ─────────────────────────────────────────────
-- Tracks whether enrichment succeeded, produced thin results, or failed.
-- Content generation adapts: thin sources get explicit uncertainty language.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'topics' AND column_name = 'enrichment_status'
  ) THEN
    ALTER TABLE topics ADD COLUMN enrichment_status text DEFAULT 'pending';
    ALTER TABLE topics ADD CONSTRAINT topics_enrichment_status_check
      CHECK (enrichment_status IN ('pending', 'enriched', 'thin', 'failed'));
  END IF;
END $$;


-- ============================================================================
-- ROLLBACK (uncomment to reverse this migration)
-- ============================================================================
--
-- ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_enrichment_status_check;
-- ALTER TABLE topics DROP COLUMN IF EXISTS enrichment_status;
-- ALTER TABLE topics DROP COLUMN IF EXISTS platforms;
-- ALTER TABLE topics DROP COLUMN IF EXISTS source_count;
-- ALTER TABLE source_items DROP COLUMN IF EXISTS engagement_history;
-- ALTER TABLE source_items DROP COLUMN IF EXISTS simhash;
-- ALTER TABLE topic_content ALTER COLUMN what_happened SET NOT NULL;
-- ALTER TABLE topic_content ALTER COLUMN so_what SET NOT NULL;
-- ALTER TABLE topic_content ALTER COLUMN now_what SET NOT NULL;
-- ALTER TABLE topic_content DROP COLUMN IF EXISTS content_json;
-- ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_topic_type_check;
-- ALTER TABLE topics DROP COLUMN IF EXISTS topic_type;
