-- Step 7: Knowledge Dashboard helpers
-- Adds get_reading_streak RPC for consecutive-day streak calculation.

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
  streaked as (
    -- subtract row number from date to find consecutive groups
    select d, d - rn::int as grp
    from ordered
    -- only consider streak ending today or yesterday (allow grace)
    where d >= current_date - 1
  )
  select coalesce(count(*)::int, 0)
  from streaked
  where grp = (select grp from streaked order by d desc limit 1);
$$;
