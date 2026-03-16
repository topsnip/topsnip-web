# TopSnip Web — Security Audit Report v4

**Audit date:** 2026-03-16 (re-audit + hardening pass)
**Audited against:** `vibe-coding-security-master-checklist.md`
**Scope:** Full codebase, schema, API routes, middleware, auth, billing, CSP, RLS, dependencies, git history

---

## 1. Executive Summary

TopSnip has solid security foundations verified across two audit passes. All critical and high-severity code-level issues have been fixed. The codebase passes `npm audit` with 0 vulnerabilities, production build compiles clean, and no secrets were found in git history.

**Go / No-Go:** CONDITIONAL GO — proceed after running the 4 SQL migrations in Supabase and completing the manual dashboard checklist items below.

---

## 2. What Was Fixed (Audit v2 — First Pass)

### CRITICAL fixes

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| C1 | **RLS profiles policy allowed self-promotion to Pro** | Restrictive UPDATE policy locks billing/counter columns | `supabase/schema-v2.sql`, `supabase/fix-profiles-rls.sql` |
| C2 | **Search route referenced nonexistent tables** | Added `search_cache` table; updated route + history to use `user_searches` | `supabase/schema-v2.sql`, `supabase/fix-search-tables.sql`, `src/app/api/search/route.ts`, `src/app/history/page.tsx` |
| C4 | **No rate limit on Pro users** (denial-of-wallet) | Added 20 req/min rate limit for Pro users | `src/app/api/search/route.ts` |

### HIGH fixes

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| H1 | **CSP had `unsafe-eval`** | Removed `unsafe-eval` from script-src | `next.config.ts` |
| H2 | **In-memory rate limiting resets on cold start** | Added deduplicated global cleanup + documented Upstash upgrade | `src/app/api/search/route.ts` |
| H3 | **Guest search limit was client-side only** | Wired server-side `check_anonymous_limit()` RPC | `src/app/api/search/route.ts` |
| H5 | **No CORS restrictions** | Added CORS headers restricting API to own origin | `next.config.ts` |
| H6 | **Middleware didn't protect authenticated routes** | Added route protection for `/history`, `/settings` | `src/middleware.ts` |

---

## 3. What Was Fixed (Audit v3 — Re-audit)

### MEDIUM fixes

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| M2 | **Anonymous search limit mismatch** — RPC allowed 1/day but UI promised 3 | Updated `check_anonymous_limit()` to `v_count < 3` | `supabase/schema-v2.sql`, `supabase/fix-anonymous-limit.sql` |
| M3 | **No rate limit on `/api/stripe/checkout`** — could spam Stripe API | Added 3 req/min per-user rate limit | `src/app/api/stripe/checkout/route.ts` |
| M4 | **Search crashes when transcript service is down** — deleted service causes 500 errors | Added graceful fallback to metadata-only synthesis; removed hard dependency on `TRANSCRIPT_SERVICE_URL` | `src/app/api/search/route.ts` |

---

## 3b. What Was Fixed (Audit v4 — Hardening Pass)

### MEDIUM fixes

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| M5 | **Stripe webhook had no replay protection** | Added `stripe_events` idempotency table; webhook checks event ID before processing | `supabase/stripe-idempotency.sql`, `src/app/api/stripe/webhook/route.ts` |
| M6 | **Missing Stripe billing portal** | Implemented `POST /api/stripe/portal` for subscription self-management | `src/app/api/stripe/portal/route.ts` |
| M7 | **Inline rate limiters not testable** | Extracted shared `RateLimiter` class with periodic cleanup; all routes now import from `src/lib/ratelimit.ts` | `src/lib/ratelimit.ts`, `src/app/api/search/route.ts`, `src/app/api/stripe/checkout/route.ts` |

### Tests added

| Test | Coverage | File |
|------|----------|------|
| Rate limiter unit tests | Burst blocking, window rollover, key isolation, cleanup | `src/test/ratelimit.test.ts` |
| Middleware routing tests | Protected route matching, public route passthrough | `src/test/middleware.test.ts` |

---

## 4. SQL Migrations to Apply

**IMPORTANT:** Run these in Supabase SQL Editor (Dashboard → SQL Editor → New Query) in order:

### Migration 1: Fix profiles RLS (CRITICAL)
File: `supabase/fix-profiles-rls.sql`

Drops the overly permissive UPDATE policy and replaces it with one that locks billing fields (`plan`, `stripe_*`, `subscription_status`) and search counters (`searches_today`, `searches_date`).

### Migration 2: Add search_cache table + update user_searches (CRITICAL)
File: `supabase/fix-search-tables.sql`

Creates the `search_cache` table and adds missing columns (`query_slug`, `result`) to `user_searches`.

### Migration 3: Fix anonymous search limit (MEDIUM)
File: `supabase/fix-anonymous-limit.sql`

Updates `check_anonymous_limit()` RPC from 1/day to 3/day per IP hash (matching UI promise).

### Migration 4: Stripe webhook idempotency (MEDIUM)
File: `supabase/stripe-idempotency.sql`

Creates the `stripe_events` table for tracking processed webhook event IDs. RLS enabled with no public policies (service-role only).

---

## 5. Automated Verification Results (This Audit)

| Check | Result | Evidence |
|-------|--------|----------|
| `npm audit` | **0 vulnerabilities** | Ran 2026-03-16 |
| `next build` | **Compiles clean** | No TS errors, all 16 routes generated |
| `.env` files in git history | **None found** | `git log --all -- '*.env*'` returned empty |
| Secrets in git history (`sk-ant-`, `sk_test_`, `sk_live_`, `whsec_`) | **None found** | Only match was this audit report's text mentioning the search patterns |
| SSRF protection | **Verified** | `src/lib/ingest/safe-fetch.ts` blocks private IPs, cloud metadata, `.local`/`.internal` |
| Cron auth timing-safe comparison | **Verified** | `src/lib/ingest/cron-auth.ts` uses `crypto.timingSafeEqual` |
| CSP no unsafe-eval | **Verified** | `next.config.ts` line 34 |
| CORS restricted to own origin | **Verified** | `next.config.ts` lines 40-45 |
| Profiles RLS locks billing fields | **Verified** | `supabase/schema-v2.sql` lines 37-48 |
| All 14 tables have RLS enabled | **Verified** | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on every table (includes `stripe_events`) |
| Service role key only used server-side | **Verified** | Only in API routes and lib/ingest/ |
| `getUser()` used (not `getSession()`) | **Verified** | All auth checks across middleware, routes, and pages |

---

## 6. Existing Strengths (Verified)

| Control | Status | Evidence |
|---------|--------|----------|
| Security headers (HSTS, X-Frame, X-Content-Type, Permissions-Policy, Referrer-Policy) | Pass | `next.config.ts` |
| Content Security Policy (script, style, img, connect, frame restrictions) | Pass | `next.config.ts` |
| CORS restrictions on API routes | Pass | `next.config.ts` |
| Stripe webhook signature verification | Pass | `src/app/api/stripe/webhook/route.ts` |
| Stripe checkout rate limiting (3/min per user) | Pass | `src/app/api/stripe/checkout/route.ts` (added v3) |
| Open redirect protection | Pass | `src/app/auth/callback/route.ts` |
| Input sanitization (HTML strip, control chars, length cap) | Pass | `src/app/api/search/route.ts` |
| Request body size limit (1KB) | Pass | `src/app/api/search/route.ts` |
| RLS on all 14 tables | Pass | `supabase/schema-v2.sql` + `stripe-idempotency.sql` |
| Restrictive profiles UPDATE policy | Pass | `supabase/schema-v2.sql` |
| Atomic search slot claiming (race-condition safe) | Pass | `claim_search_slot()` RPC |
| Server-side anonymous search limiting (3/day) | Pass | `check_anonymous_limit()` RPC (fixed v3) |
| `getUser()` not `getSession()` for auth | Pass | All auth checks |
| Prompt injection defense (XML tag wrapping) | Pass | `src/app/api/search/route.ts` |
| LLM output validation (JSON parse + type checks) | Pass | `src/app/api/search/route.ts` |
| Sanitized error responses (no API key leaks) | Pass | All API routes |
| `.env*` in `.gitignore` | Pass | `.gitignore` |
| Auth required for checkout | Pass | `src/app/api/stripe/checkout/route.ts` |
| Timeout on external API calls | Pass | YouTube (10s), Transcript (15s) |
| Service role client only used server-side | Pass | API routes + lib/ingest only |
| Middleware protects authenticated routes | Pass | `src/middleware.ts` |
| Pro user rate limiting (20/min) | Pass | `src/app/api/search/route.ts` |
| SSRF protection on ingestion fetchers | Pass | `src/lib/ingest/safe-fetch.ts` |
| Cron auth with timing-safe comparison | Pass | `src/lib/ingest/cron-auth.ts` |
| Graceful transcript service fallback | Pass | `src/app/api/search/route.ts` (added v3) |
| IP hashing for anonymous tracking (SHA-256 + salt) | Pass | `src/app/api/search/route.ts` |
| Ingested content sanitized (HTML entity encoding) | Pass | `src/lib/ingest/safe-fetch.ts` |
| URL validation for stored URLs | Pass | `src/lib/ingest/safe-fetch.ts` |
| Response body size limits on fetchers (5MB) | Pass | `src/lib/ingest/safe-fetch.ts` |
| Stripe webhook idempotency (replay protection) | Pass | `src/app/api/stripe/webhook/route.ts` + `stripe_events` table (added v4) |
| Stripe billing portal for subscription management | Pass | `src/app/api/stripe/portal/route.ts` (added v4) |
| Shared rate limiter with memory cleanup | Pass | `src/lib/ratelimit.ts` (refactored v4) |
| Unit tests for rate limiter + middleware routing | Pass | `src/test/ratelimit.test.ts`, `src/test/middleware.test.ts` (added v4) |

---

## 7. Known Risks Still Present

### In-memory rate limiting (MEDIUM — recommended upgrade)
Rate limiters use in-memory `Map`, which resets on Vercel cold starts. Works as first-line defense in warm instances but not durable across isolates.

**Recommended:** Add `@upstash/ratelimit` + `@upstash/redis` for cross-instance rate limiting.

### ~~Stripe webhook idempotency~~ (FIXED in v4)
~~Webhook handler verifies signatures but doesn't track processed event IDs.~~ Now tracks event IDs in `stripe_events` table before processing.

### ~~Missing Stripe portal endpoint~~ (FIXED in v4)
~~`POST /api/stripe/portal` not implemented.~~ Now implemented at `src/app/api/stripe/portal/route.ts`.

### No error tracking service (MEDIUM)
No Sentry, LogRocket, or similar. Only `console.error` to Vercel logs.

### No account deletion flow (MEDIUM — GDPR)
No way for users to delete their account and data.

### No dependency vulnerability scanning in CI (LOW)
`npm audit` currently shows 0 vulnerabilities but is not automated.

---

## 8. Manual Verification Checklist

These items **cannot be verified from the codebase** — they require production dashboard access.

### Supabase Dashboard
- [x] **Run `fix-profiles-rls.sql`** in SQL Editor and verify the policy was created
- [x] **Run `fix-search-tables.sql`** in SQL Editor and verify tables/columns exist
- [x] **Run `fix-anonymous-limit.sql`** in SQL Editor and verify function updated
- [x] **Run `stripe-idempotency.sql`** in SQL Editor and verify `stripe_events` table exists
- [ ] Verify RLS is enabled on ALL tables (Dashboard → Authentication → Policies)
- [ ] Verify Supabase dashboard has MFA enabled for admin accounts
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` has been rotated in the last 90 days
- [ ] Verify no additional RLS policies were manually added that might override the schema
- [ ] Verify Supabase Auth settings: only Google OAuth and magic link enabled
- [ ] Verify Supabase Auth email templates don't expose internal URLs

### Vercel Dashboard
- [ ] Verify environment variables are scoped correctly (Production vs Preview vs Development)
- [ ] Verify `NEXT_PUBLIC_APP_URL` is set to production URL (not localhost)
- [ ] Verify Vercel spend alerts are configured
- [ ] Verify deployment protection is enabled for Preview deployments
- [ ] Verify no sensitive env vars are marked as `NEXT_PUBLIC_`
- [ ] Verify project is not set to public

### Stripe Dashboard
- [ ] Verify webhook endpoint URL matches production
- [ ] Verify webhook secret is different between test and live modes
- [ ] Verify only required webhook events are subscribed to
- [ ] Verify Stripe API keys are separated between test and live
- [ ] Verify no test mode keys in production env vars
- [ ] Verify billing alerts are set

### Anthropic Dashboard
- [ ] Verify API usage limits / spend caps are configured
- [ ] Verify API key permissions are scoped appropriately
- [ ] Verify billing alerts are set for usage spikes

### Google Cloud Console (YouTube API)
- [ ] Verify YouTube Data API v3 has a quota limit set
- [ ] Verify API key is restricted to YouTube Data API v3 only
- [ ] Verify API key has HTTP referrer or IP restrictions

### Git History (VERIFIED)
- [x] `git log --all --oneline -- '*.env*' '.env*'` — no .env files committed
- [x] `git log --all --oneline -S "sk-ant-" -S "sk_test_" -S "sk_live_" -S "whsec_" -S "eyJ"` — no secrets found (only audit report text)

### Pre-Launch Final Checks
- [x] `npm audit` — 0 vulnerabilities
- [x] `npx next build` — compiles clean, all routes generated
- [ ] Test full search flow end-to-end (guest, free, pro)
- [ ] Test Stripe checkout flow end-to-end (monthly + yearly)
- [ ] Test that a free user hitting 10 searches gets properly gated
- [ ] Test that a guest hitting 3 searches gets the server-side limit
- [ ] Verify `/history` redirects to login when not authenticated
- [ ] Verify a user cannot update their plan from browser devtools after RLS fix

---

## 9. Recommended Future Improvements

| Priority | Improvement | Effort |
|----------|-------------|--------|
| HIGH | Replace in-memory rate limiter with Upstash Redis | 1-2 hours |
| HIGH | Add Sentry error tracking | 30 min |
| ~~HIGH~~ | ~~Implement `POST /api/stripe/portal` for subscription management~~ | Done (v4) |
| ~~MEDIUM~~ | ~~Add Stripe webhook idempotency (track event IDs)~~ | Done (v4) |
| MEDIUM | Add account deletion flow (GDPR/privacy) | 2-3 hours |
| MEDIUM | Add `npm audit` to CI pipeline | 15 min |
| MEDIUM | Deploy transcript service replacement (serverless function) | 2-4 hours |
| LOW | Add React error boundaries | 1 hour |
| LOW | Add structured logging (JSON format for Vercel) | 1 hour |

---

## 10. Checklist Cross-Reference

| Checklist Section | Status |
|-------------------|--------|
| A. Scope & Risk | Pass — defined in CLAUDE.md |
| B. Architecture & Trust Boundaries | Pass — documented, SSRF protection verified |
| C. Authentication | Pass — Supabase Auth (Google OAuth + magic link) |
| D. Authorization | Pass — RLS on all tables + restrictive UPDATE policy |
| E. Secrets & Credentials | Pass — env vars, .gitignore, no client exposure, git history clean |
| F. AI & LLM Safety | Pass — XML wrapping, JSON validation, output type checks |
| G. Input/Output Validation | Pass — sanitization, body limits, HTML entity encoding, React escaping |
| H. Cost & Abuse Controls | Pass — rate limits (all tiers + checkout), atomic counters, timeouts, cache |
| I. Integrations | Pass — webhook signatures + idempotency, cron auth (timing-safe), timeouts, SSRF protection |
| J. Data Privacy | Partial — no account deletion flow yet |
| K. Storage & Database | Pass — RLS, service role only server-side |
| L. Deployment Hardening | Pass — CSP, HSTS, CORS, X-Frame, debug off |
| M. Dependencies | Pass — 0 vulnerabilities (no CI automation yet) |
| N. Logging & Monitoring | Partial — console.error only, needs Sentry |
| O. Reliability & Recovery | Partial — no documented rollback/incident plan |
| P. Release Readiness | Conditional — pending SQL migrations + manual checklist |
