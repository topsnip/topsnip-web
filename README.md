# TopSnip v3

TopSnip is a personal AI intelligence dashboard. It ingests AI-related signals from official blogs, HN, Reddit, YouTube metadata, arXiv, and GitHub releases; clusters them into topics; generates short cards and visual learn briefs; then publishes a public feed.

## Current Product

- `/feed`: recent AI topic cards
- `/learn/[slug]`: source-backed deep dive for one topic
- `/briefing`: daily builder-focused briefing, once implemented
- No auth in v3
- Stripe is disabled in v3
- YouTube transcript scraping is not used

## Pipeline

1. `GET/POST /api/ingest/run` with `Authorization: Bearer $CRON_SECRET`
2. Fetch source metadata/items
3. Update `source_items`
4. Cluster and score topics
5. `GET/POST /api/content/generate` with `Authorization: Bearer $CRON_SECRET`
6. Generate card + learn brief
7. Verify grounding
8. Generate or fall back image
9. Pick YouTube recommendations from Data API metadata
10. Publish topic

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Apply Supabase SQL in order:

1. `supabase/schema-v2.sql`
2. `supabase/migration-v3.sql`
3. `supabase/migration-v4-ai-sources.sql`
4. `supabase/migration-v5-hardening.sql`
5. `supabase/migration-v6-review-remediation.sql`

## Environment Variables

See `.env.local.example`.

Required for local read-only UI:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for pipeline:

- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `YOUTUBE_API_KEY`

Recommended for production cost controls:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:

- `GITHUB_TOKEN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## Verification

```bash
npm test
npm run lint
npm run build
```

## Legal Notes

- Always link sources.
- Do not scrape YouTube transcripts.
- YouTube recommendations use Data API metadata and link to youtube.com.
- Generated copy must be source-grounded and rewritten in TopSnip voice.
- Reddit usage must be reassessed before monetization.
