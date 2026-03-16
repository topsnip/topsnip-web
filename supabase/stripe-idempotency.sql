-- ============================================================================
-- FIX: Stripe Webhook Idempotency
-- SEVERITY: MEDIUM — prevents replay attacks on webhook endpoints
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Protect table: only the service role (via our backend API) should interact with it.
-- We enable RLS but add NO policies, which means public/authenticated access is completely blocked.
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Verify table creation
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_events';
