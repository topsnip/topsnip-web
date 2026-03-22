# TopSnip v2: Content Intelligence Upgrade

**Date:** 2026-03-21
**Status:** Draft — awaiting approval
**Scope:** Content pipeline, adaptive formats, brand voice, trending algorithm
**Out of scope:** Visual redesign (Phase 3, user has designs), pricing changes, new auth flows

---

## Problem Statement

TopSnip's current content feels generic. Users get the same rigid format (tldr/what_happened/so_what/now_what) regardless of whether they're reading about a tool launch, a research breakthrough, or industry drama. The pipeline generates 1 topic per run (~15/day max), trending detection treats volume as signal instead of velocity, and enrichment failures produce thin summaries with no warning. The result: content that reads like "corporate AI" rather than a knowledgeable friend who curates what matters.

**The bar:** A user should open TopSnip, see 3-5 things that actually matter today, click one, and leave in 3 minutes knowing what happened, why it matters, and what to do about it — in a format that fits the content, not a template that fits a database schema.

---

## Architecture Overview

Three systems get upgraded. Everything else stays the same.

```
┌─────────────────────────────────────────────────────────┐
│                    INGESTION (existing)                  │
│  HN · YouTube · Reddit · RSS · ArXiv · GitHub           │
│                         │                                │
│                    ┌────▼────┐                           │
│                    │ NEW:    │                           │
│                    │ Story   │ ◄── SimHash dedup         │
│                    │ Cluster │ ◄── Source diversity       │
│                    │ Engine  │ ◄── Velocity scoring       │
│                    └────┬────┘                           │
│                         │                                │
│                    ┌────▼────┐                           │
│                    │ NEW:    │                           │
│                    │ Topic   │ ◄── Classify: tool_launch │
│                    │ Type    │     research_paper         │
│                    │ Detect  │     industry_news          │
│                    │         │     regulatory             │
│                    │         │     tutorial               │
│                    │         │     opinion_debate          │
│                    └────┬────┘                           │
│                         │                                │
│                    ┌────▼────┐                           │
│                    │ UPGRADED│                           │
│                    │ Content │ ◄── Adaptive format        │
│                    │ Gen     │ ◄── Brand voice prompts    │
│                    │         │ ◄── Parallel generation    │
│                    └────┬────┘                           │
│                         │                                │
│                    ┌────▼────┐                           │
│                    │ UPGRADED│                           │
│                    │ Quality │ ◄── Stricter scoring       │
│                    │ Gate    │ ◄── Format validation      │
│                    └─────────┘                           │
└─────────────────────────────────────────────────────────┘
```

---

## System 1: Story Clustering & Trending

### What changes

Replace the current `scoreAndDedup()` in `src/lib/ingest/scorer.ts` with a three-tier system.

### 1A. Near-Duplicate Detection (SimHash)

**Why:** Current dedup uses fuzzy title matching (>50% word overlap). This misses paraphrased duplicates and over-merges unrelated topics with similar keywords.

**Design:**
- Compute SimHash fingerprint on `title + first 200 chars of content_snippet` for each source_item
- Hamming distance threshold: ≤3 bits = duplicate (64-bit hash)
- Check against a rolling 72-hour window of existing fingerprints
- Store fingerprint in `source_items.simhash` column (bigint)

**Implementation:**
- New file: `src/lib/ingest/simhash.ts`
- Pure TypeScript implementation (no external deps) — SimHash is ~50 lines of code
- Runs during ingestion, before topic detection

### 1B. Story Clustering

**Why:** When 5 sources cover the same event, the current system creates 5 separate topics. Should be 1 topic backed by 5 sources.

**Design:**
- After SimHash dedup, group remaining items by semantic similarity
- Use Jaccard similarity on extracted entity sets (company names, product names, person names)
- Entity extraction: regex-based for known AI entities + Claude Haiku for ambiguous cases
- Entity list: `src/lib/ingest/ai-entities.ts` — exported `AI_ENTITIES` map of ~200 companies, products, and people. Categories: `company`, `product`, `person`. Updated manually when new major players emerge. Format: `{ name: string, aliases: string[], category: string }`
- Cluster threshold: Jaccard ≥ 0.4 = same story
- Each cluster becomes one topic with multiple source_items linked

**Data model change:**
- `topics.source_count` (integer) — number of distinct sources covering this story
- `topics.platforms` (text[]) — which platforms reported it (for diversity scoring)

### 1C. Velocity-Based Trending

**Why:** Current trending score uses raw engagement volume. A post with 50K views over a week outscores a post going from 10 to 1K in an hour. That's wrong.

**New formula:**
```
trending_score = velocity × source_diversity × recency

where:
  velocity = engagement_delta / hours_between_snapshots
           = (current_engagement - previous_snapshot_engagement) / snapshot_interval_hours
           (adapts to actual ingestion interval — works whether snapshots are 2h or 8h apart)

  source_diversity = 1 + log2(distinct_platform_count)
           (1 platform = 1.0, 2 = 2.0, 4 = 3.0, 6 = 3.58)

  recency = exp(-age_hours / 12)
           (half-life: 12 hours, not 24 — AI news moves fast)
```

**Velocity measurement:** The velocity formula uses the *actual* interval between consecutive engagement snapshots, not a fixed 1-hour window. This means it works correctly regardless of ingestion frequency — if snapshots are 8 hours apart, velocity = delta / 8. If 2 hours apart, velocity = delta / 2. More frequent ingestion gives more granular velocity, but the formula is valid at any interval.

**Data model changes:**
- `source_items.engagement_history` (jsonb) — array of `{score, timestamp}` snapshots for velocity calc
- Snapshot engagement on each ingestion run (already runs every 8h, will need to increase)
- Velocity computed from the two most recent snapshots at scoring time

### 1D. Ingestion Frequency

**Current:** Single cron at 8:00 AM UTC daily.
**Target:** Every 2 hours during peak (6 AM – 10 PM UTC), every 4 hours off-peak.

**Implementation options (in priority order):**
1. **Vercel Pro upgrade** — supports cron intervals down to 1 minute. Simplest path.
2. **External cron via GitHub Actions** — free, hits `/api/ingest/run` on schedule. Works on Hobby plan.
3. **n8n workflow** — already in user's stack, can schedule HTTP requests.

Decision: User to pick. Code is cron-agnostic (the route already supports external triggers with CRON_SECRET auth).

---

## System 2: Adaptive Content Formats

### What changes

Replace the rigid 4-section format with topic-type-specific templates. Each topic gets classified, and the content generation prompt + output schema adapts to the type.

### 2A. Topic Type Detection

**Six topic types:**

| Type | Signal | Example |
|------|--------|---------|
| `tool_launch` | Source contains product name + "launch/release/announce" + version/pricing | "OpenClaw v2.0 released" |
| `research_paper` | Source from arxiv OR contains "paper/study/researchers found" | "Scaling laws for test-time compute" |
| `industry_news` | Source about company moves, funding, acquisitions, partnerships | "Google acquires Character.AI" |
| `regulatory` | Contains "regulation/policy/ban/law/compliance/EU/FTC" | "EU AI Act enforcement begins" |
| `tutorial` | Contains "how to/guide/setup/install/build/tutorial" | "How to fine-tune Llama 3" |
| `opinion_debate` | High comment-to-engagement ratio OR contains "controversy/debate/backlash" | "Open vs closed source AI debate" |

**Implementation:**
- New file: `src/lib/content/topic-classifier.ts`
- Two-stage classification:
  1. **Fast pass:** Keyword/regex matching on title + content_snippet (covers ~70% of cases)
  2. **LLM pass:** Claude Haiku for ambiguous cases — single API call, ~200ms, returns type + confidence
- Classification runs during topic detection (after clustering, before content generation)
- Store in `topics.topic_type` (text, enum values above)
- Default: `industry_news` if classifier is uncertain (most common type)

### 2B. Format Templates

Each topic type has its own output schema and prompt instructions.

**Generator interface:** `generateForRole()` currently receives `TopicSourceMaterial` which has no `topic_type` field. Add `topic_type: string` to `TopicSourceMaterial` interface. The generator uses `topic_type` to:
1. Select the format-specific prompt template from `src/lib/content/formats/`
2. Set the expected JSON output schema for that format
3. Pass to quality scoring for format compliance checking

#### tool_launch
```json
{
  "tldr": "What it is + why it matters (2-3 sentences)",
  "what_it_does": "Core capabilities, what problem it solves (2-3 paragraphs)",
  "getting_started": "How to install/sign up/access — step by step",
  "pricing": "Free tier? Paid plans? Open source?",
  "compared_to": "How it stacks up against alternatives",
  "watch_out_for": "Limitations, gotchas, early-stage warnings",
  "sources": [...]
}
```

#### research_paper
```json
{
  "tldr": "Plain-language summary of the finding (2-3 sentences)",
  "the_finding": "What researchers discovered, in accessible language (2-3 paragraphs)",
  "why_it_matters": "Real-world implications — what changes because of this",
  "technical_detail": "For those who want depth — methodology, scale, key numbers",
  "open_questions": "What we still don't know, what to watch for next",
  "sources": [...]
}
```

#### industry_news
```json
{
  "tldr": "What happened (2-3 sentences)",
  "what_happened": "The full story with context (3-5 paragraphs)",
  "who_wins_who_loses": "Impact analysis — which companies/users benefit or get hurt",
  "what_happens_next": "Timeline, expected follow-ups, what to watch",
  "sources": [...]
}
```

#### regulatory
```json
{
  "tldr": "What changed (2-3 sentences)",
  "the_change": "What the regulation/policy says, in plain language",
  "who_it_affects": "Which companies, developers, users are impacted",
  "timeline": "When it takes effect, key dates, enforcement milestones",
  "what_to_do": "Concrete actions — compliance steps, preparation, alternatives",
  "sources": [...]
}
```

#### tutorial
```json
{
  "tldr": "What you'll learn and why (1-2 sentences)",
  "prerequisites": "What you need before starting (tools, accounts, knowledge)",
  "steps": [
    { "step": 1, "title": "...", "content": "...", "code_snippet": "..." }
  ],
  "common_issues": "Troubleshooting — what usually goes wrong and how to fix it",
  "next_steps": "Where to go from here, related topics",
  "sources": [...]
}
```

#### opinion_debate
```json
{
  "tldr": "The core disagreement (2-3 sentences)",
  "the_debate": "What's being argued, full context (2-3 paragraphs)",
  "side_a": "Position, key arguments, who holds this view",
  "side_b": "Position, key arguments, who holds this view",
  "the_nuance": "What both sides get right, what's missing from the conversation",
  "sources": [...]
}
```

### 2C. Frontend Rendering

**Current:** `LearningBrief.tsx` renders the same 4 sections for every topic.
**New:** `LearningBrief.tsx` reads `topic.topic_type` and renders the matching template.

- New directory: `src/components/learning-brief/formats/` — one renderer per type
  - `ToolLaunchBrief.tsx`
  - `ResearchPaperBrief.tsx`
  - `IndustryNewsBrief.tsx`
  - `RegulatoryBrief.tsx`
  - `TutorialBrief.tsx`
  - `OpinionDebateBrief.tsx`
- `LearningBrief.tsx` becomes a router that selects the right renderer
- Fallback: `IndustryNewsBrief.tsx` for unknown types (safe default)

**Props interface change:** Current `LearningBriefProps` requires `tldr`, `whatHappened`, `soWhat`, `nowWhat` as mandatory strings. New interface accepts `content_json: Record<string, unknown>` + `topic_type: string`, and each format renderer extracts the fields it needs. Legacy props remain optional for backward compat.

**Consumers that need updating:**
- `src/app/topic/[slug]/page.tsx` — topic detail page (primary consumer)
- `src/app/search/s/[slug]/page.tsx` — on-demand search results
- Any component that imports `LearningBrief` directly

**On-demand search:** For v2, on-demand search results continue using the `industry_news` format (safe default). Adaptive formatting for search is a future enhancement once the format system is proven on seeded content.

### 2D. Database Changes

```sql
-- Add topic_type to topics table
ALTER TABLE topics ADD COLUMN topic_type text DEFAULT 'industry_news'
  CHECK (topic_type IN ('tool_launch', 'research_paper', 'industry_news', 'regulatory', 'tutorial', 'opinion_debate'));

-- Expand topic_content to store flexible format
ALTER TABLE topic_content ADD COLUMN content_json jsonb;
-- content_json stores the format-specific structure

-- Drop NOT NULL on legacy columns so new format types don't need fake values
ALTER TABLE topic_content ALTER COLUMN what_happened DROP NOT NULL;
ALTER TABLE topic_content ALTER COLUMN so_what DROP NOT NULL;
ALTER TABLE topic_content ALTER COLUMN now_what DROP NOT NULL;
-- tldr stays NOT NULL — every format has a tldr field

-- Migration strategy:
-- New content writes to content_json (primary) AND populates tldr (for backward compat)
-- Legacy columns left null for new format types
-- Reader checks content_json first; falls back to legacy columns for pre-v2 content

-- SimHash for dedup
ALTER TABLE source_items ADD COLUMN simhash bigint;
-- Note: B-tree index on simhash doesn't help with Hamming distance queries.
-- At our scale (~500 items per 72-hour window), sequential scan with bitwise XOR
-- + popcount is fast enough. No index needed until we exceed ~10K items/window.

-- Engagement history for velocity
ALTER TABLE source_items ADD COLUMN engagement_history jsonb DEFAULT '[]';

-- Story clustering
ALTER TABLE topics ADD COLUMN source_count integer DEFAULT 1;
ALTER TABLE topics ADD COLUMN platforms text[] DEFAULT '{}';
```

---

## System 3: Brand Voice & Prompt Engineering

### What changes

Every piece of generated content should sound like TopSnip — smart, direct, slightly dry. Not corporate AI. Not a textbook. A knowledgeable friend who respects your time.

### 3A. Base System Prompt (all content generation)

Replace the current generic base rules with:

```
You are TopSnip's content engine. Your voice is:
- Smart but not academic. You explain complex things simply without dumbing them down.
- Direct. Lead with the point. No "In today's rapidly evolving AI landscape..."
- Slightly dry. A little wit goes a long way. Never forced humor.
- Opinionated when warranted. "This matters because..." not "Some might say..."
- Respectful of time. Every sentence earns its place. If it doesn't add value, cut it.

NEVER:
- Start with "In the world of..." or "In today's..." or any throat-clearing
- Use "game-changer", "revolutionary", "exciting", "groundbreaking"
- Hedge with "it remains to be seen" without saying what to watch for
- Write filler paragraphs that restate the TLDR in different words

ALWAYS:
- Lead with the most important fact
- Include specific numbers, dates, versions when available
- Tell the reader what to DO, not just what happened
- Cite sources by name (not "according to reports")
```

### 3B. Few-Shot Examples

Add 2 examples per topic type in the prompt (golden examples, hand-crafted). These anchor the model's output style.

**Example for tool_launch:**
```
GOOD: "Anthropic shipped Claude's computer use API to general availability.
It lets your code control a desktop — clicking, typing, reading screens.
Think browser automation but for any GUI app. The API costs $3 per 1K
actions, which adds up fast if you're running it in loops."

BAD: "Anthropic has announced the exciting launch of their revolutionary
computer use API. This groundbreaking technology enables developers to
programmatically interact with desktop environments in unprecedented ways."
```

### 3C. Role-Specific Voice Tuning

Maintain 4 roles but make them actually distinct:

| Role | Voice | Focus |
|------|-------|-------|
| General | Explain like I'm smart but not technical. Analogies welcome. | Impact on daily life, what to pay attention to |
| Developer | Skip the context, give me the technical details. Code snippets when relevant. | APIs, breaking changes, migration paths, architecture |
| PM | Frame it as product implications. Before/after. User impact. | Feature comparisons, market positioning, adoption signals |
| CTO | Strategy + risk. Build vs buy. Cost and team implications. | Architecture decisions, vendor risk, scaling considerations |

### 3D. Quality Score Overhaul

**Current:** Single 0-100 score from Haiku, threshold 40.
**New:** Multi-dimensional scoring:

```json
{
  "factual_grounding": 0-25,   // Are claims backed by source material?
  "actionability": 0-25,       // Does the reader know what to DO?
  "format_compliance": 0-25,   // Does it match the topic type template?
  "voice_compliance": 0-25     // Does it sound like TopSnip, not generic AI?
}
```

- Total score threshold: 60 (raised from 40)
- Any dimension below 10: auto-reject regardless of total
- Quality prompt includes the brand voice guide + 1 negative example
- Failed topics get tagged with the failing dimension for debugging

---

## System 4: Pipeline Reliability

### 4A. Parallel Content Generation

**Current:** 1 topic per generation run (120s limit).
**New:** Up to 3 topics per run, generated in parallel.

- Each topic's 4-role generation already runs in parallel (existing)
- Now run 3 topics concurrently (3 × 4 = 12 Claude calls per run)
- Stagger starts by 5 seconds between topics to avoid Claude API rate limits
- Add retry logic with exponential backoff (1s, 2s, 4s) on 429 responses — the current Anthropic SDK calls have no retry
- Per-topic timeout: 90 seconds (down from 120)
- Run-level timeout: 180 seconds (Vercel Pro function limit: 300s)
- If on standard API tier and rate limits hit: degrade gracefully to 2 topics, then 1
- Result: ~30-45 topics/day instead of ~15 (depending on API tier)

### 4B. Enrichment Reliability

**Current:** Serper failures are silent. Enrichment timeout (25s) often triggers.
**New:**
- If Serper fails: log warning, set `topic.enrichment_status = 'failed'`
- If enrichment returns 0 results: set `enrichment_status = 'thin'`
- Content generation prompt adapts: if thin sources, tell Claude to be explicit about uncertainty
- Dashboard visibility: `/api/ingest/health` returns enrichment success rate

### 4C. Source Health Monitoring

- Track per-source success rate over last 24 hours
- If a source drops below 50% success rate: mark `health_status = 'degraded'`
- If 0% for 2+ consecutive runs: mark `health_status = 'down'`
- Surface in `/api/ingest/health` response

---

## Migration Strategy

All changes are additive. No breaking migrations.

1. **Database:** Add new columns with defaults. Keep legacy columns. New code writes to both `content_json` AND legacy columns during transition.
2. **Frontend:** `LearningBrief.tsx` checks `content_json` first, falls back to legacy `tldr/what_happened/so_what/now_what` columns.
3. **Prompts:** New prompts are stored alongside old ones. Feature flag `USE_V2_PROMPTS` in env to toggle.
4. **Scoring:** New scoring runs in parallel with old scoring for first week. Compare results, tune thresholds, then switch.
5. **Independent feature flags:** Each major system can be toggled independently:
   - `USE_V2_PROMPTS` — brand voice + adaptive format prompts
   - `USE_CLUSTERING` — story clustering (can disable if grouping is bad without reverting prompts)
   - `USE_VELOCITY_SCORING` — velocity-based trending (falls back to volume-based if off)
   - All default to `true` in production, can be turned off per-system if issues arise.

---

## Implementation Phases

### Phase A: Foundation (do first)
1. SimHash dedup implementation
2. Topic type classifier
3. Database migration (new columns)
4. Brand voice base prompt

### Phase B: Adaptive Formats
5. Format-specific prompt templates (6 types)
6. Few-shot examples (2 per type, hand-crafted)
7. Frontend format renderers (6 components)
8. Content generation writes to `content_json`

### Phase C: Trending & Pipeline
9. Velocity-based trending formula
10. Story clustering (entity extraction + Jaccard)
11. Parallel content generation (3 topics/run)
12. Enrichment reliability + monitoring

### Phase D: Quality & Polish
13. Multi-dimensional quality scoring
14. Role-specific voice tuning
15. Source health dashboard in `/api/ingest/health`
16. Ingestion frequency increase (requires cron decision)

---

## Files Changed (estimated)

| File | Change |
|------|--------|
| `src/lib/ingest/scorer.ts` | Rewrite: SimHash + clustering + velocity |
| `src/lib/ingest/simhash.ts` | **New:** SimHash implementation |
| `src/lib/ingest/ai-entities.ts` | **New:** ~200 AI companies/products/people for entity extraction |
| `src/lib/ingest/clusterer.ts` | **New:** Story clustering engine |
| `src/lib/content/topic-classifier.ts` | **New:** Topic type detection |
| `src/lib/content/prompts.ts` | Rewrite: brand voice + format-specific prompts |
| `src/lib/content/formats/` | **New directory:** 6 format template definitions |
| `src/lib/content/generator.ts` | Modify: parallel 3-topic gen, content_json output |
| `src/lib/content/enricher.ts` | Modify: reliability + status tracking |
| `src/lib/content/quality.ts` | **New:** extracted from generator.ts — multi-dimensional scoring |
| `src/components/learning-brief/LearningBrief.tsx` | Modify: format router |
| `src/components/learning-brief/formats/*.tsx` | **New:** 6 format renderers |
| `supabase/migrations/step9-content-intelligence.sql` | **New:** all schema changes |
| `src/app/api/content/generate/route.ts` | Modify: parallel gen, new prompts |
| `src/app/api/ingest/run/route.ts` | Modify: SimHash, clustering |
| `src/app/api/ingest/health/route.ts` | Modify: enrichment + source health stats |

---

## Success Criteria

1. **Content differentiation:** A tool_launch topic reads visibly different from a research_paper topic — structure, sections, and depth all change
2. **Voice consistency:** Generated content passes the "would TopSnip write this?" test — no throat-clearing, no corporate speak, no filler
3. **Trending accuracy:** Topics that are genuinely breaking (high velocity + multi-source) rank above stale high-volume topics
4. **Pipeline throughput:** ≥40 published topics per day (up from ~15)
5. **Quality floor:** No published topic scores below 60/100, no dimension below 10/25
6. **Zero silent failures:** Every enrichment failure, API error, or quality rejection is logged and visible in health endpoint

---

## Open Decisions (need user input)

1. **Ingestion frequency:** Vercel Pro ($20/mo), GitHub Actions (free), or n8n?
2. **Few-shot examples:** I'll draft them, but user should review to ensure they match the voice they want
3. **Entity list for clustering:** Start with ~200 AI companies/products/people — user to review initial list
