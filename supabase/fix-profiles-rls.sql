-- ============================================================================
-- FIX: Restrict profiles UPDATE policy to safe columns only
-- SEVERITY: CRITICAL — without this, any user can set plan='pro' from the client
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Step 1: Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Step 2: Create a restrictive UPDATE policy
-- Users can only update: role, interests, onboarding_complete
-- Billing fields (plan, stripe_*, subscription_status) are ONLY writable via service role
-- Search counters (searches_today, searches_date) are ONLY writable via claim_search_slot RPC
CREATE POLICY "Users can update their own safe fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from modifying billing/plan fields
    AND plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.id = auth.uid())
    AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT p.stripe_subscription_id FROM public.profiles p WHERE p.id = auth.uid())
    AND subscription_status IS NOT DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.id = auth.uid())
    -- Prevent users from resetting their own search counters
    AND searches_today = (SELECT p.searches_today FROM public.profiles p WHERE p.id = auth.uid())
    AND searches_date = (SELECT p.searches_date FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Step 3: Verify the policy was created
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'UPDATE';
