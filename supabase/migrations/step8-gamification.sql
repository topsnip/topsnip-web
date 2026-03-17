-- ============================================================================
-- Step 8: Gamification — XP, Levels, Streaks
-- Adds XP tracking, level progression, and streak mechanics.
-- ============================================================================

-- ── A. Extend profiles table ─────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level text DEFAULT 'curious';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_streak_date date;

-- ── B. Create user_xp_events table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  xp_amount integer NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON user_xp_events(user_id, created_at DESC);

-- ── C. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE user_xp_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own XP events
CREATE POLICY "Users read own xp events" ON user_xp_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert XP events (no user-side inserts)
CREATE POLICY "Service role inserts xp events" ON user_xp_events
  FOR INSERT WITH CHECK (true);


-- ── D. RPC: award_xp ────────────────────────────────────────────────────────
-- Looks up XP for event_type, enforces one-time / daily constraints,
-- inserts event, updates profiles.xp and profiles.level.
-- Returns JSON: { xp_gained, total_xp, new_level, leveled_up }

CREATE OR REPLACE FUNCTION award_xp(
  p_user_id uuid,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_amount integer;
  v_old_level text;
  v_new_level text;
  v_total_xp integer;
  v_streak integer;
  v_already_exists boolean;
BEGIN
  -- Map event_type to xp_amount
  v_xp_amount := CASE p_event_type
    WHEN 'topic_read'        THEN 10
    WHEN 'search_completed'  THEN 5
    WHEN 'checklist_complete' THEN 25
    WHEN 'daily_three'       THEN 50
    WHEN 'streak_7'          THEN 100
    WHEN 'streak_30'         THEN 500
    WHEN 'first_search'      THEN 15
    WHEN 'first_topic'       THEN 15
    ELSE NULL
  END;

  IF v_xp_amount IS NULL THEN
    RETURN jsonb_build_object(
      'xp_gained', 0,
      'total_xp', (SELECT xp FROM profiles WHERE id = p_user_id),
      'new_level', (SELECT level FROM profiles WHERE id = p_user_id),
      'leveled_up', false,
      'error', 'unknown_event_type'
    );
  END IF;

  -- One-time events: first_search, first_topic
  IF p_event_type IN ('first_search', 'first_topic') THEN
    SELECT EXISTS(
      SELECT 1 FROM user_xp_events
      WHERE user_id = p_user_id AND event_type = p_event_type
    ) INTO v_already_exists;

    IF v_already_exists THEN
      RETURN jsonb_build_object(
        'xp_gained', 0,
        'total_xp', (SELECT xp FROM profiles WHERE id = p_user_id),
        'new_level', (SELECT level FROM profiles WHERE id = p_user_id),
        'leveled_up', false
      );
    END IF;
  END IF;

  -- daily_three: only once per day
  IF p_event_type = 'daily_three' THEN
    SELECT EXISTS(
      SELECT 1 FROM user_xp_events
      WHERE user_id = p_user_id
        AND event_type = 'daily_three'
        AND (created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date
    ) INTO v_already_exists;

    IF v_already_exists THEN
      RETURN jsonb_build_object(
        'xp_gained', 0,
        'total_xp', (SELECT xp FROM profiles WHERE id = p_user_id),
        'new_level', (SELECT level FROM profiles WHERE id = p_user_id),
        'leveled_up', false
      );
    END IF;
  END IF;

  -- streak_7 / streak_30: verify streak_count matches
  IF p_event_type = 'streak_7' THEN
    SELECT streak_count INTO v_streak FROM profiles WHERE id = p_user_id;
    IF v_streak IS NULL OR v_streak < 7 THEN
      RETURN jsonb_build_object(
        'xp_gained', 0,
        'total_xp', (SELECT xp FROM profiles WHERE id = p_user_id),
        'new_level', (SELECT level FROM profiles WHERE id = p_user_id),
        'leveled_up', false
      );
    END IF;
    -- Only award once per streak milestone (check if already awarded at this streak count)
    SELECT EXISTS(
      SELECT 1 FROM user_xp_events
      WHERE user_id = p_user_id
        AND event_type = 'streak_7'
        AND (metadata->>'streak_count')::int = v_streak
    ) INTO v_already_exists;
    IF v_already_exists THEN
      RETURN jsonb_build_object(
        'xp_gained', 0,
        'total_xp', (SELECT xp FROM profiles WHERE id = p_user_id),
        'new_level', (SELECT level FROM profiles WHERE id = p_user_id),
        'leveled_up', false
      );
    END IF;
    -- Embed streak count in metadata
    p_metadata := p_metadata || jsonb_build_object('streak_count', v_streak);
  END IF;

  IF p_event_type = 'streak_30' THEN
    SELECT streak_count INTO v_streak FROM profiles WHERE id = p_user_id;
    IF v_streak IS NULL OR v_streak < 30 THEN
      RETURN jsonb_build_object(
        'xp_gained', 0,
        'total_xp', (SELECT xp FROM profiles WHERE id = p_user_id),
        'new_level', (SELECT level FROM profiles WHERE id = p_user_id),
        'leveled_up', false
      );
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM user_xp_events
      WHERE user_id = p_user_id
        AND event_type = 'streak_30'
        AND (metadata->>'streak_count')::int = v_streak
    ) INTO v_already_exists;
    IF v_already_exists THEN
      RETURN jsonb_build_object(
        'xp_gained', 0,
        'total_xp', (SELECT xp FROM profiles WHERE id = p_user_id),
        'new_level', (SELECT level FROM profiles WHERE id = p_user_id),
        'leveled_up', false
      );
    END IF;
    p_metadata := p_metadata || jsonb_build_object('streak_count', v_streak);
  END IF;

  -- Get current level before update
  SELECT level INTO v_old_level FROM profiles WHERE id = p_user_id;

  -- Insert XP event (append-only)
  INSERT INTO user_xp_events (user_id, event_type, xp_amount, metadata)
  VALUES (p_user_id, p_event_type, v_xp_amount, p_metadata);

  -- Update profiles.xp
  UPDATE profiles
  SET xp = xp + v_xp_amount
  WHERE id = p_user_id
  RETURNING xp INTO v_total_xp;

  -- Recalculate level based on new XP total
  v_new_level := CASE
    WHEN v_total_xp >= 15000 THEN 'authority'
    WHEN v_total_xp >= 5000  THEN 'expert'
    WHEN v_total_xp >= 1000  THEN 'knowledgeable'
    WHEN v_total_xp >= 200   THEN 'informed'
    ELSE 'curious'
  END;

  -- Update level if changed
  IF v_new_level IS DISTINCT FROM v_old_level THEN
    UPDATE profiles SET level = v_new_level WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'xp_gained', v_xp_amount,
    'total_xp', v_total_xp,
    'new_level', v_new_level,
    'leveled_up', v_new_level IS DISTINCT FROM v_old_level
  );
END;
$$;


-- ── E. RPC: update_streak ────────────────────────────────────────────────────
-- Manages daily reading streaks. Uses UTC dates for consistency.
-- Returns JSON: { streak_count, longest_streak }

CREATE OR REPLACE FUNCTION update_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date date;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_streak integer;
  v_longest integer;
  v_xp_result jsonb;
BEGIN
  SELECT last_streak_date, streak_count, longest_streak
  INTO v_last_date, v_streak, v_longest
  FROM profiles
  WHERE id = p_user_id;

  -- Already counted today — no-op
  IF v_last_date = v_today THEN
    RETURN jsonb_build_object(
      'streak_count', v_streak,
      'longest_streak', v_longest
    );
  END IF;

  IF v_last_date = v_today - 1 THEN
    -- Yesterday — continue the streak
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSIF v_last_date IS NULL OR v_last_date < v_today - 1 THEN
    -- Missed a day (or first ever) — reset to 1
    v_streak := 1;
  END IF;

  -- Update longest if current exceeds it
  IF v_streak > COALESCE(v_longest, 0) THEN
    v_longest := v_streak;
  END IF;

  -- Persist
  UPDATE profiles
  SET streak_count = v_streak,
      longest_streak = v_longest,
      last_streak_date = v_today
  WHERE id = p_user_id;

  -- Award streak milestones
  IF v_streak = 7 THEN
    PERFORM award_xp(p_user_id, 'streak_7', '{}'::jsonb);
  END IF;

  IF v_streak = 30 THEN
    PERFORM award_xp(p_user_id, 'streak_30', '{}'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'streak_count', v_streak,
    'longest_streak', v_longest
  );
END;
$$;


-- ── F. RPC: get_gamification_stats ───────────────────────────────────────────
-- Returns everything the dashboard needs in a single call.

CREATE OR REPLACE FUNCTION get_gamification_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_xp_to_next integer;
  v_topics_today integer;
  v_total_topics integer;
  v_total_time integer;
  v_recent_events jsonb;
  v_daily_three_awarded boolean;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  -- Get profile gamification fields
  SELECT xp, level, streak_count, longest_streak
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate XP to next level
  v_xp_to_next := CASE v_profile.level
    WHEN 'curious'        THEN 200   - COALESCE(v_profile.xp, 0)
    WHEN 'informed'       THEN 1000  - COALESCE(v_profile.xp, 0)
    WHEN 'knowledgeable'  THEN 5000  - COALESCE(v_profile.xp, 0)
    WHEN 'expert'         THEN 15000 - COALESCE(v_profile.xp, 0)
    WHEN 'authority'      THEN 0  -- max level
    ELSE 200 - COALESCE(v_profile.xp, 0)
  END;
  -- Clamp to 0 minimum
  IF v_xp_to_next < 0 THEN v_xp_to_next := 0; END IF;

  -- Topics read today (UTC)
  SELECT count(*) INTO v_topics_today
  FROM user_reads
  WHERE user_id = p_user_id
    AND (read_at AT TIME ZONE 'UTC')::date = v_today;

  -- Total topics read
  SELECT count(*) INTO v_total_topics
  FROM user_reads
  WHERE user_id = p_user_id;

  -- Total time spent
  SELECT COALESCE(sum(time_spent_sec), 0) INTO v_total_time
  FROM user_reads
  WHERE user_id = p_user_id;

  -- Recent XP events (last 10)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'event_type', event_type,
      'xp_amount', xp_amount,
      'metadata', metadata,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO v_recent_events
  FROM (
    SELECT event_type, xp_amount, metadata, created_at
    FROM user_xp_events
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 10
  ) sub;

  -- Check if daily_three already awarded today
  SELECT EXISTS(
    SELECT 1 FROM user_xp_events
    WHERE user_id = p_user_id
      AND event_type = 'daily_three'
      AND (created_at AT TIME ZONE 'UTC')::date = v_today
  ) INTO v_daily_three_awarded;

  RETURN jsonb_build_object(
    'xp', COALESCE(v_profile.xp, 0),
    'level', COALESCE(v_profile.level, 'curious'),
    'streak_count', COALESCE(v_profile.streak_count, 0),
    'longest_streak', COALESCE(v_profile.longest_streak, 0),
    'xp_to_next_level', v_xp_to_next,
    'topics_read_today', v_topics_today,
    'total_topics_read', v_total_topics,
    'total_time_sec', v_total_time,
    'recent_xp_events', v_recent_events,
    'daily_three_eligible', (v_topics_today >= 3 AND NOT v_daily_three_awarded)
  );
END;
$$;
