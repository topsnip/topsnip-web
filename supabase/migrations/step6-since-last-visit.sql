-- ============================================================================
-- Step 6b: "Since you were last here" + Learning Debt support
-- Adds last_seen_at to profiles + get_since_last_visit RPC
-- ============================================================================

-- ── Add last_seen_at column to profiles ─────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- ── Update RLS policy to allow users to update last_seen_at ─────────────────
-- We need to re-create the update policy to include last_seen_at as a safe field.
-- The existing policy already allows role, interests, onboarding_complete.
-- last_seen_at is safe — it's just a timestamp of when they last viewed the feed.

-- Note: The existing RLS policy ("Users can update their own safe fields") blocks
-- changes to billing fields. last_seen_at is not in the blocked list, so it's
-- already allowed through the existing policy. No RLS change needed.

-- ── Function: get_since_last_visit ──────────────────────────────────────────

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

-- ── Update get_knowledge_summary to include slug in unread_important ─────────
-- The existing function doesn't return slug, which we need for linking.

CREATE OR REPLACE FUNCTION public.get_knowledge_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
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
