-- ============================================================================
-- Step 6 — Personalized Feed Ranking
-- Uses user interests + read history to rank topics
-- Created: 2026-03-17
-- ============================================================================

-- topic_tags already exists in schema-v2.sql — no need to create it.

-- ── Replace get_user_feed with personalized ranking ─────────────────────────

create or replace function public.get_user_feed(p_user_id uuid, p_date date default current_date)
returns table (
  topic_id      uuid,
  is_quiet_day  boolean,
  is_read       boolean,
  personal_score float
)
language plpgsql security definer set search_path = public
as $$
declare
  v_role      text;
  v_interests text[];
begin
  -- Get user profile
  select role, interests
    into v_role, v_interests
    from public.profiles
   where id = p_user_id;

  if v_role is null then
    v_role := 'general';
  end if;

  -- Default empty interests
  v_interests := coalesce(v_interests, '{}');

  return query
    with digest_topics as (
      -- Get topic_ids from the daily digest for the user's role
      select unnest(dd.topic_ids) as tid, dd.is_quiet_day as quiet
        from public.daily_digests dd
       where dd.date = p_date
         and dd.role = v_role
    ),
    read_status as (
      -- Check which topics the user has already read
      select ur.topic_id as tid
        from public.user_reads ur
       where ur.user_id = p_user_id
    ),
    interest_matches as (
      -- Check which topics match at least one user interest tag
      select distinct tt.topic_id as tid
        from public.topic_tags tt
        join public.tags tg on tg.id = tt.tag_id
       where tg.slug = any(v_interests)
    )
    select
      dt.tid                                              as topic_id,
      dt.quiet                                            as is_quiet_day,
      (rs.tid is not null)                                as is_read,
      coalesce(t.trending_score, 0)
        + (case when im.tid is not null then 20 else 0 end)
        - (case when rs.tid is not null then 100 else 0 end) as personal_score
    from digest_topics dt
    join public.topics t on t.id = dt.tid
    left join read_status rs on rs.tid = dt.tid
    left join interest_matches im on im.tid = dt.tid
    order by personal_score desc;
end;
$$;
