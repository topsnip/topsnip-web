-- ============================================================================
-- FIX: Add search_cache table + update user_searches for search route
-- SEVERITY: CRITICAL — search route references these tables/columns
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Step 1: Create search_cache table (if not exists)
CREATE TABLE IF NOT EXISTS public.search_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query       text NOT NULL,
  query_slug  text NOT NULL UNIQUE,
  result      jsonb NOT NULL,
  video_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);

CREATE INDEX IF NOT EXISTS idx_search_cache_slug ON public.search_cache (query_slug);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON public.search_cache (expires_at);

ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;
-- No public RLS policies — only accessible via service role

-- Step 2: Add missing columns to user_searches (if not exists)
ALTER TABLE public.user_searches ADD COLUMN IF NOT EXISTS query_slug text NOT NULL DEFAULT '';
ALTER TABLE public.user_searches ADD COLUMN IF NOT EXISTS result jsonb;
