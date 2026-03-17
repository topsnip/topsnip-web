-- ============================================================================
-- IDOR FIX PATCH FOR KNOWLEDGE DASHBOARD & READ TRACKING
-- Run this script in your Supabase SQL Editor to secure the recently added RPCs
-- ============================================================================

-- Fix 1: upsert_read_progress
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

-- Fix 2: get_since_last_visit
CREATE OR REPLACE FUNCTION public.get_since_last_visit(p_user_id uuid)
RETURNS TABLE (
  topic_id uuid,
  topic_title text,
  topic_slug text,
  tldr text,
  published_at timestamptz,
  trending_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_seen timestamptz;
BEGIN
  IF auth.uid() IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- Find user's last visit: last_seen_at, or fall back to most recent read, or profile creation
  SELECT COALESCE(
    p.last_seen_at,
    (SELECT MAX(ur.read_at) FROM public.user_reads ur WHERE ur.user_id = p_user_id),
    p.created_at
  )
  INTO v_last_seen
  FROM public.profiles p
  WHERE p.id = p_user_id;

  -- Return topics published after last visit that the user hasn't read
  RETURN QUERY
    SELECT
      t.id AS topic_id,
      t.title AS topic_title,
      t.slug AS topic_slug,
      COALESCE(tc.tldr, '') AS tldr,
      t.published_at,
      t.trending_score::real
    FROM public.topics t
    LEFT JOIN public.topic_content tc
      ON tc.topic_id = t.id
      AND tc.role = COALESCE(
        (SELECT role FROM public.profiles WHERE id = p_user_id),
        'general'
      )
    WHERE t.status = 'published'
      AND t.published_at > v_last_seen
      AND t.id NOT IN (
        SELECT ur.topic_id FROM public.user_reads ur WHERE ur.user_id = p_user_id
      )
    ORDER BY t.trending_score DESC
    LIMIT 5;
END;
$$;

-- Fix 3: get_knowledge_summary
CREATE OR REPLACE FUNCTION public.get_knowledge_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT jsonb_build_object(
    'topics_read', (SELECT count(*) FROM public.user_reads WHERE user_id = p_user_id),
    'total_time_sec', (SELECT coalesce(sum(time_spent_sec), 0) FROM public.user_reads WHERE user_id = p_user_id),
    'tags_covered', (
      SELECT coalesce(jsonb_agg(DISTINCT t.slug), '[]'::jsonb)
      FROM public.user_reads ur
      JOIN public.topic_tags tt ON tt.topic_id = ur.topic_id
      JOIN public.tags t ON t.id = tt.tag_id
      WHERE ur.user_id = p_user_id
    ),
    'recent_reads', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'topic_id', ur.topic_id,
        'title', tp.title,
        'read_at', ur.read_at
      ) ORDER BY ur.read_at DESC), '[]'::jsonb)
      FROM (
        SELECT * FROM public.user_reads WHERE user_id = p_user_id ORDER BY read_at DESC LIMIT 10
      ) ur
      JOIN public.topics tp ON tp.id = ur.topic_id
    ),
    'unread_important', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'topic_id', t.id,
        'title', t.title,
        'slug', t.slug,
        'trending_score', t.trending_score
      ) ORDER BY t.trending_score DESC), '[]'::jsonb)
      FROM (
        SELECT *
        FROM public.topics
        WHERE status = 'published'
          AND trending_score > 50
          AND id NOT IN (SELECT topic_id FROM public.user_reads WHERE user_id = p_user_id)
        ORDER BY trending_score DESC
        LIMIT 5
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fix 4: get_reading_streak
create or replace function get_reading_streak(p_user_id uuid)
returns int
language sql
stable
security definer
as $$
  with daily_reads as (
    -- distinct days the user read something (in UTC)
    select distinct (read_at at time zone 'UTC')::date as d
    from user_reads
    where user_id = p_user_id AND auth.uid() = p_user_id
  ),
  ordered as (
    select d, row_number() over (order by d desc) as rn
    from daily_reads
  ),
  groups as (
    select d, rn, (d + rn * interval '1 day')::date as grp
    from ordered
  ),
  streaks as (
    select count(*) as streak_len
    from groups
    group by grp
  )
  select coalesce(max(streak_len), 0)::int
  from streaks;
$$;
