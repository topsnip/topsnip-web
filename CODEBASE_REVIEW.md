# CODEBASE_REVIEW.md

## 1. TL;DR

1. FACT: This is mostly TopSnip v3 now: public `/feed`, public `/learn/[slug]`, cron ingestion, `topic_cards`, and metadata-only YouTube recs.
2. FACT: TypeScript, default ESLint, and Vitest are green: `tsc --noEmit --incremental false`, `npm run lint`, and 33 unit tests passed.
3. Grade: C-. It compiles, but the "intelligence" layer has correctness holes that directly hurt signal quality.
4. Top finding 1: engagement velocity is effectively broken because duplicate items are ignored instead of updated, so history rarely gets a second snapshot.
5. Top finding 2: Reddit and arXiv fetchers ignore the DB source row, so multiple configured sources fetch the same global sets and store duplicates under different `source_id`s.
6. Top finding 3: public RLS exposes all `source_items` and `topic_sources`, not just published content, despite the stated "published content" model.
7. The README is not just stale; it describes a different product with auth, search, transcripts, pricing, and files that no longer exist.
8. The feed is not ordered by `trending_score` as the spec says, ignores the documented `date` parameter, and returns page length as `total`.
9. OPINION: The current "personal AI news dashboard" is a weak wedge unless the pipeline gets much better at evidence, novelty, and decision relevance.
10. Recommendation: pivot/sharpen, not abandon. Reuse the pipeline, but point it at a daily "AI change radar for builders" with evidence, novelty, and actions.

## 2. System Understanding (Phase 1)

### Repo And Module Map

FACT:

| Area | What it does | Evidence |
|---|---|---|
| `src/app/feed/page.tsx` | Server-rendered public feed page; queries `topic_cards` joined to published `topics`, last 3 days, ordered by card generation time. | `src/app/feed/page.tsx:35`, `src/app/feed/page.tsx:54`, `src/app/feed/page.tsx:56` |
| `src/app/learn/[slug]/page.tsx` | Server-rendered public learn page; performs separate queries for topic, card, YouTube recs, and sources. | `src/app/learn/[slug]/page.tsx:60`, `src/app/learn/[slug]/page.tsx:68`, `src/app/learn/[slug]/page.tsx:76`, `src/app/learn/[slug]/page.tsx:85` |
| `src/app/api/feed/route.ts` | Public feed JSON API with `limit`, `offset`, and `days`; no `date` handling. | `src/app/api/feed/route.ts:27`, `src/app/api/feed/route.ts:29` |
| `src/app/api/learn/[slug]/route.ts` | Public learn JSON API; same data shape as the page. | `src/app/api/learn/[slug]/route.ts:33`, `src/app/api/learn/[slug]/route.ts:43`, `src/app/api/learn/[slug]/route.ts:54`, `src/app/api/learn/[slug]/route.ts:62` |
| `src/app/api/ingest/run/route.ts` | Cron/manual ingestion endpoint protected by `CRON_SECRET` and a DB lock. | `src/app/api/ingest/run/route.ts:18`, `src/app/api/ingest/run/route.ts:26`, `src/app/api/ingest/run/route.ts:31` |
| `src/app/api/content/generate/route.ts` | Cron/manual content generation endpoint protected by `CRON_SECRET`; self-heals stuck topics and calls the content orchestrator. | `src/app/api/content/generate/route.ts:20`, `src/app/api/content/generate/route.ts:29`, `src/app/api/content/generate/route.ts:41`, `src/app/api/content/generate/route.ts:66` |
| `src/lib/ingest/*` | Source fetchers, safe fetch helpers, clustering, scoring, topic creation. | `src/lib/ingest/orchestrator.ts:123`, `src/lib/ingest/scorer.ts:91`, `src/lib/ingest/clusterer.ts:1` |
| `src/lib/content/*` | Card generation, prompts, image generation, quality scoring, relevance filtering, YouTube recs. | `src/lib/content/orchestrator.ts:1`, `src/lib/content/card-generator.ts:56`, `src/lib/content/youtube-recs.ts:29` |
| `src/components/feed/*` | Feed card and card stack UI. | `src/components/feed/FeedCard.tsx:44`, `src/components/feed/CardStack.tsx:17` |
| `src/components/learn/*` | Learn page sections, illustration fallback, YouTube cards, source list. | `src/components/learn/LearnBrief.tsx:45`, `src/components/learn/TopicIllustration.tsx:10`, `src/components/learn/VideoRecommendation.tsx:23`, `src/components/learn/SourceList.tsx:9` |
| `supabase/*.sql` | Base v2 schema plus v3/v4/v5 migrations. v5 explicitly documents schema drift catch-up. | `supabase/schema-v2.sql:1`, `supabase/migration-v3.sql:1`, `supabase/migration-v5-hardening.sql:1` |
| `scripts/*` | One-shot operations: migrations, source health, image backfill, retro-classification. | `scripts/backfill-images.mjs:2`, `scripts/migrate-v4-ai-sources.ts:2`, `scripts/retro-classify.sh:26` |

OPINION:

The module boundaries are understandable and mostly sane. The weak point is not structure; it is that several "intelligence" guarantees are only comments or prompts, not enforced behavior.

### Documentation Truth Check

FACT:

| Claim | Code reality | Conflict |
|---|---|---|
| `CLAUDE.md` says v3 has two pages and no auth. | Actual routes are `/feed` and `/learn/[slug]`, root redirects to `/feed`. | Mostly true. Evidence: `CLAUDE.md:7`, `CLAUDE.md:8`, `src/app/page.tsx:1`. |
| `CLAUDE.md` says DALL-E 3 illustrations. | Runtime image code uses `gpt-image-1`. | Docs stale. Evidence: `CLAUDE.md:20`, `src/lib/content/image-generator.ts:33`, `src/lib/content/image-generator.ts:37`. |
| README says search, auth, profiles, transcripts, pricing, and 15 E2E tests. | Code has no search route, no auth pages in `src/app`, no transcript service directory in `rg --files`, and one smoke spec with fewer tests. | README describes the old product. Evidence: `README.md:46`, `README.md:61`, `README.md:62`, `README.md:65`, `README.md:89`, `README.md:93`, `e2e/smoke.spec.ts:5`. |
| README self-hosting says apply `supabase/schema.sql`. | Repo has `supabase/schema-v2.sql` and migrations, not `supabase/schema.sql`. | Broken setup doc. Evidence: `README.md:142`, `README.md:143`, `rg --files` output includes `supabase/schema-v2.sql` and no `supabase/schema.sql`. |
| Spec says feed loads today's published topics ordered by `trending_score`. | Feed page and API order by `topic_cards.generated_at`. | Behavior conflict. Evidence: `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:334`, `src/app/feed/page.tsx:56`, `src/app/api/feed/route.ts:53`. |
| Spec says `GET /api/feed` accepts `date=YYYY-MM-DD`. | API accepts `days`, not `date`. | Contract conflict. Evidence: `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:461`, `src/app/api/feed/route.ts:29`. |
| Spec says learn page fetches everything in one call to avoid waterfall. | Page performs separate serial DB queries for topic, card, YouTube recs, and sources. | Partial conflict. Evidence: `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:521`, `src/app/learn/[slug]/page.tsx:60`, `src/app/learn/[slug]/page.tsx:68`, `src/app/learn/[slug]/page.tsx:76`, `src/app/learn/[slug]/page.tsx:85`. |

### Data Model

FACT:

Core v3 tables:

| Table | Purpose | Runtime usage |
|---|---|---|
| `sources` | Source registry and health. | Loaded by ingestion at `src/lib/ingest/orchestrator.ts:139`; health updated at `src/lib/ingest/orchestrator.ts:198`. |
| `source_items` | Raw ingested items. | Upserted during ingestion at `src/lib/ingest/orchestrator.ts:230`; scored from recent rows at `src/lib/ingest/scorer.ts:104`. |
| `topics` | Detected/generated/published topic state. | Inserted at `src/lib/ingest/orchestrator.ts:333`; claimed for generation at `src/lib/content/orchestrator.ts:153`; published at `src/lib/content/orchestrator.ts:309`. |
| `topic_sources` | Join table from topics to raw source items. | Written at `src/lib/ingest/orchestrator.ts:299` and `src/lib/ingest/orchestrator.ts:363`; read by learn page/API and generation. |
| `topic_cards` | v3 card + learn brief. | Created by migration at `supabase/migration-v3.sql:50`; written by card generator at `src/lib/content/card-generator.ts:106`; read by feed and learn. |
| `youtube_recommendations` | Curated video recommendations by `topic_id`. | Migrated at `supabase/migration-v3.sql:80`; written at `src/lib/content/youtube-recs.ts:167`. |
| `locks` | Ingest lock. | Created by v5 at `supabase/migration-v5-hardening.sql:34`; used by ingest run at `src/app/api/ingest/run/route.ts:31`. |
| `stripe_events` | Stripe webhook idempotency. | Base table in schema at `supabase/schema-v2.sql:357`; upserted by webhook at `src/app/api/stripe/webhook/route.ts:50`. |

Deprecated or drifted tables:

| Table | Status | Evidence |
|---|---|---|
| `topic_content` | Deprecated by v3, but still in base schema. | `CLAUDE.md:52`, `supabase/schema-v2.sql:191`. |
| `profiles` | Deprecated for v3 app, but still live for Stripe routes. | `CLAUDE.md:53`, `src/app/api/stripe/checkout/route.ts:74`, `src/app/api/stripe/webhook/route.ts:94`. |
| `user_reads`, `user_searches`, `daily_digests`, `search_cache`, `anonymous_searches` | Old auth/search/product surface; not used by current pages. | `supabase/schema-v2.sql:251`, `supabase/schema-v2.sql:276`, `supabase/schema-v2.sql:301`, `supabase/schema-v2.sql:323`, `supabase/schema-v2.sql:342`. |
| `tags`, `topic_tags` | Present and public-readable, but not materially used by v3 UI. | `supabase/schema-v2.sql:121`, `supabase/schema-v2.sql:178`, `supabase/migration-v3.sql:36`, `supabase/migration-v3.sql:40`. |

Schema drift:

FACT: v5 says it is adding runtime columns that were "never in committed SQL" before: `source_items.engagement_history`, `source_items.simhash`, `topics.topic_type`, `topics.enrichment_status`, `topics.is_evergreen`, `topics.platforms`, `topics.source_count`, and Stripe columns. Evidence: `supabase/migration-v5-hardening.sql:13`, `supabase/migration-v5-hardening.sql:79`, `supabase/migration-v5-hardening.sql:83`.

OPINION: This repo needs one canonical "fresh install" schema or a real ordered migrations directory. Right now, a human has to know that `schema-v2.sql` is not enough.

### Content Pipeline End To End

FACT:

1. Trigger: Vercel cron hits `/api/ingest/run` daily at 08:00 UTC, and `/api/content/generate` daily at 08:30 UTC. Evidence: `vercel.json:9`, `vercel.json:13`.
2. Ingest auth: both GET and POST route through `verifyCronAuth`, requiring `Authorization: Bearer <CRON_SECRET>`. Evidence: `src/app/api/ingest/run/route.ts:18`, `src/lib/ingest/cron-auth.ts:18`.
3. Ingest lock: a DB row named `ingest` is atomically updated if stale. Evidence: `src/app/api/ingest/run/route.ts:26`, `src/app/api/ingest/run/route.ts:31`.
4. Source loading: active sources are loaded and filtered by `check_interval_min`. Evidence: `src/lib/ingest/orchestrator.ts:139`, `src/lib/ingest/orchestrator.ts:158`.
5. Fetching: `fetchSource` dispatches by platform. RSS receives the DB `source.url`; Reddit, arXiv, YouTube, HN, and GitHub do not. Evidence: `src/lib/ingest/orchestrator.ts:51`, `src/lib/ingest/orchestrator.ts:55`, `src/lib/ingest/orchestrator.ts:57`, `src/lib/ingest/orchestrator.ts:59`, `src/lib/ingest/orchestrator.ts:61`, `src/lib/ingest/orchestrator.ts:63`.
6. Raw writes: fetched items are sanitized, capped at 100 per source, and upserted into `source_items` with `ignoreDuplicates: true`. Evidence: `src/lib/ingest/orchestrator.ts:211`, `src/lib/ingest/orchestrator.ts:217`, `src/lib/ingest/orchestrator.ts:231`.
7. Topic scoring: the scorer pulls recent unlinked items, clusters them by SimHash plus entity Jaccard, then scores by velocity, platform diversity, and recency. Evidence: `src/lib/ingest/scorer.ts:91`, `src/lib/ingest/scorer.ts:104`, `src/lib/ingest/scorer.ts:116`, `src/lib/ingest/scorer.ts:153`.
8. Topic creation: top 10 candidates become `topics`, classified by keyword-first topic type. Evidence: `src/lib/ingest/orchestrator.ts:272`, `src/lib/ingest/orchestrator.ts:323`, `src/lib/ingest/orchestrator.ts:333`.
9. Generation trigger: `/api/content/generate` rate-limits by most recent `topic_cards.generated_at`, then calls `runContentGeneration`. Evidence: `src/app/api/content/generate/route.ts:49`, `src/app/api/content/generate/route.ts:66`.
10. Topic claim: detected topics are updated to `status="generating"` before expensive work. Evidence: `src/lib/content/orchestrator.ts:145`, `src/lib/content/orchestrator.ts:153`.
11. Relevance gates: keyword filter first, optional Haiku classifier second. Evidence: `src/lib/content/orchestrator.ts:205`, `src/lib/content/orchestrator.ts:213`.
12. Card generation: Sonnet generates JSON; parser truncates summary to 60 words; heuristic quality check runs; image is generated; row is upserted into `topic_cards`. Evidence: `src/lib/content/card-generator.ts:66`, `src/lib/content/card-generator.ts:80`, `src/lib/content/card-generator.ts:87`, `src/lib/content/card-generator.ts:100`, `src/lib/content/card-generator.ts:106`.
13. Publish: topic is published before YouTube recs are fetched. Evidence: `src/lib/content/orchestrator.ts:309`, `src/lib/content/orchestrator.ts:320`.
14. YouTube recs: YouTube Data API search returns candidates, Haiku selects 2-3, old recs are deleted, new recs inserted. Evidence: `src/lib/content/youtube-recs.ts:46`, `src/lib/content/youtube-recs.ts:107`, `src/lib/content/youtube-recs.ts:155`, `src/lib/content/youtube-recs.ts:167`.

Failure modes:

| Stage | Failure behavior |
|---|---|
| Source fetch fails | Error is collected, source marked `down`, run continues. Evidence: `src/lib/ingest/orchestrator.ts:182`. |
| RSS malformed or empty | Returns `degraded` when zero items. Evidence: `src/lib/ingest/fetchers/rss.ts:138`. |
| Reddit subreddits fail individually | Warnings are logged and the fetcher still returns `healthy` even if every subreddit failed. Evidence: `src/lib/ingest/fetchers/reddit.ts:56`, `src/lib/ingest/fetchers/reddit.ts:75`. |
| Claude card parse/quality fails | `generateCard` returns `null`; the orchestrator does not immediately release the `generating` claim. Evidence: `src/lib/content/card-generator.ts:81`, `src/lib/content/card-generator.ts:88`, `src/lib/content/orchestrator.ts:225`. |
| Topic processing throws | Claim is released back to `detected`. Evidence: `src/lib/content/orchestrator.ts:244`, `src/lib/content/orchestrator.ts:247`. |
| OpenAI image generation fails | Image becomes `null`; UI falls back to category art. Evidence: `src/lib/content/image-generator.ts:42`, `src/lib/content/card-generator.ts:99`, `src/components/feed/FeedCard.tsx:55`. |
| YouTube recs fail | Topic remains published; error is collected. Evidence: `src/lib/content/orchestrator.ts:317`, `src/lib/content/orchestrator.ts:326`. |

### External Dependencies And Wiring

FACT:

| Dependency | Runtime wiring | Notes |
|---|---|---|
| Supabase | Public server/browser clients use anon key; cron uses service role key. | `src/lib/supabase/server.ts:6`, `src/lib/supabase/client.ts:4`, `src/lib/ingest/service-client.ts:13`. |
| Anthropic | Card generation uses `new Anthropic()`; classifiers and YouTube rec picker use `ANTHROPIC_API_KEY`. | `src/lib/content/card-generator.ts:65`, `src/lib/content/orchestrator.ts:162`, `src/lib/content/youtube-recs.ts:95`. |
| OpenAI image API | `OPENAI_API_KEY`, `gpt-image-1`, base64 response, upload to Supabase Storage. | `src/lib/content/image-generator.ts:21`, `src/lib/content/image-generator.ts:37`, `src/lib/supabase/storage.ts:12`. |
| YouTube Data API | `YOUTUBE_API_KEY`, quota tracked through Upstash if configured. | `src/lib/ingest/fetchers/youtube.ts:57`, `src/lib/content/youtube-recs.ts:34`, `src/lib/ratelimit.ts:93`. |
| Upstash Redis | Optional quota/rate backing. If absent, quota/rate checks fail open or use in-memory fallback. | `src/lib/ratelimit.ts:4`, `src/lib/ratelimit.ts:94`, `src/lib/ratelimit.ts:138`. |
| Stripe | Checkout, portal, and webhook routes remain. They depend on Supabase auth and `profiles`. | `src/app/api/stripe/checkout/route.ts:57`, `src/app/api/stripe/checkout/route.ts:74`, `src/app/api/stripe/webhook/route.ts:94`. |
| HN/Reddit/RSS/arXiv/GitHub | Direct fetchers with timeouts and limited retry behavior. | `src/lib/ingest/fetchers/hn.ts:53`, `src/lib/ingest/fetchers/reddit.ts:45`, `src/lib/ingest/fetchers/rss.ts:114`, `src/lib/ingest/fetchers/arxiv.ts:28`, `src/lib/ingest/fetchers/github.ts:67`. |
| PostHog | Optional client analytics. | `src/components/providers/PostHogProvider.tsx:18`, `src/lib/analytics.ts:8`. |
| Sentry | Wrapped in `next.config.ts`. | `next.config.ts:1`, `next.config.ts:79`. |

Env vars actually needed for v3:

| Required for | Env vars |
|---|---|
| Supabase public reads | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Cron writes | `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` |
| Content generation | `ANTHROPIC_API_KEY` |
| Images | `OPENAI_API_KEY` |
| YouTube ingestion/recs | `YOUTUBE_API_KEY` |
| Durable quotas | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| GitHub rate limit lift | `GITHUB_TOKEN` |
| Dormant Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |
| Analytics/observability | PostHog and Sentry vars |

FACT: `.env.local.example` includes Anthropic, YouTube, GitHub, Supabase, Stripe, cron, PostHog, Resend, and app URL examples, but not `OPENAI_API_KEY` or Upstash Redis. Evidence: `.env.local.example:2`, `.env.local.example:7`, `.env.local.example:12`, `.env.local.example:23`, `.env.local.example:31`, `.env.local.example:58`, plus code requirements at `src/lib/content/image-generator.ts:21` and `src/lib/ratelimit.ts:4`.

### Runtime And Deploy Story

FACT:

| Item | Evidence |
|---|---|
| Next.js app with scripts for dev/build/start/lint/E2E. No `test` script for Vitest. | `package.json:5`, `package.json:7`, `package.json:9`, `package.json:10`. |
| Build script runs `tsc --noEmit && next build`; Next's own typecheck is skipped in config because `tsc` runs first. | `package.json:7`, `next.config.ts:5`. |
| Vercel functions set ingest max duration 60s, content generation 120s. | `vercel.json:2`, `vercel.json:5`. |
| Vercel crons are daily, not every 2 hours. | `vercel.json:9`, `vercel.json:13`. |
| Playwright tests target production `https://www.topsnip.co`, not local dev. | `playwright.config.ts:9`. |

Verification run during this review:

| Check | Result |
|---|---|
| `npx tsc --noEmit --incremental false --pretty false` | Passed. |
| `npx vitest run --reporter=dot` | Passed: 7 files, 33 tests. |
| `npm run lint` | Passed. |
| Playwright | Not run; config targets production, and the ask was a codebase review rather than production black-box testing. |

## 3. Gaps, Risks & Rot (Phase 2)

### Critical

| Severity | Location | What's wrong | Why it matters | Smallest responsible fix |
|---|---|---|---|---|
| Critical | `src/lib/ingest/orchestrator.ts:231`, `src/lib/ingest/orchestrator.ts:245`, `src/lib/ingest/scorer.ts:31`, `src/lib/ingest/scorer.ts:160` | FACT: Existing `source_items` are ignored on duplicate upsert, and only newly upserted IDs get engagement snapshots. Velocity therefore rarely has two snapshots and falls back to raw engagement. | The core ranking promise is "velocity x diversity x recency"; today it is mostly "first-seen engagement volume x recency." This directly degrades signal. | Change upsert to update `engagement_score`, `published_at`, and `content_snippet` for existing rows; snapshot all fetched rows, not only newly inserted rows; add a test with two snapshots proving velocity changes. |
| Critical | `src/lib/ingest/orchestrator.ts:55`, `src/lib/ingest/orchestrator.ts:61`, `src/lib/ingest/fetchers/reddit.ts:3`, `src/lib/ingest/fetchers/reddit.ts:44`, `src/lib/ingest/fetchers/arxiv.ts:7`, `supabase/schema-v2.sql:560` | FACT: Reddit and arXiv fetchers ignore each `sources.url`. Every Reddit source fetches all hardcoded subreddits; every arXiv source fetches all hardcoded categories. | Multiple configured source rows create duplicate raw items under different `source_id`s because uniqueness is only `(source_id, external_id)` at `supabase/schema-v2.sql:110`. It inflates volume, wastes API/runtime, and corrupts clustering/source counts. | Make fetchers source-specific: parse subreddit/category/query from `source.url`, or collapse each platform to one source row. Add a test that two source rows do not fetch the same external item twice. |
| Critical | `supabase/migration-v3.sql:19`, `supabase/migration-v3.sql:24`, `supabase/migration-v3.sql:44`, `CLAUDE.md:96` | FACT: RLS makes all `source_items`, `topic_sources`, and `sources` public-readable, not only published content. | Anyone with the anon key can query raw ingested items, including rejected, unpublished, spam, and internal source metadata. This contradicts "public read for published content" and leaks your editorial inbox. | Replace blanket public policies with published-topic-scoped policies or move raw source access behind API routes using service role. |

### High

| Severity | Location | What's wrong | Why it matters | Smallest responsible fix |
|---|---|---|---|---|
| High | `src/lib/content/card-generator.ts:81`, `src/lib/content/card-generator.ts:88`, `src/lib/content/orchestrator.ts:225`, `src/app/api/content/generate/route.ts:37` | FACT: If generation returns `null` because Claude output is unparsable or fails quality, the topic remains `status="generating"` until the next route invocation self-heals it after 10 minutes. The spec explicitly says malformed Claude response should leave topic `detected`. | Failed topics disappear from the queue for at least one run window, and the run can report a quiet day for fixable transient failures. | After `generateCard` returns `null`, update the topic back to `detected` with an error reason. Add a regression test for parse failure. |
| High | `src/lib/content/card-quality.ts:59`, `src/lib/content/card-quality.ts:64`, `src/lib/content/card-prompts.ts:87` | FACT: "Factual" quality is a heuristic starting at 20 and only penalizing missing sources. There is no claim-to-source verification despite the prompt saying every claim must be traceable. | This is the highest trust risk. The product can publish plausible false specifics while claiming source-grounded synthesis. It is also a legal risk because copying/paraphrase detection is not enforced. | Add structured citations per claim or run a cheap verifier that checks each generated claim against source snippets; fail closed on unsupported specifics. |
| High | `src/lib/content/orchestrator.ts:67`, `src/lib/content/orchestrator.ts:72`, `src/lib/content/orchestrator.ts:83`, `src/lib/ratelimit.ts:94`, `src/lib/ratelimit.ts:138`, `.env.local.example:2` | FACT: Cost caps depend on generated `topic_cards` rows and optional Redis. Failed LLM calls and failed image generations do not count. If Redis is absent, YouTube and image caps fail open. | A broken prompt, parse failure, or missing bucket can repeatedly spend API calls while the budget counter says zero. | Persist per-run API call ledger in Supabase, fail closed or warn hard when Redis is absent in production, and add `UPSTASH_*`/`OPENAI_API_KEY` to env docs. |
| High | `src/app/api/feed/route.ts:29`, `src/app/api/feed/route.ts:53`, `src/app/api/feed/route.ts:83`, `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:461` | FACT: Feed API ignores documented `date`, sorts by `generated_at` instead of `trending_score`, and returns current page length as `total`. | Clients cannot request the documented daily feed, ranking is not "most important first," and pagination metadata is misleading. | Implement `date`, sort by `topics.trending_score`, and return a real count or remove `total`. Update E2E to assert date behavior. |
| High | `src/lib/ingest/orchestrator.ts:292`, `src/lib/ingest/orchestrator.ts:299`, `src/lib/ingest/orchestrator.ts:339` | FACT: When a new candidate merges into an existing topic, the code only links sources. It does not update the existing topic's score, platforms, source count, or recency. | Topics that keep accumulating evidence do not become more important in the feed. That punishes exactly the stories the system should promote. | On merge, recompute/update `trending_score`, `platform_count`, `source_count`, `platforms`, and `updated_at`. |
| High | `README.md:46`, `README.md:61`, `README.md:89`, `README.md:93`, `README.md:143` | FACT: README describes search, auth, transcript service, old routes, and `supabase/schema.sql` that do not match this repo. | New contributors or deployment agents will set up the wrong product. This is not cosmetic; it causes failed installs. | Rewrite README around v3 and include the real env/migration/cron story. |
| High | `src/lib/content/card-generator.ts:100`, `src/components/feed/FeedCard.tsx:55`, `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:567` | FACT: Image fallback chain does not use `og:image` from source items as specified; it falls back only at UI render to category images. | Expensive image failures degrade every card to generic art, and the DB never records the best available source visual. | Store `image_url` fallback from highest-quality source item when generation/upload fails. |

### Medium

| Severity | Location | What's wrong | Why it matters | Smallest responsible fix |
|---|---|---|---|---|
| Medium | `src/lib/supabase/storage.ts:3`, `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:584` | FACT: Code assumes a `topic-illustrations` bucket, but there is no Supabase migration creating the bucket or storage policies. | Fresh environments will silently fail image upload and publish cards with `image_url=null`. | Add storage bucket/policy setup to migrations or a verified setup script. |
| Medium | `src/lib/content/image-generator.ts:8`, `src/lib/content/image-generator.ts:11` | FACT: The image prompt says "White text" and also "No text overlays." | Conflicting image instructions reduce output consistency. | Decide whether diagrams may contain labels. If labels are not wanted, remove text color instruction. |
| Medium | `src/lib/ingest/orchestrator.ts:91`, `src/lib/ingest/orchestrator.ts:107` | FACT: Engagement snapshot updates run one DB update per item in an unbounded `Promise.all`. | A full ingest can burst hundreds of concurrent DB updates after fetching up to 100 items per source. | Batch updates or cap concurrency. |
| Medium | `src/lib/ingest/fetchers/reddit.ts:56`, `src/lib/ingest/fetchers/reddit.ts:75` | FACT: Reddit can skip every subreddit due to non-OK responses and still return `health: "healthy"` with zero items. | Source health lies, making operations blind. | Track skipped/failed subreddit count; return `degraded` or `down` when result count is zero due failures. |
| Medium | `src/lib/content/retry.ts:11`, `src/lib/content/youtube-recs.ts:56`, `src/lib/ingest/fetchers/rss.ts:114`, `src/lib/ingest/fetchers/github.ts:67` | FACT: Retry logic exists only for Claude 429s. Most external fetches have timeouts but no retries/backoff. | Transient source failures reduce coverage and can archive or miss stories. | Add small bounded retry with jitter for source APIs and YouTube details/search. |
| Medium | `src/app/feed/page.tsx:59`, `src/app/api/feed/route.ts:56` | FACT: Feed page logs DB errors and renders empty state; feed API returns raw DB error message. | Users see "No topics" instead of outage; API leaks internal error detail. | Return a deliberate error state in UI and generic API error with server-side logging. |
| Medium | `src/components/feed/CardStack.tsx:51`, `src/components/feed/FeedCard.tsx:99`, `src/app/feed/page.tsx:74` | FACT: UI labels `platform_count` as "sources." | A topic with Reddit + YouTube only can show "2 sources" even if many actual `source_items` exist. | Pass/display `source_count` for source count and optionally display platform count separately. |
| Medium | `src/components/learn/SourceList.tsx:15`, `src/app/learn/[slug]/page.tsx:91` | FACT: Missing source URLs become `href=""`. | Broken links navigate to the current page and make attribution look sloppy. | Filter empty URLs or render disabled text. |
| Medium | `src/components/learn/LearnBrief.tsx:106`, `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:402`, `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:714` | FACT: YouTube attribution is plain text only; spec calls for YouTube branding. Thumbnails do link to youtube.com. | Possible ToS/compliance risk and weaker user trust. | Add approved YouTube wordmark/branding treatment and preserve outbound YouTube links. |
| Medium | `src/lib/content/youtube-recs.ts:95`, `src/lib/content/youtube-recs.ts:56` | FACT: YouTube search happens before checking `ANTHROPIC_API_KEY` for the picker. | If Anthropic is missing, the route spends YouTube quota and then returns no recs. | Check all required keys before paid/quota operations. |
| Medium | `src/app/api/stripe/checkout/route.ts:113`, `src/app/api/stripe/portal/route.ts:59`, `CLAUDE.md:21` | FACT: Stripe is "dormant" but routes still return `/upgrade` and `/settings`, which do not exist in v3. | If accidentally used, billing sends users to dead pages. It also keeps `profiles` alive. | Either remove/pause Stripe routes or add explicit 410/disabled responses until monetization returns. |
| Medium | `supabase/migration-v3.sql:14`, `supabase/migration-v3.sql:70`, `supabase/migration-v3.sql:72` | FACT: v3 migration creates policies without dropping all same-named policies first. It also drops old policy names that do not exactly match schema-v2 names. | Re-running migrations can fail; policy drift is easy. | Make policy migrations idempotent with `DROP POLICY IF EXISTS` for the exact created policy names. |
| Medium | `src/lib/content/evergreen.ts:15`, `src/app/api/content/restore-evergreens/route.ts:8`, `src/lib/content/orchestrator.ts:130` | FACT: Evergreen content exists as a large static list, but there is no visible v3 UI seed path in the runtime. | This is a half-feature: code excludes evergreens from generation but does not clearly populate or display them. | Either remove evergreens or add a real seed/display flow. |
| Medium | `src/app/globals.css:275`, `src/app/globals.css:562`, `src/app/robots.ts:9` | FACT: CSS and robots still reference old auth/search routes and UI. | Low-level rot, but it signals cleanup was incomplete. | Remove old selectors/comments and stale robot disallows once routes are gone. |

### Low

| Severity | Location | What's wrong | Why it matters | Smallest responsible fix |
|---|---|---|---|---|
| Low | `src/app/api/content/generate/route.ts:17` | FACT: Comment still says generation creates "role-specific learning briefs." | Misleads maintainers. | Update comment to v3 card/learn brief language. |
| Low | `src/lib/analytics.ts:89`, `src/lib/analytics.ts:99` | FACT: Analytics helpers still include search/signup/login/subscription events. | Dead mental model; not harmful unless used later. | Prune or namespace dormant analytics helpers. |
| Low | `src/app/layout.tsx:6`, `src/app/sitemap.ts:4` | FACT: Public metadata and sitemap hardcode `https://www.topsnip.co`. | Self-hosting docs are inconsistent with hardcoded production identity. | Derive from `NEXT_PUBLIC_APP_URL`. |
| Low | `e2e/smoke.spec.ts:45`, `src/app/api/feed/route.ts:29` | FACT: E2E test named "supports date parameter" passes `date=...` but only asserts `has_more`; the API does not read `date`. | False confidence. | Assert returned topics are constrained to that date, or rename/remove the test. |

### Security Notes

FACT:

- Cron auth is correctly centralized and constant-time compared via SHA-256 hashes. Evidence: `src/lib/ingest/cron-auth.ts:11`, `src/lib/ingest/cron-auth.ts:27`.
- Stripe webhook signature verification is present. Evidence: `src/app/api/stripe/webhook/route.ts:25`, `src/app/api/stripe/webhook/route.ts:32`.
- CSRF origin checks exist for Stripe state-changing routes. Evidence: `src/app/api/stripe/checkout/route.ts:18`, `src/lib/csrf.ts:1`.
- RSS fetch has SSRF-oriented URL validation and response size limiting. Evidence: `src/lib/ingest/fetchers/rss.ts:108`, `src/lib/ingest/safe-fetch.ts:29`, `src/lib/ingest/safe-fetch.ts:64`.
- ASSUMPTION: Because source URLs are admin-controlled in the DB/migrations, SSRF risk is lower than if arbitrary users could add sources. Still, DNS resolution/private-IP rebinding is not checked in `isSafeUrl`.

OPINION:

The biggest security issue is not route auth. It is data exposure through over-broad public RLS.

### Legal And Compliance Notes

FACT:

- The code does not scrape YouTube transcripts. YouTube ingestion/recs use Data API titles, descriptions, stats, duration, thumbnails, and links. Evidence: `src/lib/ingest/fetchers/youtube.ts:47`, `src/lib/content/youtube-recs.ts:46`, `src/lib/content/youtube-recs.ts:80`.
- README still describes a transcript service, which conflicts with the legal v3 stance. Evidence: `README.md:61`, `README.md:104`, `CLAUDE.md:103`.
- Prompts instruct the model not to reproduce source phrasing. Evidence: `src/lib/content/card-prompts.ts:9`, `src/lib/content/card-prompts.ts:86`.
- The quality checker does not enforce non-copying or source-grounding beyond basic presence checks. Evidence: `src/lib/content/card-quality.ts:59`.
- The spec flags Reddit non-commercial licensing risk if monetized. Evidence: `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:59`.

OPINION:

The current legal posture is "prompt says be safe" plus source links. That is not enough if the output becomes public or commercial. It may be fine for a private personal dashboard, but the code and domain posture are already public-facing.

### Tests

FACT:

- Unit coverage exists for word limiting, relevance filter, image prompt construction, card parse, card quality, AI classifier, and rate limiter. Evidence: `src/__tests__/lib/word-limit.test.ts:4`, `src/__tests__/lib/relevance-filter.test.ts:4`, `src/__tests__/lib/image-generator.test.ts:4`, `src/__tests__/lib/card-generator.test.ts:4`, `src/test/ratelimit.test.ts:24`.
- There is no `package.json` unit test script, only E2E scripts. Evidence: `package.json:5`, `package.json:10`.
- E2E is smoke-level and points at production. Evidence: `e2e/smoke.spec.ts:36`, `playwright.config.ts:9`.
- Missing highest-value tests: mocked full ingest -> score -> topic -> generation orchestration; source-specific fetcher behavior; RLS policy checks; feed API contract; claim release on parse/quality failure; merge updates.

OPINION:

The tests prove helpers, not the product. The risky parts are cross-module pipelines and database contracts, and those are mostly untested.

### Performance

FACT:

- Feed is bounded: API clamps limit to 50 and days to 30. Evidence: `src/app/api/feed/route.ts:27`, `src/app/api/feed/route.ts:29`.
- Scoring is bounded to 500 recent items. Evidence: `src/lib/ingest/scorer.ts:110`.
- Ingest fetch concurrency is capped at 5. Evidence: `src/lib/ingest/orchestrator.ts:17`.
- Learn page uses multiple serial DB queries, not one joined query. Evidence: `src/app/learn/[slug]/page.tsx:60`, `src/app/learn/[slug]/page.tsx:68`, `src/app/learn/[slug]/page.tsx:76`, `src/app/learn/[slug]/page.tsx:85`.
- Snapshot writes are unbounded parallel updates. Evidence: `src/lib/ingest/orchestrator.ts:91`.

OPINION:

Performance is acceptable for a personal tool today. The first performance bug to fix is not UI rendering; it is ingestion doing duplicate work and bursty DB writes.

## 4. Improvements (Phase 3)

### Ranked Improvements

| Rank | Improvement | Impact | Effort | Why |
|---|---|---|---|---|
| 1 | Fix ingestion truth: source-specific fetchers, engagement updates, and merge aggregation. | Very high | M | This directly determines whether the feed surfaces actual important changes. |
| 2 | Add a real source-grounding verifier before publish. | Very high | M | This is the trust boundary. Without it, TopSnip is an attractive hallucination renderer. |
| 3 | Fix feed contract and ranking. | High | S | `date`, `trending_score`, and real pagination are basic product correctness. |
| 4 | Harden cost controls with persisted call/image/quota accounting. | High | M | Current caps fail open and miss failed calls. |
| 5 | Tighten RLS to published-only raw source access. | High | S/M | The current public policy exposes the editorial inbox. |
| 6 | Rewrite README and env docs around v3. | High | S | Current setup docs send agents/users into the wrong product. |
| 7 | Add pipeline integration tests with a fake Supabase adapter. | High | M | The current helper tests do not protect the behavior that matters. |
| 8 | Add image fallback to source `og:image` or stored feed media. | Medium | M | Better visuals without extra OpenAI spend. |
| 9 | Disable or remove dormant Stripe routes. | Medium | S | Prevents dead `/upgrade` and `/settings` flows from surviving. |
| 10 | Collapse serial learn page queries into a route/helper with typed DTO. | Medium | S | Reduces drift between page and API and simplifies future caching. |

### Highest-Leverage First Change

OPINION:

Fix ingestion scoring first. Not frontend, not image polish, not Stripe cleanup.

Why: if the raw story ranking is wrong, every downstream step turns bad inputs into prettier bad outputs. The specific first patch should:

1. Make Reddit/arXiv source rows source-specific.
2. Update existing `source_items` engagement scores instead of ignoring duplicates.
3. Snapshot all fetched item IDs.
4. On topic merge, update aggregate score/platform/source fields.
5. Add one integration test proving a repeated item gets a second engagement snapshot and changes velocity.

### What Would Make Content Higher-Signal

FACT:

The app currently feeds Claude source titles/snippets/descriptions, not full article bodies. Evidence: `src/lib/ingest/fetchers/rss.ts:84`, `src/lib/ingest/fetchers/youtube.ts:147`, `src/lib/ingest/fetchers/arxiv.ts:47`, `src/lib/ingest/fetchers/github.ts:92`.

OPINION:

Higher signal needs novelty and consequence, not just summaries. Add:

- Novelty detection: compare against recent published topics and call out "new since yesterday."
- Evidence density: require at least one concrete number, date, model name, API version, benchmark, price, or release artifact for non-opinion stories.
- Source tiering: official source beats aggregator; arXiv/release notes beat Reddit reaction; YouTube is supplemental.
- Decision line: each card should answer "ignore, watch, try, migrate, or monitor?"
- Negative filter: aggressively suppress generic "top AI tools" and low-source single-channel hype.

### UX/Product Gaps On Day One

FACT:

- Empty feed says "No topics yet today" even feed pulls 3 days. Evidence: `src/app/feed/page.tsx:35`, `src/components/feed/CardStack.tsx:23`.
- Feed cards are horizontally browsed sections, not the InShorts-style single-card swipe described in docs. Evidence: `src/components/feed/CardStack.tsx:40`, `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md:300`.
- There is no visible freshness/last pipeline run state. Health route exists but is cron-secret protected. Evidence: `src/app/api/ingest/health/route.ts:10`.
- There is no "why this was selected" explanation, only source count and key fact. Evidence: `src/components/feed/FeedCard.tsx:94`.
- Learn page renders only generic sections and ignores topic-type-specific fields the prompt may generate. Evidence: `src/components/learn/LearnBrief.tsx:62`, `src/components/learn/LearnBrief.tsx:68`, `src/components/learn/LearnBrief.tsx:74`.

OPINION:

The UI is good enough as a shell, but day-one value depends on confidence: why this story, what changed, what source backed it, and what action to take.

## 5. Pivot / New Direction (Phase 4)

### Is "Personal Single-User AI News Dashboard" The Best Use?

Argument for continuing:

FACT:

- The code already has ingestion across HN, Reddit, RSS, YouTube, arXiv, and GitHub. Evidence: `CLAUDE.md:22`, `src/lib/ingest/orchestrator.ts:51`.
- It already has topic cards, learn briefs, illustrations, and YouTube recs. Evidence: `src/lib/content/card-generator.ts:56`, `src/lib/content/youtube-recs.ts:29`.
- It already has public feed/learn routes and daily cron. Evidence: `src/app/feed/page.tsx:1`, `src/app/learn/[slug]/page.tsx:1`, `vercel.json:9`.

OPINION:

For a personal tool, this is worth improving. You can make it useful for yourself in a week if you focus on ranking and evidence.

Argument against continuing as-is:

OPINION:

"AI news dashboard" is generic and crowded. Without strong novelty detection and actionability, it becomes another prettier feed. The code's latent advantage is not "news"; it is automated multi-source synthesis into a point of view.

### Direction 1: AI Change Radar For Builders

Thesis: A daily briefing that tells builders what changed in AI tooling/models/APIs, why it matters, and whether to try/migrate/ignore.

Who it is for: founders, staff engineers, AI product leads.

Reuse:

- Ingestion, clustering, card generation, learn brief, source links, YouTube recs.

Throw away or de-emphasize:

- InShorts-style endless feed.
- Generic category art.
- Dormant Stripe/auth leftovers.

Lift: Medium.

Main risk: Requires better source tiering and novelty detection, not just summarization.

Why current code makes it cheap: Topics already include platform/source counts and generated learn briefs; prompts can be adapted to produce "action recommendation" and "new since last run."

### Direction 2: AI Launch Diff Tracker

Thesis: Track official changelogs, releases, model cards, GitHub releases, and docs changes; output diffs and migration notes.

Who it is for: devtools teams, AI platform teams, people who maintain production AI systems.

Reuse:

- RSS/GitHub ingestion, clustering, cards, Supabase schema.

Throw away or reduce:

- Reddit/YouTube as primary sources.
- General AI news.

Lift: Medium/Large.

Main risk: Needs page/document diffing and source canonicalization.

Why current code makes it cheap: Source registry, scheduler, topic pipeline, and card generation already exist; you would add canonical official-source fetchers and diff storage.

### Direction 3: Evidence-Backed AI Briefing Newsletter / Artifact

Thesis: Instead of a dashboard, generate one polished daily artifact: "5 things in AI that changed, with evidence and recommended action."

Who it is for: busy technical operators; distribution via email/Slack/Notion/Markdown.

Reuse:

- Ingestion, ranking, synthesis, source links.

Throw away or reduce:

- Swipe UI and per-topic learn pages as primary surface.

Lift: Small/Medium.

Main risk: Distribution and habit formation; output must be consistently excellent.

Why current code makes it cheap: Cron already runs daily, cards already exist, and `topic_cards` can be assembled into a digest without major schema changes.

### Direction 4: AI Research-To-Product Translator

Thesis: Turn arXiv/GitHub/model-release signals into "what product teams can do with this."

Who it is for: PMs, applied AI engineers, startup founders.

Reuse:

- arXiv/GitHub/RSS ingestion, learn page, visual explanations.

Throw away or reduce:

- Broad Reddit/HN/YouTube news.
- General industry noise.

Lift: Medium.

Main risk: Requires deeper technical parsing and more domain-specific prompts.

Why current code makes it cheap: Topic types already distinguish `research_paper`, and learn briefs already support structured sections.

### Direction 5: Agentic Watchlist For Specific AI Bets

Thesis: User defines watch topics ("local coding agents," "OpenAI API changes," "Claude computer use," "EU AI Act"). The system monitors sources and emits alerts only when meaningful deltas happen.

Who it is for: one person first; later teams.

Reuse:

- Ingestion, clustering, relevance classifier, cron, card generation.

Throw away or defer:

- Global feed as main product.
- Stripe until teams exist.

Lift: Large.

Main risk: Needs watchlist data model, routing, and alert thresholds.

Why current code makes it cheap: The pipeline is already source-driven and topic-oriented; watchlists are a filter/ranking layer, not a total rebuild.

### Latent Unfair Advantage

OPINION:

The underexploited asset is multi-source fusion plus voice. Most tools either summarize one link or list many links. This code can become the thing that says: "This story is real because it appeared in official docs + GitHub + practitioner discussion; here is the action." That source-fusion confidence layer is more defensible than another feed UI.

### Strong Recommendation

OPINION:

Pivot/sharpen. Do not continue as-is.

Keep the technical foundation, but reposition from "personal AI news dashboard" to "AI change radar for builders." Fix ingestion correctness first, add evidence-backed generation second, then ship a daily artifact/feed hybrid. The current app is close enough to be useful, but the current positioning is too soft and the ranking/grounding is too weak to deserve more UI polish yet.

## 6. Prioritized Backlog

| Rank | Item | Type | Impact | Effort | File(s) |
|---:|---|---|---|---|---|
| 1 | Update existing `source_items` and snapshot all fetched rows so engagement velocity is real. | bug | Critical | M | `src/lib/ingest/orchestrator.ts`, `src/lib/ingest/scorer.ts` |
| 2 | Make Reddit and arXiv fetchers source-specific or collapse duplicate platform sources. | bug | Critical | M | `src/lib/ingest/orchestrator.ts`, `src/lib/ingest/fetchers/reddit.ts`, `src/lib/ingest/fetchers/arxiv.ts`, `supabase/schema-v2.sql` |
| 3 | Tighten RLS so raw source tables are readable only through published topics or service routes. | security | Critical | S/M | `supabase/migration-v3.sql`, new migration |
| 4 | Release `generating` claims immediately when `generateCard` returns `null`. | bug | High | S | `src/lib/content/orchestrator.ts`, `src/lib/content/card-generator.ts` |
| 5 | Add real claim/source grounding verification before publishing cards. | feature | High | M | `src/lib/content/card-quality.ts`, `src/lib/content/card-generator.ts`, `src/lib/content/card-prompts.ts` |
| 6 | Fix feed API contract: implement `date`, sort by `trending_score`, return correct `total`. | bug | High | S | `src/app/api/feed/route.ts`, `e2e/smoke.spec.ts` |
| 7 | On topic merge, update score/platform/source aggregates. | bug | High | S/M | `src/lib/ingest/orchestrator.ts` |
| 8 | Persist API/image/quota usage independent of successful `topic_cards` rows. | cost | High | M | `src/lib/content/orchestrator.ts`, `src/lib/ratelimit.ts`, new table/migration |
| 9 | Rewrite README for v3 and document real env vars/migrations. | cleanup | High | S | `README.md`, `.env.local.example` |
| 10 | Add `OPENAI_API_KEY` and Upstash Redis vars to env example. | cleanup | High | S | `.env.local.example` |
| 11 | Add Supabase Storage bucket/policy setup for `topic-illustrations`. | bug | Medium | S | `src/lib/supabase/storage.ts`, new migration/script |
| 12 | Implement image fallback from source media/`og:image` before category placeholder. | feature | Medium | M | `src/lib/content/card-generator.ts`, source fetchers, schema if needed |
| 13 | Batch or concurrency-limit engagement snapshot writes. | performance | Medium | S | `src/lib/ingest/orchestrator.ts` |
| 14 | Return accurate degraded/down health for Reddit and other zero-result fetchers. | reliability | Medium | S | `src/lib/ingest/fetchers/reddit.ts`, source fetchers |
| 15 | Add bounded retry/backoff for source APIs and YouTube calls. | reliability | Medium | S/M | `src/lib/ingest/fetchers/*`, `src/lib/content/youtube-recs.ts`, `src/lib/content/retry.ts` |
| 16 | Show an explicit feed error state instead of empty state on DB failure; hide raw DB errors from API clients. | reliability | Medium | S | `src/app/feed/page.tsx`, `src/app/api/feed/route.ts` |
| 17 | Pass/display actual `source_count`; keep platform count separate. | bug | Medium | S | `src/app/feed/page.tsx`, `src/app/api/feed/route.ts`, `src/components/feed/FeedCard.tsx` |
| 18 | Filter empty source URLs before rendering. | bug | Medium | S | `src/app/learn/[slug]/page.tsx`, `src/app/api/learn/[slug]/route.ts`, `src/components/learn/SourceList.tsx` |
| 19 | Add proper YouTube branding/attribution treatment. | compliance | Medium | S | `src/components/learn/LearnBrief.tsx`, `src/components/learn/VideoRecommendation.tsx` |
| 20 | Check all required keys before quota-spending operations. | cost | Medium | S | `src/lib/content/youtube-recs.ts`, `src/lib/content/image-generator.ts` |
| 21 | Disable or remove dormant Stripe routes until monetization exists. | cleanup | Medium | S | `src/app/api/stripe/*`, `supabase/schema-v2.sql` |
| 22 | Make migrations idempotent and create one canonical fresh-install path. | cleanup | Medium | M | `supabase/*.sql`, scripts |
| 23 | Decide evergreen strategy: seed/display or delete static evergreen content. | cleanup | Medium | S/M | `src/lib/content/evergreen.ts`, `src/app/api/content/restore-evergreens/route.ts` |
| 24 | Add mocked pipeline integration tests for ingest/scoring/generation. | feature | High | M | `src/__tests__/`, `src/lib/ingest/*`, `src/lib/content/*` |
| 25 | Add a `test` script for Vitest. | cleanup | Medium | S | `package.json` |
| 26 | Collapse learn page/API fetching into one typed helper/DTO. | performance | Medium | S | `src/app/learn/[slug]/page.tsx`, `src/app/api/learn/[slug]/route.ts` |
| 27 | Remove stale auth/search CSS, robots entries, and analytics helpers. | cleanup | Low | S | `src/app/globals.css`, `src/app/robots.ts`, `src/lib/analytics.ts` |
| 28 | Derive site URL from env instead of hardcoding `topsnip.co`. | cleanup | Low | S | `src/app/layout.tsx`, `src/app/sitemap.ts` |
| 29 | Reposition product to "AI change radar for builders" and add action/novelty fields to cards. | pivot | Very high | M | prompts, `topic_cards`, UI |
| 30 | Generate a daily briefing artifact from top cards. | pivot | High | M | new digest route/job, `topic_cards` |

## 7. Changes I Made

none

## 8. Open Questions For The Human

1. Has `supabase/migration-v3.sql`, `migration-v4-ai-sources.sql`, and `migration-v5-hardening.sql` actually been applied in production, and in what order?
2. Is the Supabase Storage bucket `topic-illustrations` already created manually in production?
3. Is Upstash Redis configured in production, or are quota/cost controls currently fail-open?
4. Do you want this to remain private/personal, or is `topsnip.co` meant to become public-facing?
5. Are Reddit sources acceptable long-term if there is any monetization, given the spec's own licensing warning?
6. What is the intended primary output: web feed, daily artifact, email/Slack brief, or agentic alerts?
7. Should official sources be weighted above Reddit/YouTube reaction content, even if reaction content has higher engagement?
8. Do you want Stripe fully removed for now, or kept as explicit disabled stubs?
