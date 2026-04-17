# TopSnip v3 — Claude Code Instructions

## What This Is

TopSnip is a **Personal AI Intelligence Dashboard** — keeps one user current on everything happening in AI.

**Two pages:** Feed (InShorts-style cards) + Learn (visual deep-dive per topic).
**No auth, no tiers, no multi-user.** Personal tool first.

**One-liner:** "Your AI intelligence feed. No noise, just signal."

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend + API | Next.js 16 (App Router) on Vercel |
| Styling | Tailwind CSS 4 |
| Database | Supabase (Postgres + RLS) |
| LLM | Claude Sonnet 4.5 (card generation) + Haiku 4.5 (YouTube recs) |
| Images | DALL-E 3 (illustrations) via OpenAI API |
| Payments | Stripe (dormant — kept for future) |
| Sources | HN Algolia, Reddit, RSS, YouTube Data API, arXiv, GitHub |

## Project Context

| Doc | Location |
|-----|----------|
| v3 Spec | `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md` |
| Implementation Plan | `docs/superpowers/plans/2026-04-09-topsnip-v3-implementation.md` |
| Legal Review | `.claude/research/topsnip-v3/legal-review.md` |
| Brainstorm Note | Vault: `Projects/Brainstorms/2026-04-09 topsnip-v3-personal-dashboard.md` |
| v2 Archive | Vault: `Projects/TopSnip-v2-archive/` |
| Memory | `.claude/projects/c--Users-surya-topsnip-web/memory/` |

## Database

- **Schema**: `supabase/schema-v2.sql` (base schema)
- **v3 Migration**: `supabase/migration-v3.sql` (topic_cards, RLS updates, youtube_recs FK)

### Key Tables

| Table | Purpose |
|-------|---------|
| `sources` | RSS feeds, APIs we monitor |
| `source_items` | Individual ingested posts/articles |
| `topics` | AI topics detected across sources |
| `topic_cards` | v3 card + learn brief (one per topic) |
| `youtube_recommendations` | Curated video links (via topic_id) |
| `tags` + `topic_tags` | Topic categorization |

### Deprecated Tables (still in DB, not used by v3)
- `topic_content` — replaced by `topic_cards`
- `profiles`, `user_reads`, `user_searches`, `daily_digests` — no auth in v3

## API Routes

### Feed + Learn
- `GET /api/feed` — Today's published cards (paginated, by date)
- `GET /api/learn/[slug]` — Full card + learn brief + YouTube recs + sources

### Ingestion (cron-triggered, CRON_SECRET required)
- `POST /api/ingest/run` — Full ingestion cycle (fetch → cluster → score)
- `POST /api/content/generate` — Generate cards for detected topics
- `GET /api/ingest/health` — Source health status

### Billing (dormant)
- `POST /api/stripe/checkout` — Create checkout session
- `POST /api/stripe/webhook` — Stripe webhook handler
- `POST /api/stripe/portal` — Customer billing portal

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Redirect to `/feed` |
| `/feed` | InShorts-style card feed |
| `/learn/[slug]` | Visual deep-dive with illustration + YouTube recs |

## Content Pipeline

1. **Ingest** — Fetch from 6 sources → upsert to `source_items`
2. **Cluster** — SimHash + Jaccard dedup → detect `topics`
3. **Generate** — Claude Sonnet produces card (60-word summary) + learn brief + illustration prompt
4. **Illustrate** — DALL-E 3 generates diagram, uploaded to Supabase Storage
5. **Quality Check** — 4-dimension scorer (factual, voice, completeness, brevity), min 50/100
6. **YouTube Recs** — YouTube Data API search → Claude Haiku picks top 2-3
7. **Publish** — Topic status → "published", appears in feed

## Conventions

- Dark mode only — #080808 background, #7C6AF7 accent, #F0F0F0 text
- Inter font (400-800) + Geist Mono for code
- All content rewritten in TopSnip voice (legal protection + brand identity)
- Always link to source articles
- YouTube attribution on all video recommendations
- No auth required — all pages are public
- RLS: public read for published content, service-role write for pipelines

## What NOT to Do

- Do NOT add auth, onboarding, or user accounts (personal tool)
- Do NOT add role-based content (no roles in v3)
- Do NOT scrape YouTube transcripts (legal risk)
- Do NOT reproduce source article narrative/phrasing (copyright risk — synthesize facts only)
- Do NOT build a light mode
- Do NOT add search functionality (not in v3 scope)
- Do NOT reference `topic_content`, `profiles`, `user_reads`, `daily_digests` (deprecated)
- Do NOT reference `src/lib/content/generator.ts`, `enricher.ts`, `quality.ts`, `formats/` (deleted, archived in vault)

## Coding Principles (Karpathy)

Source: https://github.com/forrestchang/andrej-karpathy-skills (merged 2026-04-17)
Tradeoff: these bias toward caution over speed. Use judgment on trivial tasks.

### 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Sanity check: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**Working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, clarifying questions come before implementation rather than after mistakes.
