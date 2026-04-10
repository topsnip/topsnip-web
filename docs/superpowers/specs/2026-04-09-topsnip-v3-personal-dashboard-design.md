# TopSnip v3 — Personal AI Intelligence Dashboard

**Date:** 2026-04-09
**Status:** Review Complete
**Type:** Software Spec
**Repo:** topsnip-web (main branch, in-place refactor)

---

## 1. Overview

### What
A personal AI intelligence dashboard that keeps one user (the developer) current on everything happening in AI — without watching hours of YouTube or reading newsletters.

### Why
The AI landscape moves too fast. YouTubers who cover AI news are just reading official sources and making videos. This tool goes straight to those sources, clusters the signal, synthesizes it in a distinct voice, generates visual explanations, and recommends only the videos worth watching.

### Two Modes
1. **Feed** — InShorts-style swipeable cards. Headline + image + 60-word summary. Scan in 2 minutes.
2. **Learn** — Visual deep-dive per topic. AI-generated illustration/diagram, "what it is + why it matters" explainer, curated YouTube videos.

### What This Is NOT
- Not a multi-user SaaS (yet)
- Not a newsletter or email product
- Not a search engine
- Not a video summarizer (no transcript access)

---

## 2. Data Sources

All sources use official, legal APIs. No scraping. No transcript extraction.

| Source | API | What We Get | Legal Status |
|--------|-----|-------------|--------------|
| **HN** | Algolia API | Titles, URLs, scores, comment counts | Public, no restrictions |
| **Reddit** | Public JSON API | Titles, URLs, scores, subreddit | Free tier, non-commercial only |
| **RSS** | xml2js parser | Titles, excerpts, URLs, og:images | Implied license via RSS publication |
| **YouTube** | Data API v3 | Titles, descriptions, view counts, channel names, durations | API key, 10K quota/day, attribution required |
| **arXiv** | Public API | Titles, abstracts, authors, IDs | CC0 metadata, fully free |
| **GitHub** | REST API | Repo names, descriptions, stars, forks, trending | Public, standard rate limits |

### Source Configuration

Reuse existing `sources` table. Active sources for v3:

**RSS feeds to add (official AI company blogs):**
- Anthropic Blog (https://www.anthropic.com/blog/rss)
- OpenAI Blog (https://openai.com/blog/rss.xml)
- Google AI Blog (https://blog.google/technology/ai/rss/) — verify URL at implementation time
- Meta AI Blog (https://ai.meta.com/blog/rss/) — verify URL at implementation time
- Microsoft AI Blog (https://blogs.microsoft.com/ai/feed/) — verify URL at implementation time
- Hugging Face Blog (https://huggingface.co/blog/feed.xml) — verify URL at implementation time

Note: Some company blogs may not offer RSS. At implementation time, verify each URL and fall back to scraping the blog index page via RSS-bridge or similar if no native RSS exists.

**Existing sources to keep:** HN (AI filter), Reddit (r/MachineLearning, r/LocalLLaMA, r/artificial), arXiv (cs.AI, cs.CL, cs.LG), GitHub trending, YouTube AI channels.

**Sources to consider dropping if monetized:** Reddit (requires $12K/year commercial contract).

---

## 3. Pipeline Architecture

### 3.1 Ingestion (Reuse v2)

**File:** `src/lib/ingest/orchestrator.ts`

No changes needed. The existing pipeline:
1. Loads active sources from DB
2. Parallel-fetches all platforms
3. Sanitizes + validates URLs
4. Upserts into `source_items` with engagement scores
5. Snapshots engagement history for velocity tracking

**Trigger:** `POST /api/ingest/run` (CRON_SECRET auth)
**Schedule:** Every 2 hours via Vercel Cron
**Timeout:** 110s (Vercel 120s limit)

### 3.2 Clustering & Topic Detection (Reuse v2)

**Files:** `src/lib/ingest/simhash.ts`, `clusterer.ts`, `scorer.ts`

No changes needed. Two-pass clustering:
1. SimHash near-duplicate detection (Hamming distance ≤ 3)
2. Entity-based Jaccard merge (similarity ≥ 0.4)

Trending score: `velocity × source_diversity × recency`

### 3.3 Topic Classification (Reuse v2)

**File:** `src/lib/content/topic-classifier.ts`

No changes. Six topic types drive format-specific generation:
- industry_news, tool_launch, research_paper, regulatory, tutorial, opinion_debate

### 3.4 Content Generation (Refactor)

**File:** `src/lib/content/orchestrator.ts` (refactor)

**Current v2 flow:** Generates 4 role-specific long-form briefs per topic.
**New v3 flow:** Generates 1 card + 1 learn brief + 1 illustration prompt per topic.

#### Generation Steps per Topic:

**Step 1 — Card Generation (Sonnet)**
Input: Topic title + source snippets + topic_type
Output:
```json
{
  "headline": "string (max 15 words, punchy)",
  "summary": "string (max 60 words, InShorts-style, TopSnip voice)",
  "key_fact": "string (one standout number or claim)",
  "category_tag": "string (e.g., 'Model Launch', 'Research', 'Tool Update')"
}
```

**Step 2 — Learn Brief Generation (Sonnet)**
Input: Topic title + all source snippets + topic_type + format schema
Output (varies by topic_type, but always includes):
```json
{
  "what_it_is": "string (2-3 sentences, visual language, explain the concept)",
  "why_it_matters": "string (2-3 sentences, personal relevance)",
  "key_details": ["array of 3-5 bullet points with specifics"],
  "illustration_description": "string (describes ideal diagram/visual for this topic)",
  "sources": [{"title": "string", "url": "string"}]
}
```

Additional fields per topic_type:
- tool_launch: `pricing`, `compared_to`, `getting_started`
- research_paper: `key_findings`, `methodology_tldr`, `limitations`
- tutorial: `steps[]`, `prerequisites`
- (Other types follow existing v2 format schemas, adapted to remove role-specific language)

**Step 3 — Illustration Prompt Generation (Sonnet)**
Input: Topic title + `illustration_description` from Step 2
Output: A detailed image generation prompt optimized for DALL-E 3 or Flux.
Style: Clean, minimal, dark-background diagrams. Brand colors (#080808 bg, #7C6AF7 accent, #F0F0F0 text). Infographic style, not photorealistic.

**Step 4 — Image Generation (DALL-E 3 / Flux)**
Input: Illustration prompt from Step 3
Output: Image URL (stored in Supabase Storage or external CDN)
Fallback: Use og:image from the highest-engagement source item if image generation fails or is too expensive.

**Step 5 — YouTube Recommendations (Refactor from v2)**
Input: Topic title + topic_id
Process: Search YouTube Data API → Claude Haiku selects top 2-3 → save to `youtube_recommendations`

Refactor required in `youtube-recs.ts`:
- Remove `topic_content_id` lookup via `topic_content` table (lines 153-166 of current code)
- Write directly with `topic_id` instead
- Remove role-based filtering from Haiku selection prompt
- Remove `role = 'general'` filter from content lookup

**Step 6 — Quality Check (Reuse v2, adapted)**
Reuse the 4-dimension quality scorer but adapt criteria:
1. Factual Grounding — claims traceable to sources
2. Actionability — what can the reader do with this info
3. Voice Compliance — TopSnip voice, no banned phrases, no source narrative reproduction
4. Brevity — card ≤ 60 words, learn brief sections ≤ 3 sentences each

Min threshold: 50/100. Auto-reject if any dimension < 8.

### 3.5 Voice & Synthesis Rules

**Core voice (from v2, refined):**
- Smart but not academic
- Direct — lead with the point
- Slightly dry wit
- Opinionated — take a position
- Specific — name the tool, version, price

**v3 additions:**
- "Rewrite all facts in TopSnip's original voice. Never reproduce the phrasing, narrative structure, or editorial framing of source articles."
- "You are writing for one person who is deep in the AI space but overwhelmed by volume. Be the filter, not the firehose."
- "When explaining concepts, prefer visual language: 'think of it as...', 'picture this...', 'the diagram would show...'"

**Banned (carried from v2):**
- "game-changer", "revolutionary", "exciting", "groundbreaking"
- "In today's rapidly evolving landscape"
- Throat-clearing openers
- Any phrasing that reads like a press release

---

## 4. Database Schema Changes

### Keep (with modifications)
- `sources` — monitored platforms (no changes)
- `source_items` — individual ingested posts (no changes)
- `topics` — detected/published topics (no changes)
- `topic_sources` — join table (topics ↔ source_items) (no changes)
- `youtube_recommendations` — curated video links (**FK migration required**, see below)
- `tags` + `topic_tags` — topic categorization (no changes)

### New Table: `topic_cards`

Replaces `topic_content` (which was role-based).

```sql
CREATE TABLE topic_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  
  -- Card (feed page)
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,  -- 60 words max
  key_fact TEXT,
  category_tag TEXT,
  image_url TEXT,  -- AI-generated or og:image fallback
  
  -- Learn brief (learn page)
  learn_brief JSONB NOT NULL DEFAULT '{}',
  -- Structure: { what_it_is, why_it_matters, key_details[], 
  --              illustration_description, sources[],
  --              ...topic_type-specific fields }
  
  -- Metadata
  illustration_prompt TEXT,  -- stored for regeneration
  quality_score INTEGER DEFAULT 0,
  generated_by TEXT DEFAULT 'claude-sonnet-4-5',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_topic_card UNIQUE (topic_id)
);

-- Index for feed queries
CREATE INDEX idx_topic_cards_quality ON topic_cards(quality_score);
```

### Drop (v2 tables no longer needed)
- `topic_content` — replaced by `topic_cards`
- `profiles` — no auth for personal tool
- `user_reads` — no tracking
- `user_searches` — no search feature
- `daily_digests` — feed is real-time, not pre-computed
- `search_cache` — no search feature
- `anonymous_searches` — no anonymous tracking

### Keep But Unused (don't drop, just ignore)
- Auth-related Supabase tables — Supabase manages these, leave them

### youtube_recommendations FK Migration

The existing `youtube_recommendations` table has `topic_content_id` referencing `topic_content(id)`. Since `topic_content` is being replaced by `topic_cards`, migrate as follows:

```sql
-- Add new FK column
ALTER TABLE youtube_recommendations ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;

-- Backfill from existing data (topic_content → topic)
UPDATE youtube_recommendations yr
SET topic_id = tc.topic_id
FROM topic_content tc
WHERE yr.topic_content_id = tc.id;

-- Drop old FK column
ALTER TABLE youtube_recommendations DROP COLUMN topic_content_id;

-- Make topic_id NOT NULL after backfill
ALTER TABLE youtube_recommendations ALTER COLUMN topic_id SET NOT NULL;

-- Add index
CREATE INDEX idx_youtube_recs_topic ON youtube_recommendations(topic_id);
```

The `findAndSaveYouTubeRecs` function in `youtube-recs.ts` must be refactored to look up and write via `topic_id` directly instead of going through `topic_content`.

### RLS Policy for topic_cards

Since auth is removed and this is a personal tool, set a permissive read policy:

```sql
ALTER TABLE topic_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON topic_cards FOR SELECT USING (true);
CREATE POLICY "Allow service write" ON topic_cards FOR ALL USING (auth.role() = 'service_role');
```

### Migration Strategy
- Create `topic_cards` table with RLS policies
- Run `youtube_recommendations` FK migration
- Don't drop old tables immediately — just stop writing to them
- Remove `buildDailyDigests` call from content orchestrator
- Can clean up old tables later once v3 is stable

---

## 5. Frontend

### 5.1 Pages

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Redirect to `/feed` | No |
| `/feed` | InShorts-style card feed | No |
| `/learn/[slug]` | Visual deep-dive for a topic | No |

Everything else from v2 is removed or hidden.

### 5.2 Feed Page (`/feed`)

**Layout:** Full-screen card stack. One card visible at a time. Swipe up/scroll to advance.

**Card anatomy:**
```
┌─────────────────────────────┐
│                             │
│     [AI-Generated Image     │
│      or og:image]           │
│                             │
├─────────────────────────────┤
│  CATEGORY TAG               │
│                             │
│  Headline (max 15 words)    │
│                             │
│  60-word summary in         │
│  TopSnip voice. Direct,     │
│  punchy, tells you what     │
│  happened and why you       │
│  should care.               │
│                             │
│  KEY FACT: "2.5x faster     │
│  than GPT-4o on coding"     │
│                             │
│  ───────────────────────    │
│  📰 3 sources · 2h ago      │
│  [Learn More →]             │
└─────────────────────────────┘
```

**Behavior:**
- Load today's published topics ordered by trending_score DESC
- Infinite scroll / swipe between cards
- "Learn More" navigates to `/learn/[slug]`
- Pull-to-refresh triggers a feed refresh
- Source count and recency shown on each card

**Data fetching:**
- Server component: fetch topics + topic_cards where status='published', ordered by trending_score
- No auth check, no role filtering
- Include topic metadata (platform_count, trending_score, published_at)

### 5.3 Learn Page (`/learn/[slug]`)

**Layout:** Single-page visual deep-dive.

**Sections (top to bottom):**

```
┌─────────────────────────────────┐
│  ← Back to Feed                 │
│                                 │
│  CATEGORY TAG · 2h ago          │
│  ═══════════════════════════    │
│  Topic Headline                 │
│  (larger, prominent)            │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  [AI-Generated            │  │
│  │   Illustration/Diagram]   │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  WHAT IT IS                     │
│  2-3 sentences explaining the   │
│  concept in visual language.    │
│                                 │
│  WHY IT MATTERS                 │
│  2-3 sentences on personal      │
│  relevance.                     │
│                                 │
│  KEY DETAILS                    │
│  • Bullet point 1               │
│  • Bullet point 2               │
│  • Bullet point 3               │
│                                 │
│  [Topic-type specific sections] │
│  (pricing, steps, findings...)  │
│                                 │
│  ═══════════════════════════    │
│  WORTH WATCHING                 │
│  ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ YT  │ │ YT  │ │ YT  │      │
│  │vid 1│ │vid 2│ │vid 3│      │
│  └─────┘ └─────┘ └─────┘      │
│  (thumbnail + title + channel   │
│   + duration + reason)          │
│                                 │
│  ═══════════════════════════    │
│  SOURCES                        │
│  • Source 1 (linked)            │
│  • Source 2 (linked)            │
│  • Source 3 (linked)            │
│                                 │
│  YouTube branding/attribution   │
└─────────────────────────────────┘
```

**YouTube Attribution:** Per API ToS, YouTube video recommendations must be clearly labeled with YouTube branding. Video thumbnails must link to youtube.com, not be embedded (to avoid additional ToS complexity).

### 5.4 Styling

- Dark mode only (#080808 background)
- Accent: #7C6AF7
- Text: #F0F0F0
- Font: Inter (400-800) + Geist Mono for code/technical terms
- Tailwind CSS 4 + shadcn/ui components
- Framer Motion for card transitions and swipe gestures
- Mobile-first (primary consumption device)

### 5.5 Components to Build

| Component | Purpose |
|-----------|---------|
| `FeedCard` | Single InShorts-style card |
| `CardStack` | Swipeable/scrollable card container |
| `LearnBrief` | Full learn page layout (replaces v2 LearningBrief) |
| `TopicIllustration` | Image display with loading/fallback states |
| `VideoRecommendation` | YouTube video card with thumbnail, channel, duration, reason |
| `SourceList` | Linked source citations |
| `CategoryBadge` | Colored tag pill |

### 5.6 Components to Remove

All v2 components related to:
- Auth (sign-in, sign-up, auth gates)
- Onboarding (role picker, interest selector)
- Settings page
- Knowledge tracking / history
- Search
- Upgrade / pricing
- Landing page hero / marketing
- Format-specific briefs (ToolLaunchBrief, ResearchPaperBrief, etc.)
- Skeletons for removed pages

---

## 6. API Routes

### Keep (refactored)
| Route | Change |
|-------|--------|
| `POST /api/ingest/run` | No change — same pipeline |
| `GET /api/ingest/health` | No change |
| `POST /api/content/generate` | Refactor to produce `topic_cards` instead of `topic_content` |

### New
| Route | Purpose |
|-------|---------|
| `GET /api/feed` | Fetch today's published cards (ordered by trending_score) |
| `GET /api/learn/[slug]` | Fetch full learn brief + YouTube recs for a topic |

### API Contracts

**`GET /api/feed`**
```
Query params:
  ?date=YYYY-MM-DD  (optional, defaults to today)
  ?limit=20          (optional, defaults to 20)
  ?offset=0          (optional, for pagination)

Response 200:
{
  "topics": [
    {
      "slug": "string",
      "headline": "string",
      "summary": "string",
      "key_fact": "string | null",
      "category_tag": "string",
      "image_url": "string | null",
      "trending_score": "number",
      "platform_count": "number",
      "published_at": "ISO 8601 string"
    }
  ],
  "total": "number",
  "has_more": "boolean"
}
```

**`GET /api/learn/[slug]`**
```
Response 200:
{
  "topic": {
    "slug": "string",
    "title": "string",
    "category_tag": "string",
    "published_at": "ISO 8601 string",
    "platform_count": "number"
  },
  "card": {
    "headline": "string",
    "summary": "string",
    "image_url": "string | null",
    "learn_brief": { ... },  // JSONB, shape varies by topic_type
    "quality_score": "number"
  },
  "youtube_recs": [
    {
      "video_id": "string",
      "title": "string",
      "channel_name": "string",
      "duration": "string",
      "reason": "string",
      "position": "number"
    }
  ],
  "sources": [
    { "title": "string", "url": "string", "platform": "string" }
  ]
}

Response 404: { "error": "Topic not found" }
```

The learn page fetches everything in one call (card + YouTube recs + sources) to avoid waterfall requests.

### Remove
| Route | Why |
|-------|-----|
| `POST /api/search` | No search feature in v3 |
| `GET /api/feed/check-new` | Simplified — just refresh the feed |
| `GET /api/feed/stats` | No gamification |
| `POST /api/user/*` | No user tracking |
| `POST /api/email/*` | No email digests |
| `GET/PATCH /api/user/profile` | No auth |
| `POST /api/user/onboarding` | No onboarding |

### Keep But Dormant
| Route | Why |
|-------|-----|
| `POST /api/stripe/*` | Keep Stripe integration dormant for future monetization |

---

## 7. Image Generation

### Provider Options

| Provider | Cost | Quality | Speed | API |
|----------|------|---------|-------|-----|
| **DALL-E 3** | ~$0.04/image (1024x1024) | High | 5-15s | OpenAI API |
| **Flux (Replicate)** | ~$0.003/image | Good | 3-8s | Replicate API |
| **Ideogram** | ~$0.01/image | High (text in images) | 5-10s | Ideogram API |

### Recommendation: Start with DALL-E 3
- Best quality for diagrams and infographics
- Reliable API (OpenAI)
- At ~15 topics/day × $0.04 = ~$0.60/day = ~$18/month
- Can switch to Flux later if costs need to drop

### Integration Details

**Package:** `openai` (npm) — add to project dependencies
**Env var:** `OPENAI_API_KEY` — add to Vercel environment variables
**Service file:** `src/lib/content/image-generator.ts`
**Model:** `dall-e-3`, size: `1024x1024`, quality: `standard`

**Daily cap:** Max 20 images per day (circuit breaker to prevent cost runaway). Track count in a simple counter similar to `MAX_DAILY_API_CALLS` pattern in existing content orchestrator.

### Fallback Chain
1. Try DALL-E 3 with illustration prompt (timeout: 30s)
2. If fails/timeout/daily cap hit: use og:image from highest-engagement source item
3. If no og:image: use a category-specific placeholder image (static assets, one per category_tag)

### Image Style Guide
Prompt template prefix:
```
"Clean, minimal infographic on dark background (#080808). 
Purple accent (#7C6AF7). White text (#F0F0F0). 
Modern tech aesthetic. No photorealism. 
Diagram/flowchart style. [topic-specific description]"
```

### Storage

**Bucket:** `topic-illustrations` in Supabase Storage
**Access:** Public read (images are non-sensitive)
**Setup:** Create bucket via Supabase Dashboard or migration with `public = true`
**URL format:** `https://<project-ref>.supabase.co/storage/v1/object/public/topic-illustrations/<topic-slug>.png`
**Retention:** Keep images for 30 days. Run a weekly cleanup job to delete images for archived topics (Supabase free tier: 1GB storage, ~15 images/day × 1MB avg = ~450MB/month before cleanup).
**Upload flow:** Generate image → download to buffer → upload to Supabase Storage → save public URL to `topic_cards.image_url`

---

## 8. Cron Schedule

**Vercel plan note:** Hobby plan limits cron to 1 invocation/day per job. For more frequent updates, upgrade to Vercel Pro ($20/mo) or use an external scheduler (GitHub Actions, n8n, or cron-job.org) to hit the API routes.

### Option A: Vercel Hobby (1x/day) — Start here
| Job | Schedule | Route | Purpose |
|-----|----------|-------|---------|
| Ingest | Daily 8:00 AM UTC | `POST /api/ingest/run` | Fetch + cluster + score |
| Generate | Daily 8:30 AM UTC | `POST /api/content/generate` | Generate cards + briefs + images |

### Option B: External scheduler or Vercel Pro (frequent updates)
| Job | Schedule | Route | Purpose |
|-----|----------|-------|---------|
| Ingest | Every 2 hours | `POST /api/ingest/run` | Fetch + cluster + score |
| Generate | Every 3 hours | `POST /api/content/generate` | Generate cards + briefs + images |

Start with Option A. Move to Option B once daily updates feel insufficient.

Vercel Cron configuration in `vercel.json` (Option A):
```json
{
  "crons": [
    { "path": "/api/ingest/run", "schedule": "0 8 * * *" },
    { "path": "/api/content/generate", "schedule": "30 8 * * *" }
  ]
}
```

---

## 9. Cost Budget (Monthly)

| Service | Estimate | Notes |
|---------|----------|-------|
| Claude Sonnet (generation) | ~$15-25 | ~15 topics/day × 3 calls × 30 days |
| Claude Haiku (quality + YT recs) | ~$2-5 | Cheap, high volume OK |
| DALL-E 3 (images) | ~$15-20 | ~15 topics/day × $0.04 |
| YouTube Data API | Free | Within 10K quota/day |
| Vercel (hosting + cron) | Free tier | Hobby plan sufficient |
| Supabase | Free tier | Well within limits for single user |
| **Total** | **~$35-50/month** | |

---

## 10. Implementation Plan (High Level)

### Phase 1 — Database + Backend (Foundation)
1. Create `topic_cards` table + migration
2. Refactor content generation orchestrator to produce cards instead of role-based content
3. Write new card generation prompt (InShorts-style, TopSnip voice)
4. Write new learn brief generation prompt
5. Integrate DALL-E 3 for illustration generation
6. Update quality scorer for new format
7. Add official AI company blog RSS feeds to sources table

### Phase 2 — Frontend (Feed + Learn)
8. Build `FeedCard` component (InShorts-style card)
9. Build `CardStack` component (swipeable feed)
10. Build feed page (`/feed`) — fetch + render cards
11. Build `LearnBrief` component (visual deep-dive layout)
12. Build learn page (`/learn/[slug]`)
13. Build `VideoRecommendation` component with YouTube attribution
14. Wire up routing: `/` → `/feed`, card tap → `/learn/[slug]`

### Phase 3 — Cleanup + Polish
15. Remove unused v2 pages (auth, onboarding, settings, search, etc.)
16. Remove unused v2 API routes
17. Remove unused v2 components
18. Update `vercel.json` with new cron schedule
19. Mobile-first responsive polish
20. Test full pipeline end-to-end: ingest → cluster → generate → display

---

## 11. Testing Strategy

**Framework:** Vitest (unit + integration), Playwright (e2e)
**Directory:** `src/__tests__/` for unit tests, `e2e/` for Playwright tests

### Pipeline Tests (Vitest)
- Ingestion: mock source APIs, verify items upserted correctly
- Clustering: known duplicate sets, verify merge behavior
- Card generation: verify output matches JSON schema, summary ≤ 60 words (programmatic word count check)
- Learn brief generation: verify all required fields present per topic_type
- Image generation: verify fallback chain (DALL-E fail → og:image → placeholder)
- Image generation: verify daily cap prevents runaway costs
- Quality scorer: verify reject on score < 50 or any dimension < 8
- YouTube recs: verify writes to `youtube_recommendations` with `topic_id` (not `topic_content_id`)

### Frontend Tests (Vitest + React Testing Library)
- Feed page renders cards from DB
- Card displays all required fields (headline, summary, image, category)
- Empty feed state (no topics published today)
- Learn page renders all sections including topic_type-specific fields
- Learn page 404 for non-existent slug
- YouTube recs display with proper YouTube attribution/branding
- Source links are present and clickable

### E2E Tests (Playwright)
- Full flow: load feed → scroll through cards → tap "Learn More" → verify learn page loads
- Mobile viewport: swipe/scroll gestures work
- Image fallback: verify placeholder shows when image_url is null

### Edge Cases to Cover
- Malformed Claude response (invalid JSON) → graceful rejection, topic stays in "detected" status
- Zero YouTube results for a topic → learn page renders without "Worth Watching" section
- All source fetchers fail in a single ingest run → pipeline completes with zero new items, no crash
- DALL-E rate limit / timeout → fallback to og:image

### Programmatic Word Count Enforcement
Add a utility `enforceWordLimit(text: string, max: number): string` in `src/lib/utils/`:
- Count words, truncate at limit if exceeded, append "..." 
- Run on every generated summary AFTER Claude returns, BEFORE DB write
- Log a warning if truncation occurs (indicates prompt needs tuning)

---

## 12. Legal Compliance (Built Into Architecture)

Per [legal review](.claude/research/topsnip-v3/legal-review.md):

1. **Voice transformation:** All synthesis prompts include explicit instruction to rewrite facts in TopSnip voice, never reproducing source narrative structure.
2. **Source attribution:** Every card links to source articles. Every learn page lists all sources.
3. **YouTube attribution:** YouTube branding shown on all video recommendations. Thumbnails link to youtube.com.
4. **YouTube data limits:** Metadata refreshed within 30 days. No cross-owner aggregation.
5. **Reddit non-commercial:** Free tier only. Drop if monetized.
6. **No transcript scraping:** YouTube integration is metadata-only.
7. **Image generation:** Original illustrations only. No reproduction of copyrighted imagery.

---

## 13. Out of Scope (Future)

These are explicitly NOT part of v3. Documented for later consideration if the personal tool proves useful:

- Multi-user auth and accounts
- Role-based content personalization
- Search functionality
- Email digests
- Payment processing / tiers
- Knowledge tracking / gamification
- Mobile app (PWA possible later)
- Notification system
- API for external consumers
