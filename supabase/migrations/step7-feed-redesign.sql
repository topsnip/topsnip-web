-- ============================================================================
-- Step 7 — Feed Redesign Data Layer
-- Adds evergreen column, creates get_user_feed_v2 RPC
-- Created: 2026-03-19
-- ============================================================================

-- ── A1: Add is_evergreen column ─────────────────────────────────────────────

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS is_evergreen boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_topics_evergreen
  ON public.topics (is_evergreen) WHERE is_evergreen = true;

-- ── A2: Create get_user_feed_v2 RPC ────────────────────────────────────────

create or replace function public.get_user_feed_v2(p_user_id uuid)
returns table (
  topic_id       uuid,
  is_read        boolean,
  is_new         boolean,
  featured       boolean,
  personal_score float
)
language plpgsql security definer set search_path = public
as $$
declare
  v_role      text;
  v_interests text[];
  v_count     integer;
  v_max_score float;
begin
  -- Get user profile
  select role, interests
    into v_role, v_interests
    from public.profiles
   where id = p_user_id;

  if v_role is null then
    v_role := 'general';
  end if;

  v_interests := coalesce(v_interests, '{}');

  -- Build main feed from last 7 days
  create temp table _feed_results on commit drop as
    with read_status as (
      select ur.topic_id as tid
        from public.user_reads ur
       where ur.user_id = p_user_id
    ),
    interest_matches as (
      select distinct tt.topic_id as tid
        from public.topic_tags tt
        join public.tags tg on tg.id = tt.tag_id
       where tg.slug = any(v_interests)
    )
    select
      t.id                                                as topic_id,
      (rs.tid is not null)                                as is_read,
      (t.published_at >= now() - interval '4 hours')      as is_new,
      false                                               as featured,
      coalesce(t.trending_score, 0)
        + (case when im.tid is not null then 20 else 0 end)
        - (case when rs.tid is not null then 100 else 0 end) as personal_score
    from public.topics t
    left join read_status rs on rs.tid = t.id
    left join interest_matches im on im.tid = t.id
    where t.published_at >= now() - interval '7 days'
      and t.status = 'published'
      and t.is_evergreen = false
    order by
      coalesce(t.trending_score, 0)
        + (case when im.tid is not null then 20 else 0 end)
        - (case when rs.tid is not null then 100 else 0 end) desc,
      t.published_at desc
    limit 20;

  -- Count results
  select count(*) into v_count from _feed_results;

  -- Mark the highest-scoring UNREAD topic as featured (avoid featuring already-read topics)
  select max(fr.personal_score) into v_max_score
    from _feed_results fr
   where fr.is_read = false;

  -- Fall back to any topic if all are read
  if v_max_score is null then
    select max(fr.personal_score) into v_max_score from _feed_results fr;
  end if;

  if v_max_score is not null then
    update _feed_results fr
       set featured = true
     where fr.personal_score = v_max_score
       and fr.topic_id = (
         select fr2.topic_id from _feed_results fr2
          where fr2.personal_score = v_max_score
          limit 1
       );
  end if;

  -- Pad with evergreen topics if fewer than 3 results
  if v_count < 3 then
    insert into _feed_results (topic_id, is_read, is_new, featured, personal_score)
      with read_status as (
        select ur.topic_id as tid
          from public.user_reads ur
         where ur.user_id = p_user_id
      )
      select
        t.id,
        (rs.tid is not null),
        false,
        false,
        coalesce(t.trending_score, 0)::float
      from public.topics t
      left join read_status rs on rs.tid = t.id
      where t.is_evergreen = true
        and t.id not in (select fr.topic_id from _feed_results fr)
      order by t.trending_score desc
      limit (20 - v_count);
  end if;

  -- Return final results
  return query
    select fr.topic_id, fr.is_read, fr.is_new, fr.featured, fr.personal_score
      from _feed_results fr
     order by fr.featured desc, fr.personal_score desc;
end;
$$;
