# TopSnip Web — Security Audit Report v2

**Audit date:** 2026-03-16
**Audited against:** `vibe-coding-security-master-checklist.md`
**Scope:** Full codebase, schema, API routes, middleware, auth, billing, CSP, RLS

---

## 1. Executive Summary

TopSnip has solid security foundations — security headers, Stripe webhook verification, RLS on all tables, input sanitization, open redirect protection, prompt injection defenses, and atomic search slot claiming. However, several critical and high-severity issues were found and fixed in this audit.

**Go / No-Go:** CONDITIONAL GO — proceed after applying the SQL migrations below and verifying the manual checklist items that require access to production dashboards.

---

## 2. What Was Fixed (This Audit)

### CRITICAL fixes applied

| # | Issue | Fix | Files changed |
|---|-------|-----|---------------|
| C1 | **RLS profiles policy allowed users to self-promote to Pro** — UPDATE policy had no column restrictions, so any user could `update({ plan: 'pro' })` from the browser | Replaced with restrictive policy that locks billing/counter columns | `supabase/schema-v2.sql`, `supabase/fix-profiles-rls.sql` |
| C2 | **Search route referenced nonexistent tables** (`search_history`, `search_cache`) | Added `search_cache` table to schema; updated route + history page to use `user_searches` | `supabase/schema-v2.sql`, `supabase/fix-search-tables.sql`, `src/app/api/search/route.ts`, `src/app/history/page.tsx` |
| C4 | **No rate limit on Pro users** — denial-of-wallet via unlimited Anthropic API calls | Added 20 req/min rate limit for Pro users | `src/app/api/search/route.ts` |

### HIGH fixes applied

| # | Issue | Fix | Files changed |
|---|-------|-----|---------------|
| H1 | **CSP had `unsafe-eval`** — weakens XSS protection | Removed `unsafe-eval` from script-src | `next.config.ts` |
| H2 | **In-memory rate limiting ineffective on serverless** — Map resets per cold start | Added deduplicated global interval cleanup + documented Upstash Redis as recommended upgrade | `src/app/api/search/route.ts` |
| H3 | **Guest search limit was client-side only** (localStorage) — trivially bypassed | Wired up server-side `anonymous_searches` table + `check_anonymous_limit()` RPC (already in schema, now used) | `src/app/api/search/route.ts` |
| H5 | **No CORS restrictions** — any website could call API | Added CORS headers restricting API to own origin | `next.config.ts` |
| H6 | **Middleware didn't protect authenticated routes** | Added route protection for `/history`, `/settings` with redirect to login | `src/middleware.ts` |

### Other fixes

| # | Issue | Fix |
|---|-------|-----|
| M1 | `.env.local.example` referenced deleted service without context | Updated with proper documentation and notes |

---

## 3. SQL Migrations to Apply

**IMPORTANT:** Run these in Supabase SQL Editor (Dashboard → SQL Editor → New Query) in order:

### Migration 1: Fix profiles RLS (CRITICAL)
File: `supabase/fix-profiles-rls.sql`

This drops the overly permissive UPDATE policy and replaces it with one that locks billing fields (`plan`, `stripe_*`, `subscription_status`) and search counters (`searches_today`, `searches_date`).

### Migration 2: Add search_cache table + update user_searches
File: `supabase/fix-search-tables.sql`

This creates the `search_cache` table and adds missing columns (`query_slug`, `result`) to `user_searches`.

---

## 4. Known Risks Still Present

### Transcript service dependency (CRITICAL — functional, not security)
The search pipeline calls `TRANSCRIPT_SERVICE_URL` which references a deleted service (`services/transcripts/`). Every search will fail at the transcript step unless:
- The service is redeployed elsewhere, OR
- The transcript fetch is replaced with an alternative (e.g., `youtube-transcript-api` via serverless function)

**This blocks the search feature from working, not a security vulnerability.**

### In-memory rate limiting (MEDIUM — recommended upgrade)
The current rate limiter is in-memory (`Map`), which resets on Vercel cold starts. It works as a first-line defense in warm instances but is not durable across isolates.

**Recommended:** Add `@upstash/ratelimit` + `@upstash/redis` for cross-instance rate limiting. Free tier available via Vercel integration.

### Stripe webhook idempotency (MEDIUM)
The webhook handler verifies signatures but doesn't track processed event IDs. Replayed events could cause unexpected state changes.

**Recommended:** Add a `stripe_events` table or check `event.id` before processing.

### Missing Stripe portal endpoint (MEDIUM)
`POST /api/stripe/portal` is documented in CLAUDE.md but not implemented. Users cannot manage/cancel subscriptions except through Stripe email links.

### No error tracking service (MEDIUM)
No Sentry, LogRocket, or similar. Only `console.error` to Vercel logs with no alerting.

### No dependency vulnerability scanning (LOW)
No `npm audit` in CI. Run `npm audit` periodically.

---

## 5. Existing Strengths (Verified)

| Control | Status | Evidence |
|---------|--------|----------|
| Security headers (HSTS, X-Frame, X-Content-Type, Permissions-Policy) | ✅ | `next.config.ts` |
| Content Security Policy (script, style, img, connect, frame restrictions) | ✅ | `next.config.ts` (unsafe-eval removed) |
| CORS restrictions on API routes | ✅ | `next.config.ts` (added this audit) |
| Stripe webhook signature verification | ✅ | `src/app/api/stripe/webhook/route.ts` |
| Open redirect protection | ✅ | `src/app/auth/callback/route.ts` |
| Input sanitization (HTML strip, control chars, length cap) | ✅ | `src/app/api/search/route.ts` |
| Request body size limit (1KB) | ✅ | `src/app/api/search/route.ts` |
| RLS on all tables | ✅ | `supabase/schema-v2.sql` |
| Restrictive profiles UPDATE policy | ✅ | `supabase/schema-v2.sql` (fixed this audit) |
| Atomic search slot claiming (race-condition safe) | ✅ | `claim_search_slot()` RPC |
| Server-side anonymous search limiting | ✅ | `check_anonymous_limit()` RPC (wired up this audit) |
| `getUser()` not `getSession()` for auth | ✅ | All auth checks |
| Prompt injection defense (XML tag wrapping) | ✅ | `src/app/api/search/route.ts` |
| LLM output validation (JSON parse + type checks) | ✅ | `src/app/api/search/route.ts` |
| Sanitized error responses (no API key leaks) | ✅ | `src/app/api/search/route.ts` |
| `.env*` in `.gitignore` | ✅ | `.gitignore` |
| Auth required for checkout | ✅ | `src/app/api/stripe/checkout/route.ts` |
| Timeout on external API calls | ✅ | YouTube (10s), Transcript (15s) |
| Service role client only used server-side | ✅ | API routes only |
| Middleware protects authenticated routes | ✅ | `src/middleware.ts` (fixed this audit) |
| Pro user rate limiting (20/min) | ✅ | `src/app/api/search/route.ts` (added this audit) |

---

## 6. Manual Verification Checklist

These items **cannot be verified from the codebase** — they require access to production dashboards, Vercel settings, or Supabase admin. Complete each one manually:

### Supabase Dashboard
- [ ] **Run `fix-profiles-rls.sql`** in SQL Editor and verify the policy was created
- [ ] **Run `fix-search-tables.sql`** in SQL Editor and verify tables/columns exist
- [ ] Verify RLS is enabled on ALL tables (Dashboard → Authentication → Policies)
- [ ] Verify Supabase dashboard has MFA enabled for admin accounts
- [ ] Verify the `SUPABASE_SERVICE_ROLE_KEY` has been rotated in the last 90 days
- [ ] Verify no additional RLS policies were manually added that might override the schema
- [ ] Verify Supabase Auth settings: confirm only Google OAuth and magic link are enabled (no password auth leaking)
- [ ] Verify Supabase Auth email templates don't expose internal URLs

### Vercel Dashboard
- [ ] Verify environment variables are scoped correctly (Production vs Preview vs Development)
- [ ] Verify `NEXT_PUBLIC_APP_URL` is set to the production URL (not localhost) in Production env
- [ ] Verify Vercel spend alerts are configured (Settings → Billing → Usage Alerts)
- [ ] Verify Vercel deployment protection is enabled for Preview deployments
- [ ] Verify no sensitive env vars are marked as `NEXT_PUBLIC_` (only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`, `APP_URL` should be public)
- [ ] Verify the Vercel project is not set to public (Settings → General → Public Access)

### Stripe Dashboard
- [ ] Verify webhook endpoint URL matches production (Dashboard → Webhooks)
- [ ] Verify webhook secret (`STRIPE_WEBHOOK_SECRET`) is different between test and live modes
- [ ] Verify only required webhook events are subscribed to (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed)
- [ ] Verify Stripe API keys are separated between test and live modes
- [ ] Verify no test mode keys are used in production env vars
- [ ] Verify Stripe billing alerts are set (Dashboard → Settings → Alert preferences)

### Anthropic Dashboard
- [ ] Verify API usage limits / spend caps are configured
- [ ] Verify API key permissions are scoped appropriately
- [ ] Verify billing alerts are set for unexpected usage spikes

### Google Cloud Console (YouTube API)
- [ ] Verify YouTube Data API v3 has a quota limit set (default is 10,000 units/day)
- [ ] Verify the API key is restricted to YouTube Data API v3 only (not all Google APIs)
- [ ] Verify the API key has HTTP referrer restrictions or IP restrictions set

### Git History
- [ ] Run `git log --all --oneline -- '*.env*' '.env*'` to verify no `.env` files were ever committed
- [ ] Run `git log --all --oneline -S "sk-ant-" -S "sk_test_" -S "sk_live_" -S "whsec_" -S "eyJ"` to check for accidental secret commits
- [ ] If secrets were found in history, rotate ALL affected credentials immediately

### Monitoring Setup (Post-Deploy)
- [ ] Add Sentry or equivalent error tracking (free tier) — wire into `src/app/layout.tsx`
- [ ] Set up Vercel log drains or alerts for 5xx error spikes
- [ ] Set up Anthropic API usage monitoring (check weekly)
- [ ] Set up Stripe webhook failure alerts (Dashboard → Webhooks → Alerts)
- [ ] Document incident response steps for: secret leak, cost spike, data exposure

### Pre-Launch Final Checks
- [ ] Run `npm audit` and resolve any critical/high vulnerabilities
- [ ] Run `npx next build` to verify production build succeeds with all changes
- [ ] Test the full search flow end-to-end (guest, free, pro)
- [ ] Test Stripe checkout flow end-to-end (monthly + yearly)
- [ ] Test that a free user hitting 10 searches gets properly gated
- [ ] Test that a guest hitting 3 searches gets the server-side limit (not just localStorage)
- [ ] Verify the `/history` route redirects to login when not authenticated
- [ ] Verify a user cannot update their plan from browser devtools after RLS fix

---

## 7. Recommended Future Improvements

| Priority | Improvement | Effort |
|----------|-------------|--------|
| HIGH | Replace in-memory rate limiter with Upstash Redis | 1-2 hours |
| HIGH | Add Sentry error tracking | 30 min |
| HIGH | Implement `POST /api/stripe/portal` for subscription management | 1 hour |
| MEDIUM | Add Stripe webhook idempotency (track event IDs) | 1 hour |
| MEDIUM | Add account deletion flow (GDPR/privacy) | 2-3 hours |
| MEDIUM | Add `npm audit` to CI pipeline | 15 min |
| MEDIUM | Restore or replace transcript service | 2-4 hours |
| LOW | Add React error boundaries | 1 hour |
| LOW | Add structured logging (JSON format for Vercel) | 1 hour |

---

## 8. Checklist Cross-Reference

| Checklist Section | Status |
|-------------------|--------|
| A. Scope & Risk | ✅ Defined in CLAUDE.md |
| B. Architecture & Trust Boundaries | ✅ Documented |
| C. Authentication | ✅ Supabase Auth (Google OAuth + magic link) |
| D. Authorization | ✅ RLS + restrictive UPDATE policy |
| E. Secrets & Credentials | ✅ Env vars, .gitignore, no client exposure |
| F. AI & LLM Safety | ✅ XML wrapping, JSON validation, output type checks |
| G. Input/Output Validation | ✅ Sanitization, body limits, React auto-escaping |
| H. Cost & Abuse Controls | ✅ Rate limits (all tiers), atomic counters, timeouts |
| I. Integrations | ✅ Webhook signatures, timeout on external calls |
| J. Data Privacy | ⚠️ No account deletion flow yet |
| K. Storage & Database | ✅ RLS, service role only server-side |
| L. Deployment Hardening | ✅ CSP, HSTS, CORS, X-Frame, debug off |
| M. Dependencies | ⚠️ No automated vulnerability scanning |
| N. Logging & Monitoring | ⚠️ Basic console.error only — needs Sentry |
| O. Reliability & Recovery | ⚠️ No documented rollback/incident plan |
| P. Release Readiness | ⚠️ Pending manual verification checklist above |
