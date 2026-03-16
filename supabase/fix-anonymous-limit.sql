-- ============================================================================
-- FIX: Update anonymous search limit from 1/day to 3/day per IP
-- SEVERITY: MEDIUM — UI promises 3 free guest searches but RPC only allowed 1
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_anonymous_limit(p_ip_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.anonymous_searches
  WHERE ip_hash = p_ip_hash
    AND created_at > current_date::timestamptz;

  RETURN v_count < 3;
END;
$$;

-- Verify the function was updated
SELECT prosrc FROM pg_proc WHERE proname = 'check_anonymous_limit';
