-- Step 6: Enhanced read tracking — scroll_pct column + upsert RPC
-- Run this against your Supabase project via SQL Editor or CLI

-- 1. Add scroll_pct column to user_reads
ALTER TABLE user_reads ADD COLUMN IF NOT EXISTS scroll_pct integer DEFAULT 0;

-- 2. Create an RPC that only updates time/scroll if the new values are greater.
--    This prevents stale beacons (fired late) from overwriting more recent data.
CREATE OR REPLACE FUNCTION upsert_read_progress(
  p_user_id uuid,
  p_topic_id uuid,
  p_time_spent_sec integer,
  p_scroll_pct integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO user_reads (user_id, topic_id, read_at, time_spent_sec, scroll_pct)
  VALUES (p_user_id, p_topic_id, now(), p_time_spent_sec, p_scroll_pct)
  ON CONFLICT (user_id, topic_id)
  DO UPDATE SET
    time_spent_sec = GREATEST(COALESCE(user_reads.time_spent_sec, 0), EXCLUDED.time_spent_sec),
    scroll_pct     = GREATEST(COALESCE(user_reads.scroll_pct, 0), EXCLUDED.scroll_pct),
    read_at        = now();
END;
$$;
