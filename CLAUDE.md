# TopSnip v2 — Claude Code Instructions

## What This Is

TopSnip is an **AI Learning Intelligence Platform** — a learning destination for anyone curious about AI.

**Two modes:** Passive feed (3-5 trending topics/day) + Active search (on-demand explainers).
**Two tiers:** Free (General, 3 searches/day) + Pro ($9.99/mo — role-specific, unlimited, knowledge tracking).

**One-liner:** "Come learn something. Leave knowing it. In 3 minutes, not 3 hours."

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend + API | Next.js 16 (App Router) on Vercel |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database + Auth | Supabase (Postgres + RLS + Auth) |
| LLM | Claude (Anthropic API) — streaming via Vercel AI SDK |
| Payments | Stripe ($9.99/mo or $79/year) |
| Source Monitoring | HN Algolia, Reddit PRAW, RSS, YouTube Data API, arXiv, GitHub |

## Project Context

| Doc | Location |
|-----|----------|
| Product Spec | `Projects/Topsnip/product-spec-v1.md` (in Nikunj's Vault) |
| Execution Plan | `Projects/Topsnip/execution-plan-v2.md` |
| Brand Guide | `Projects/Topsnip/brand-style-guide.md` |
| Research | `Projects/Topsnip/research-*.md` |
| Memory | `C:\Users\surya\.claude\projects\c--Users-surya\memory\project_topsnip.md` |

## Database

- **Schema**: `supabase/schema-v2.sql` (complete, standalone)
- **Migration**: `supabase/migration-v2.sql` (from old schema → new)
- **Old schema**: `supabase/schema.sql` (DEPRECATED — kept for reference only)

### Key Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts + role + interests + billing |
| `sources` | RSS feeds, APIs we monitor |
| `source_items` | Individual ingested posts/articles |
| `topics` | AI topics detected across sources |
| `topic_content` | Generated explainers (one per topic × role) |
| `youtube_recommendations` | "Go Deeper" video links |
| `user_reads` | Knowledge tracking (what user has read) |
| `user_searches` | Search history |
| `daily_digests` | Pre-computed feed per role per day |
| `tags` | Topic categories (for interests + filtering) |
| `anonymous_searches` | IP-based tracking for 1 free search on landing |

## API Routes

### Content
- `GET /api/feed` — Today's trending topics for user's role
- `GET /api/topic/[slug]` — Full topic detail (role-specific)
- `POST /api/search` — On-demand search (streaming, anonymous allowed 1/day)
- `GET /api/topics/recent` — Recent topics

### User
- `GET/PATCH /api/user/profile` — Profile + preferences
- `POST /api/user/onboarding` — Complete onboarding
- `POST /api/user/read` — Mark topic as read
- `GET /api/user/knowledge` — Knowledge summary (Pro)

### Billing (existing)
- `POST /api/stripe/checkout` — Create checkout session
- `POST /api/stripe/webhook` — Stripe webhook handler
- `POST /api/stripe/portal` — Customer billing portal

### Ingestion (internal, cron-triggered)
- `POST /api/ingest/run` — Full ingestion cycle
- `POST /api/ingest/generate` — Content generation for detected topics
- `POST /api/ingest/digest` — Build daily digest per role
- `GET /api/ingest/health` — Source health status

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page (value prop + anonymous search) |
| `/auth` | Sign up / sign in |
| `/onboarding` | Role + interest picker |
| `/feed` | Daily trending topics |
| `/topic/[slug]` | Full topic explainer |
| `/search?q=` | On-demand search results |
| `/settings` | Role, interests, billing |
| `/upgrade` | Pro pricing + checkout |

## Conventions

- Dark mode only — no light mode
- Inter font family (400-800) + Geist Mono for code
- Brand: #080808 background, #7C6AF7 accent, #F0F0F0 text
- All API routes in `src/app/api/`
- Supabase server client via cookies (`@supabase/ssr`)
- Service-role client for writes that bypass RLS (webhooks, ingestion)
- RLS on every table — users only see their own data
- Source citations on every piece of generated content
- Streaming responses for on-demand search (Vercel AI SDK)

## What NOT to Do

- Do NOT use YouTube transcript scraping — deprecated
- Do NOT reference `services/transcripts/` — deleted
- Do NOT reference `search_cache` or `search_history` tables — dropped
- Do NOT build a light mode
- Do NOT add a second accent color
- Do NOT gate content quality by tier — only gate volume
