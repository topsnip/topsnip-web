# TopSnip v3 — Personal AI Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor TopSnip from a multi-user AI learning platform into a personal AI intelligence dashboard with InShorts-style cards and visual learn pages.

**Architecture:** Reuse v2's ingestion pipeline (fetchers, clustering, scoring) and Supabase infrastructure. Replace role-based content generation with single-user card + learn brief generation. Replace the multi-page frontend with two pages: `/feed` (InShorts cards) and `/learn/[slug]` (visual deep-dive). Add DALL-E 3 integration for AI-generated illustrations.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + RLS), Claude Sonnet 4.5 (generation), Claude Haiku 4.5 (quality + YouTube recs), DALL-E 3 (illustrations), Tailwind CSS 4, shadcn/ui, Framer Motion, Vitest + Playwright (testing)

**Spec:** `docs/superpowers/specs/2026-04-09-topsnip-v3-personal-dashboard-design.md`

---

## File Structure

### New files to create
```
src/
├── lib/
│   ├��─ content/
│   │   ├── card-generator.ts         # Card + learn brief generation (replaces role-based generator)
│   │   ├── card-prompts.ts           # InShorts-style + learn brief prompt templates
│   │   ├── image-generator.ts        # DALL-E 3 integration + fallback chain
│   │   └── card-quality.ts           # Quality scorer adapted for card format
│   ├── utils/
│   │   └── word-limit.ts             # enforceWordLimit utility
│   └── supabase/
│       └── storage.ts                # Supabase Storage upload helper
├── components/
│   ├── feed/
│   │   ├── FeedCard.tsx              # Single InShorts-style card
│   │   └── CardStack.tsx             # Scrollable card container
│   └── learn/
│       ├── LearnBrief.tsx            # Full learn page layout
│       ├── TopicIllustration.tsx      # Image display with fallback
│       ├── VideoRecommendation.tsx    # YouTube video card
│       ├── SourceList.tsx            # Source citations
│       └── CategoryBadge.tsx         # Colored tag pill
├── app/
│   ├── feed/
│   │   └── page.tsx                  # REWRITE: InShorts feed
│   ├── learn/
│   │   └── [slug]/
│   │       └── page.tsx              # NEW: Visual learn page
│   ├── api/
│   │   ├── feed/
│   │   │   └── route.ts             # REWRITE: GET /api/feed
│   │   └── learn/
│   │       └── [slug]/
│   │           └── route.ts         # NEW: GET /api/learn/[slug]
│   └── page.tsx                      # REWRITE: redirect to /feed
├── __tests__/
│   ├── lib/
│   │   ├── card-generator.test.ts
│   │   ├── image-generator.test.ts
���   │   ├��─ card-quality.test.ts
│   │   └── word-limit.test.ts
��   └── components/
│       ├── FeedCard.test.tsx
│       └── LearnBrief.test.tsx
supabase/
└── migration-v3.sql                  # topic_cards table + youtube_recs FK migration
```

### Files to modify
```
src/lib/content/orchestrator.ts       # Refactor: card generation instead of role-based
src/lib/content/youtube-recs.ts       # Refactor: topic_id instead of topic_content_id
src/lib/content/types.ts              # Add card types, remove role types
src/lib/content/prompts.ts            # Add v3 voice additions (keep existing for reference)
package.json                          # Add openai dependency
vercel.json                           # Update cron schedule
```

### Files to delete/archive (Phase 7 — Cleanup)
```
src/app/auth/                         # Auth pages
src/app/onboarding/                   # Onboarding
src/app/settings/                     # Settings
src/app/knowledge/                    # Knowledge tracking
src/app/history/                      # History
src/app/upgrade/                      # Upgrade page
src/app/s/                            # Search results
src/app/topic/                        # Old topic detail (replaced by /learn)
src/app/api/search/                   # Search API
src/app/api/email/                    # Email digest API
src/app/api/user/                     # User API routes
src/components/learning-brief/        # Old format-specific renderers
src/components/SignUpGate.tsx          # Auth gate
```

---

## Chunk 1: Database Foundation

### Task 1: Create migration file with topic_cards table and youtube_recs FK migration

**Files:**
- Create: `supabase/migration-v3.sql`
- Test: Manual verification via Supabase SQL editor

- [ ] **Step 0: Run npm audit fix to clear known vulnerabilities**

Run: `npm audit fix`
Expected: Resolves path-to-regexp ReDoS, vite path traversal, hono cookie bypass (5 vulns)

- [ ] **Step 1: Write the migration SQL**

```sql
-- migration-v3.sql
-- TopSnip v3: Personal AI Dashboard schema changes

-- 0. Fix existing RLS policies for auth-free personal dashboard
-- Current policies require auth.uid() which will break without login.
-- Replace with public read access for published content.

-- topics: allow public read of published topics
DROP POLICY IF EXISTS "Users can view published topics" ON topics;
CREATE POLICY "Public read published topics" ON topics
  FOR SELECT USING (status = 'published');
CREATE POLICY "Service write topics" ON topics
  FOR ALL USING (auth.role() = 'service_role');

-- source_items: allow public read
DROP POLICY IF EXISTS "Authenticated users can view source items" ON source_items;
CREATE POLICY "Public read source items" ON source_items
  FOR SELECT USING (true);

-- topic_sources: allow public read
DROP POLICY IF EXISTS "Authenticated users can view topic sources" ON topic_sources;
CREATE POLICY "Public read topic sources" ON topic_sources
  FOR SELECT USING (true);

-- topic_content: keep existing policies (table being deprecated, not dropped)

-- youtube_recommendations: allow public read
DROP POLICY IF EXISTS "Users can view youtube recommendations" ON youtube_recommendations;
CREATE POLICY "Public read youtube recs" ON youtube_recommendations
  FOR SELECT USING (true);

-- tags + topic_tags: allow public read
DROP POLICY IF EXISTS "Anyone can view tags" ON tags;
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can view topic_tags" ON topic_tags;
CREATE POLICY "Public read topic_tags" ON topic_tags FOR SELECT USING (true);

-- sources: allow public read (needed to show platform info)
DROP POLICY IF EXISTS "Authenticated users can view sources" ON sources;
CREATE POLICY "Public read sources" ON sources FOR SELECT USING (true);

-- 1. Create topic_cards table (replaces topic_content)
CREATE TABLE IF NOT EXISTS topic_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_fact TEXT,
  category_tag TEXT,
  image_url TEXT,
  learn_brief JSONB NOT NULL DEFAULT '{}',
  illustration_prompt TEXT,
  quality_score INTEGER DEFAULT 0,
  generated_by TEXT DEFAULT 'claude-sonnet-4-5',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_topic_card UNIQUE (topic_id)
);

CREATE INDEX idx_topic_cards_quality ON topic_cards(quality_score);

-- 2. RLS for topic_cards
ALTER TABLE topic_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on topic_cards" ON topic_cards
  FOR SELECT USING (true);
CREATE POLICY "Allow service write on topic_cards" ON topic_cards
  FOR ALL USING (auth.role() = 'service_role');

-- 3. Migrate youtube_recommendations FK from topic_content_id to topic_id
ALTER TABLE youtube_recommendations
  ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;

UPDATE youtube_recommendations yr
SET topic_id = tc.topic_id
FROM topic_content tc
WHERE yr.topic_content_id = tc.id;

ALTER TABLE youtube_recommendations
  DROP COLUMN topic_content_id;

ALTER TABLE youtube_recommendations
  ALTER COLUMN topic_id SET NOT NULL;

CREATE INDEX idx_youtube_recs_topic ON youtube_recommendations(topic_id);
```

- [ ] **Step 2: Run migration in Supabase SQL editor**

Go to Supabase Dashboard → SQL Editor → paste and run migration-v3.sql.
Expected: All statements succeed. `topic_cards` table created. `youtube_recommendations.topic_id` column exists.

- [ ] **Step 3: Verify tables**

Run in SQL editor:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'topic_cards' ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'youtube_recommendations' ORDER BY ordinal_position;
```

Expected: `topic_cards` has all columns. `youtube_recommendations` has `topic_id` and no `topic_content_id`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migration-v3.sql
git commit -m "feat(db): add topic_cards table and migrate youtube_recs FK for v3"
```

---

## Chunk 2: Backend Utilities

### Task 2: Word limit enforcement utility

**Files:**
- Create: `src/lib/utils/word-limit.ts`
- Create: `src/__tests__/lib/word-limit.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/word-limit.test.ts
import { describe, it, expect } from 'vitest';
import { enforceWordLimit } from '@/lib/utils/word-limit';

describe('enforceWordLimit', () => {
  it('returns text unchanged if under limit', () => {
    expect(enforceWordLimit('hello world', 10)).toBe('hello world');
  });

  it('truncates text at word boundary when over limit', () => {
    const text = 'one two three four five six';
    expect(enforceWordLimit(text, 3)).toBe('one two three...');
  });

  it('returns empty string for empty input', () => {
    expect(enforceWordLimit('', 10)).toBe('');
  });

  it('handles exact word count', () => {
    expect(enforceWordLimit('one two three', 3)).toBe('one two three');
  });

  it('handles single word over limit', () => {
    expect(enforceWordLimit('superlongword', 0)).toBe('...');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run src/__tests__/lib/word-limit.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/utils/word-limit.ts

/**
 * Enforce a maximum word count on text.
 * Truncates at word boundary and appends "..." if exceeded.
 */
export function enforceWordLimit(text: string, maxWords: number): string {
  if (!text) return '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  if (maxWords <= 0) return '...';
  return words.slice(0, maxWords).join(' ') + '...';
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/__tests__/lib/word-limit.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/word-limit.ts src/__tests__/lib/word-limit.test.ts
git commit -m "feat: add enforceWordLimit utility for card summaries"
```

### Task 3: Supabase Storage upload helper

**Files:**
- Create: `src/lib/supabase/storage.ts`

- [ ] **Step 1: Write the storage helper**

```typescript
// src/lib/supabase/storage.ts
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'topic-illustrations';

/**
 * Upload an image buffer to Supabase Storage.
 * Returns the public URL or null on failure.
 */
export async function uploadIllustration(
  supabase: SupabaseClient,
  slug: string,
  imageBuffer: ArrayBuffer,
  contentType = 'image/png'
): Promise<string | null> {
  const path = `${slug}.png`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, imageBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`[storage] Upload failed for ${slug}:`, error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete an illustration from storage.
 */
export async function deleteIllustration(
  supabase: SupabaseClient,
  slug: string
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([`${slug}.png`]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/storage.ts
git commit -m "feat: add Supabase Storage helper for topic illustrations"
```

---

## Chunk 3: Image Generation Service

### Task 4: Install OpenAI package

- [ ] **Step 1: Install dependency**

Run: `npm install openai`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add openai package for DALL-E 3 integration"
```

### Task 5: DALL-E 3 image generation service

**Files:**
- Create: `src/lib/content/image-generator.ts`
- Create: `src/__tests__/lib/image-generator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/image-generator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateIllustration, buildIllustrationPrompt } from '@/lib/content/image-generator';

describe('buildIllustrationPrompt', () => {
  it('includes topic title and description', () => {
    const prompt = buildIllustrationPrompt('Claude 4.5 Released', 'A comparison diagram showing...');
    expect(prompt).toContain('Claude 4.5 Released');
    expect(prompt).toContain('comparison diagram');
  });

  it('includes brand style instructions', () => {
    const prompt = buildIllustrationPrompt('Test', 'Description');
    expect(prompt).toContain('#080808');
    expect(prompt).toContain('#7C6AF7');
  });
});

describe('generateIllustration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns null when OPENAI_API_KEY is missing', async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const result = await generateIllustration('test prompt');
    expect(result).toBeNull();
    if (original) process.env.OPENAI_API_KEY = original;
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run src/__tests__/lib/image-generator.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/content/image-generator.ts
import OpenAI from 'openai';

/** Daily cap to prevent cost runaway — max 20 images/day */
const MAX_DAILY_IMAGES = 20;
let dailyImageCount = 0;
let lastResetDate = '';

function checkAndResetDailyCount(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastResetDate) {
    dailyImageCount = 0;
    lastResetDate = today;
  }
  return dailyImageCount < MAX_DAILY_IMAGES;
}

/**
 * Build the DALL-E prompt with TopSnip brand styling.
 */
export function buildIllustrationPrompt(
  topicTitle: string,
  illustrationDescription: string
): string {
  return [
    'Clean, minimal infographic on dark background (#080808).',
    'Purple accent color (#7C6AF7). White text (#F0F0F0).',
    'Modern tech aesthetic. No photorealism. Diagram/flowchart style.',
    'No watermarks, no logos, no text overlays.',
    `Topic: ${topicTitle}`,
    `Visual: ${illustrationDescription}`,
  ].join(' ');
}

/**
 * Generate an illustration using DALL-E 3.
 * Returns the image as an ArrayBuffer, or null on failure.
 */
export async function generateIllustration(
  prompt: string
): Promise<ArrayBuffer | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[image-gen] OPENAI_API_KEY not set, skipping');
    return null;
  }

  if (!checkAndResetDailyCount()) {
    console.warn('[image-gen] Daily cap reached, skipping');
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) return null;

    // Download image to buffer
    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!imageResponse.ok) return null;

    dailyImageCount++;
    return await imageResponse.arrayBuffer();
  } catch (error) {
    console.error('[image-gen] Failed:', error);
    return null;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/__tests__/lib/image-generator.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/image-generator.ts src/__tests__/lib/image-generator.test.ts
git commit -m "feat: add DALL-E 3 image generation with daily cap and fallback"
```

---

## Chunk 4: Card Generation Pipeline

### Task 6: Add card types to content types

**Files:**
- Modify: `src/lib/content/types.ts`

- [ ] **Step 1: Add new types for v3 cards**

Add to `src/lib/content/types.ts`:

```typescript
/** v3 Card — InShorts-style feed card */
export interface TopicCard {
  headline: string;        // max 15 words
  summary: string;         // max 60 words, TopSnip voice
  key_fact: string | null;
  category_tag: string;
}

/** v3 Learn Brief — visual deep-dive content */
export interface LearnBrief {
  what_it_is: string;
  why_it_matters: string;
  key_details: string[];
  illustration_description: string;
  sources: SourceAttribution[];
  // topic_type specific fields stored as additional properties
  [key: string]: unknown;
}

/** v3 Generation result for a single topic */
export interface CardGenerationResult {
  card: TopicCard;
  learn_brief: LearnBrief;
  illustration_prompt: string;
  image_url: string | null;
  quality_score: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/content/types.ts
git commit -m "feat(types): add TopicCard, LearnBrief, CardGenerationResult for v3"
```

### Task 7: Card generation prompts

**Files:**
- Create: `src/lib/content/card-prompts.ts`

- [ ] **Step 1: Write the card prompt builder**

```typescript
// src/lib/content/card-prompts.ts
import type { TopicType } from './types';

const TOPSNIP_VOICE = `You are TopSnip — a personal AI intelligence filter.

Voice rules:
- Smart but not academic. Complex things explained simply.
- Direct. Lead with the point. No throat-clearing.
- Slightly dry wit. Not forced humor.
- Opinionated. Take a position: "This matters because..." not "Some might say..."
- Specific. Name the tool, version, price, command.
- Rewrite all facts in your own original voice. NEVER reproduce the phrasing, narrative structure, or editorial framing of source articles.
- You are writing for one person who is deep in the AI space but overwhelmed by volume. Be the filter, not the firehose.
- When explaining concepts, prefer visual language: "think of it as...", "picture this..."

BANNED phrases (never use these):
- "game-changer", "revolutionary", "exciting", "groundbreaking", "significant milestone"
- "In today's rapidly evolving landscape"
- "It remains to be seen" (without specifics)
- Any throat-clearing openers ("In the world of...")
- Anything that reads like a press release`;

export function buildCardSystemPrompt(): string {
  return `${TOPSNIP_VOICE}

You generate two outputs for each AI topic:

1. CARD — an InShorts-style news card (like the InShorts app)
2. LEARN BRIEF — a visual deep-dive for someone who wants to understand the topic

Always respond with valid JSON matching the schema provided.`;
}

export function buildCardUserPrompt(
  title: string,
  sourceSnippets: string[],
  topicType: TopicType
): string {
  const snippets = sourceSnippets.map((s, i) => `Source ${i + 1}: ${s}`).join('\n\n');

  return `Topic: ${title}
Topic type: ${topicType}

Source material:
${snippets}

Generate JSON with this exact structure:
{
  "card": {
    "headline": "string — max 15 words, punchy, attention-grabbing",
    "summary": "string — EXACTLY 60 words or fewer. InShorts-style. What happened + why you should care. TopSnip voice.",
    "key_fact": "string — one standout number, stat, or claim. Or null if nothing stands out.",
    "category_tag": "string — one of: Model Launch, Tool Update, Research, Policy, Tutorial, Industry, Opinion"
  },
  "learn_brief": {
    "what_it_is": "string — 2-3 sentences explaining the concept. Use visual language.",
    "why_it_matters": "string — 2-3 sentences on personal relevance. What should I do about this?",
    "key_details": ["array of 3-5 bullet points with specifics — versions, prices, benchmarks, dates"],
    "illustration_description": "string — describe the ideal diagram/infographic for this topic. Be specific about layout, elements, and what it should show.",
    "sources": [{"title": "string", "url": "string"}]
  }
}

Rules:
- Card summary MUST be 60 words or fewer. Count carefully.
- Every claim must be traceable to the source material. No hallucination.
- Rewrite everything in TopSnip voice — never copy source phrasing.
- illustration_description should describe a diagram, not a photo.`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/content/card-prompts.ts
git commit -m "feat: add v3 card + learn brief prompt templates with TopSnip voice"
```

### Task 8: Card quality scorer

**Files:**
- Create: `src/lib/content/card-quality.ts`
- Create: `src/__tests__/lib/card-quality.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/card-quality.test.ts
import { describe, it, expect } from 'vitest';
import { checkCardQuality, BANNED_PHRASES } from '@/lib/content/card-quality';
import type { TopicCard, LearnBrief } from '@/lib/content/types';

const validCard: TopicCard = {
  headline: 'Claude 4.5 Ships with Extended Thinking',
  summary: 'Anthropic released Claude 4.5 today with extended thinking capabilities. The model scores 15% higher on coding benchmarks. Available now on API at same pricing. Worth switching if you use Claude for code.',
  key_fact: '15% improvement on SWE-bench',
  category_tag: 'Model Launch',
};

const validBrief: LearnBrief = {
  what_it_is: 'Claude 4.5 is the latest model from Anthropic.',
  why_it_matters: 'Better at coding tasks. Same price.',
  key_details: ['15% better on SWE-bench', 'Same API pricing', 'Available now'],
  illustration_description: 'Comparison bar chart of benchmark scores',
  sources: [{ title: 'Anthropic Blog', url: 'https://anthropic.com/blog/claude-4-5' }],
};

describe('checkCardQuality', () => {
  it('returns passing score for valid card + brief', () => {
    const result = checkCardQuality(validCard, validBrief);
    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.pass).toBe(true);
  });

  it('fails if summary contains banned phrases', () => {
    const badCard = { ...validCard, summary: 'This is a game-changer for the industry.' };
    const result = checkCardQuality(badCard, validBrief);
    expect(result.voice).toBeLessThan(15);
  });

  it('fails if summary exceeds 60 words', () => {
    const longSummary = Array(70).fill('word').join(' ');
    const badCard = { ...validCard, summary: longSummary };
    const result = checkCardQuality(badCard, validBrief);
    expect(result.brevity).toBeLessThan(15);
  });

  it('fails if learn brief missing required fields', () => {
    const badBrief = { ...validBrief, what_it_is: '', why_it_matters: '' };
    const result = checkCardQuality(validCard, badBrief);
    expect(result.completeness).toBeLessThan(15);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run src/__tests__/lib/card-quality.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/content/card-quality.ts
import type { TopicCard, LearnBrief } from './types';

export const BANNED_PHRASES = [
  'game-changer', 'revolutionary', 'exciting', 'groundbreaking',
  'significant milestone', 'rapidly evolving landscape',
  'it remains to be seen', 'in the world of',
];

const MIN_SCORE = 50;
const MIN_DIMENSION = 8;

export interface CardQualityScore {
  factual: number;      // 0-25: claims traceable to sources
  voice: number;        // 0-25: TopSnip voice, no banned phrases
  completeness: number; // 0-25: all required fields present and filled
  brevity: number;      // 0-25: card ��� 60 words, brief sections ≤ 3 sentences
  total: number;
  pass: boolean;
  reasons: string[];
}

export function checkCardQuality(
  card: TopicCard,
  brief: LearnBrief
): CardQualityScore {
  const reasons: string[] = [];

  // Voice check (0-25)
  let voice = 25;
  const allText = `${card.summary} ${card.headline} ${brief.what_it_is} ${brief.why_it_matters}`.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (allText.includes(phrase)) {
      voice -= 8;
      reasons.push(`Banned phrase: "${phrase}"`);
    }
  }
  voice = Math.max(0, voice);

  // Brevity check (0-25)
  let brevity = 25;
  const wordCount = card.summary.split(/\s+/).filter(Boolean).length;
  if (wordCount > 60) {
    brevity -= Math.min(25, (wordCount - 60) * 2);
    reasons.push(`Summary too long: ${wordCount} words (max 60)`);
  }
  const headlineWords = card.headline.split(/\s+/).filter(Boolean).length;
  if (headlineWords > 15) {
    brevity -= 5;
    reasons.push(`Headline too long: ${headlineWords} words (max 15)`);
  }
  brevity = Math.max(0, brevity);

  // Completeness check (0-25)
  let completeness = 25;
  if (!card.headline) { completeness -= 8; reasons.push('Missing headline'); }
  if (!card.summary) { completeness -= 8; reasons.push('Missing summary'); }
  if (!card.category_tag) { completeness -= 3; reasons.push('Missing category_tag'); }
  if (!brief.what_it_is) { completeness -= 5; reasons.push('Missing what_it_is'); }
  if (!brief.why_it_matters) { completeness -= 5; reasons.push('Missing why_it_matters'); }
  if (!brief.key_details?.length) { completeness -= 4; reasons.push('Missing key_details'); }
  if (!brief.illustration_description) { completeness -= 3; reasons.push('Missing illustration_description'); }
  if (!brief.sources?.length) { completeness -= 3; reasons.push('Missing sources'); }
  completeness = Math.max(0, completeness);

  // Factual check (0-25) — basic heuristic, no LLM call
  let factual = 20; // Default reasonable score; full LLM-based check is separate
  if (!brief.sources?.length) {
    factual -= 10;
    reasons.push('No sources cited');
  }

  const total = factual + voice + completeness + brevity;
  const dimensionPass = [factual, voice, completeness, brevity].every(d => d >= MIN_DIMENSION);
  const pass = total >= MIN_SCORE && dimensionPass;

  return { factual, voice, completeness, brevity, total, pass, reasons };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/__tests__/lib/card-quality.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/card-quality.ts src/__tests__/lib/card-quality.test.ts
git commit -m "feat: add card quality scorer with voice, brevity, completeness checks"
```

### Task 9: Card generator service

**Files:**
- Create: `src/lib/content/card-generator.ts`
- Create: `src/__tests__/lib/card-generator.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/lib/card-generator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { parseCardResponse } from '@/lib/content/card-generator';

describe('parseCardResponse', () => {
  it('parses valid JSON response into card + brief', () => {
    const json = JSON.stringify({
      card: {
        headline: 'Test Headline',
        summary: 'Short summary here.',
        key_fact: 'A fact',
        category_tag: 'Model Launch',
      },
      learn_brief: {
        what_it_is: 'Explanation.',
        why_it_matters: 'Relevance.',
        key_details: ['Detail 1'],
        illustration_description: 'A diagram.',
        sources: [{ title: 'Source', url: 'https://example.com' }],
      },
    });

    const result = parseCardResponse(json);
    expect(result).not.toBeNull();
    expect(result!.card.headline).toBe('Test Headline');
    expect(result!.learn_brief.what_it_is).toBe('Explanation.');
  });

  it('returns null for invalid JSON', () => {
    expect(parseCardResponse('not json')).toBeNull();
  });

  it('returns null if card fields missing', () => {
    const json = JSON.stringify({ card: {}, learn_brief: {} });
    expect(parseCardResponse(json)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npx vitest run src/__tests__/lib/card-generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/content/card-generator.ts
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TopicCard, LearnBrief, CardGenerationResult, TopicType } from './types';
import { buildCardSystemPrompt, buildCardUserPrompt } from './card-prompts';
import { buildIllustrationPrompt, generateIllustration } from './image-generator';
import { uploadIllustration } from '../supabase/storage';
import { checkCardQuality } from './card-quality';
import { enforceWordLimit } from '../utils/word-limit';
import { callClaudeWithRetry } from './retry';

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 2000;

interface ParsedCardResponse {
  card: TopicCard;
  learn_brief: LearnBrief;
}

/**
 * Parse Claude's JSON response into card + brief.
 * Returns null if response is invalid.
 */
export function parseCardResponse(text: string): ParsedCardResponse | null {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const parsed = JSON.parse(jsonMatch[1]!.trim());

    if (!parsed?.card?.headline || !parsed?.card?.summary) return null;
    if (!parsed?.learn_brief?.what_it_is) return null;

    return {
      card: {
        headline: parsed.card.headline,
        summary: enforceWordLimit(parsed.card.summary, 60),
        key_fact: parsed.card.key_fact || null,
        category_tag: parsed.card.category_tag || 'Industry',
      },
      learn_brief: parsed.learn_brief,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a v3 card + learn brief for a topic.
 * Handles Claude call, quality check, image generation, and DB write.
 */
export async function generateCard(
  supabase: SupabaseClient,
  topicId: string,
  topicSlug: string,
  topicTitle: string,
  sourceSnippets: string[],
  topicType: TopicType
): Promise<CardGenerationResult | null> {
  // 1. Generate card + learn brief via Claude
  const anthropic = new Anthropic();
  const systemPrompt = buildCardSystemPrompt();
  const userPrompt = buildCardUserPrompt(topicTitle, sourceSnippets, topicType);

  const response = await callClaudeWithRetry(anthropic, {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const parsed = parseCardResponse(text);
  if (!parsed) {
    console.error(`[card-gen] Failed to parse response for ${topicSlug}`);
    return null;
  }

  // 2. Quality check
  const quality = checkCardQuality(parsed.card, parsed.learn_brief);
  if (!quality.pass) {
    console.warn(`[card-gen] Quality check failed for ${topicSlug}:`, quality.reasons);
    return null;
  }

  // 3. Generate illustration
  const illustrationPrompt = buildIllustrationPrompt(
    topicTitle,
    parsed.learn_brief.illustration_description
  );

  let imageUrl: string | null = null;
  const imageBuffer = await generateIllustration(illustrationPrompt);
  if (imageBuffer) {
    imageUrl = await uploadIllustration(supabase, topicSlug, imageBuffer);
  }

  // 4. Fallback: try og:image from sources if no generated image
  if (!imageUrl) {
    const { data: sourceItems } = await supabase
      .from('source_items')
      .select('metadata')
      .eq('id', (
        await supabase
          .from('topic_sources')
          .select('source_item_id')
          .eq('topic_id', topicId)
          .order('source_item_id')
          .limit(1)
      ).data?.[0]?.source_item_id)
      .single();

    const ogImage = (sourceItems?.metadata as Record<string, string>)?.og_image;
    if (ogImage) imageUrl = ogImage;
  }

  // 5. Write to DB
  const { error } = await supabase.from('topic_cards').upsert({
    topic_id: topicId,
    headline: parsed.card.headline,
    summary: parsed.card.summary,
    key_fact: parsed.card.key_fact,
    category_tag: parsed.card.category_tag,
    image_url: imageUrl,
    learn_brief: parsed.learn_brief,
    illustration_prompt: illustrationPrompt,
    quality_score: quality.total,
  }, { onConflict: 'topic_id' });

  if (error) {
    console.error(`[card-gen] DB write failed for ${topicSlug}:`, error);
    return null;
  }

  return {
    card: parsed.card,
    learn_brief: parsed.learn_brief,
    illustration_prompt: illustrationPrompt,
    image_url: imageUrl,
    quality_score: quality.total,
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/__tests__/lib/card-generator.test.ts`
Expected: parseCardResponse tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/card-generator.ts src/__tests__/lib/card-generator.test.ts
git commit -m "feat: add card generator with Claude, quality check, image gen, and DB write"
```

---

## Chunk 5: Orchestrator + YouTube Recs Refactor

### Task 10: Refactor youtube-recs.ts to use topic_id

**Files:**
- Modify: `src/lib/content/youtube-recs.ts`

- [ ] **Step 1: Read current youtube-recs.ts fully to understand the topic_content_id lookup**

Read the full file, identify lines where `topic_content_id` is used.

- [ ] **Step 2: Refactor to accept topic_id directly**

Change the function signature from `findAndSaveYouTubeRecs(supabase, topicContentId, topicTitle, ...)` to `findAndSaveYouTubeRecs(supabase, topicId, topicTitle, ...)`.

Remove the lookup that goes through `topic_content` to find `topic_content_id`. Instead, write directly with `topic_id`.

Update the DB insert to use `topic_id` instead of `topic_content_id`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/content/youtube-recs.ts
git commit -m "refactor: youtube-recs now writes via topic_id instead of topic_content_id"
```

### Task 11: Refactor content orchestrator for v3

**Files:**
- Modify: `src/lib/content/orchestrator.ts`

- [ ] **Step 1: Read the full current orchestrator.ts**

Understand the current flow: load detected topics → generate for all roles → quality check → YouTube recs → daily digests.

- [ ] **Step 2: Refactor to v3 flow**

Replace the generation loop:
- Remove `generateForTopic` call (which generates 4 role-based contents)
- Replace with `generateCard` call from `card-generator.ts`
- Remove `buildDailyDigests` import and call
- Keep: topic loading, parallel processing, stagger delay, timeout, daily API budget
- Update `CALLS_PER_TOPIC` from 5 to 2 (1 card gen + 1 quality via Haiku)
- After card generation, call `findAndSaveYouTubeRecs(supabase, topicId, topicTitle)`
- Update topic status to 'published' on success

Key changes:
```typescript
// OLD
import { generateForTopic } from "./generator";
import { buildDailyDigests } from "./quiet-day";
const CALLS_PER_TOPIC = 5;

// NEW
import { generateCard } from "./card-generator";
const CALLS_PER_TOPIC = 2;
// Remove buildDailyDigests import
```

- [ ] **Step 3: Run lint**

Run: `npx eslint src/lib/content/orchestrator.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/content/orchestrator.ts
git commit -m "refactor: content orchestrator now generates v3 cards instead of role-based content"
```

---

## Chunk 6: API Routes

### Task 12: New GET /api/feed route

**Files:**
- Rewrite: `src/app/api/feed/route.ts` (or create new one if current is `check-new`)

- [ ] **Step 1: Check current feed API structure**

Read `src/app/api/feed/` directory contents.

- [ ] **Step 2: Write the GET /api/feed route**

```typescript
// src/app/api/feed/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const supabase = await createClient();

  const { data: topics, error, count } = await supabase
    .from('topics')
    .select(`
      slug,
      title,
      trending_score,
      platform_count,
      published_at,
      topic_cards (
        headline,
        summary,
        key_fact,
        category_tag,
        image_url
      )
    `, { count: 'exact' })
    .eq('status', 'published')
    .gte('published_at', `${date}T00:00:00Z`)
    .lte('published_at', `${date}T23:59:59Z`)
    .order('trending_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (topics || [])
    .filter((t: any) => t.topic_cards?.length > 0)
    .map((t: any) => ({
      slug: t.slug,
      headline: t.topic_cards[0].headline,
      summary: t.topic_cards[0].summary,
      key_fact: t.topic_cards[0].key_fact,
      category_tag: t.topic_cards[0].category_tag,
      image_url: t.topic_cards[0].image_url,
      trending_score: t.trending_score,
      platform_count: t.platform_count,
      published_at: t.published_at,
    }));

  return NextResponse.json({
    topics: formatted,
    total: count || 0,
    has_more: (count || 0) > offset + limit,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/feed/route.ts
git commit -m "feat: new GET /api/feed route returning InShorts-style cards"
```

### Task 13: New GET /api/learn/[slug] route

**Files:**
- Create: `src/app/api/learn/[slug]/route.ts`

- [ ] **Step 1: Create directory and route**

```typescript
// src/app/api/learn/[slug]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch topic + card + youtube recs + sources in parallel
  const { data: topic } = await supabase
    .from('topics')
    .select(`
      id,
      slug,
      title,
      topic_type,
      platform_count,
      published_at,
      topic_cards (
        headline,
        summary,
        image_url,
        learn_brief,
        quality_score
      ),
      youtube_recommendations (
        video_id,
        title,
        channel_name,
        duration,
        reason,
        position
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!topic || !topic.topic_cards?.length) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Fetch source articles
  const { data: topicSources } = await supabase
    .from('topic_sources')
    .select('source_items(title, url, platform:sources(platform))')
    .eq('topic_id', topic.id);

  const sources = (topicSources || []).map((ts: any) => ({
    title: ts.source_items?.title || 'Source',
    url: ts.source_items?.url || '',
    platform: ts.source_items?.platform?.platform || 'web',
  }));

  const card = (topic.topic_cards as any[])[0];
  const youtubeRecs = (topic.youtube_recommendations as any[]) || [];

  return NextResponse.json({
    topic: {
      slug: topic.slug,
      title: topic.title,
      category_tag: card.category_tag || topic.topic_type,
      published_at: topic.published_at,
      platform_count: topic.platform_count,
    },
    card: {
      headline: card.headline,
      summary: card.summary,
      image_url: card.image_url,
      learn_brief: card.learn_brief,
      quality_score: card.quality_score,
    },
    youtube_recs: youtubeRecs
      .sort((a: any, b: any) => a.position - b.position)
      .map((r: any) => ({
        video_id: r.video_id,
        title: r.title,
        channel_name: r.channel_name,
        duration: r.duration,
        reason: r.reason,
        position: r.position,
      })),
    sources,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/learn/
git commit -m "feat: new GET /api/learn/[slug] route with card + youtube recs + sources"
```

### Task 14: Add new RSS feed sources

- [ ] **Step 1: Insert new sources via Supabase SQL**

```sql
INSERT INTO sources (name, platform, url, is_active) VALUES
  ('Anthropic Blog', 'rss', 'https://www.anthropic.com/blog/rss', true),
  ('OpenAI Blog', 'rss', 'https://openai.com/blog/rss.xml', true)
ON CONFLICT DO NOTHING;
```

Run in Supabase SQL editor. Verify URLs work at implementation time. Add Google/Meta/Microsoft/HuggingFace blogs as they are confirmed.

- [ ] **Step 2: Commit note (no code change — DB only)**

No git commit needed for DB-only inserts.

---

## Chunk 7: Frontend Components

### Task 15: CategoryBadge component

**Files:**
- Create: `src/components/learn/CategoryBadge.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/learn/CategoryBadge.tsx
const CATEGORY_COLORS: Record<string, string> = {
  'Model Launch': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Tool Update': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Research': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Policy': 'bg-red-500/20 text-red-300 border-red-500/30',
  'Tutorial': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Industry': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'Opinion': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const DEFAULT_COLOR = 'bg-gray-500/20 text-gray-300 border-gray-500/30';

export function CategoryBadge({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] || DEFAULT_COLOR;
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}>
      {category}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learn/CategoryBadge.tsx
git commit -m "feat: add CategoryBadge component with color coding"
```

### Task 16: FeedCard component

**Files:**
- Create: `src/components/feed/FeedCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/feed/FeedCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CategoryBadge } from '@/components/learn/CategoryBadge';

interface FeedCardProps {
  slug: string;
  headline: string;
  summary: string;
  keyFact: string | null;
  categoryTag: string;
  imageUrl: string | null;
  sourceCount: number;
  publishedAt: string;
}

export function FeedCard({
  slug, headline, summary, keyFact,
  categoryTag, imageUrl, sourceCount, publishedAt,
}: FeedCardProps) {
  const timeAgo = getTimeAgo(publishedAt);

  return (
    <Link href={`/learn/${slug}`} className="block">
      <article className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-[#7C6AF7]/30 transition-colors">
        {/* Image */}
        <div className="relative aspect-[16/9] bg-[#0a0a0a]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={headline}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#7C6AF7]/10 flex items-center justify-center">
                <span className="text-2xl text-[#7C6AF7]">AI</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <CategoryBadge category={categoryTag} />

          <h2 className="text-lg font-semibold text-[#F0F0F0] leading-tight">
            {headline}
          </h2>

          <p className="text-sm text-[#A0A0A0] leading-relaxed">
            {summary}
          </p>

          {keyFact && (
            <div className="bg-[#7C6AF7]/10 border border-[#7C6AF7]/20 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-[#7C6AF7]">KEY FACT</p>
              <p className="text-sm text-[#F0F0F0]">{keyFact}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-[#666] pt-1">
            <span>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/feed/FeedCard.tsx
git commit -m "feat: add FeedCard component (InShorts-style card)"
```

### Task 17: CardStack component

**Files:**
- Create: `src/components/feed/CardStack.tsx`

- [ ] **Step 1: Write the component**

A scrollable card list (start simple — vertical scroll, not swipe gestures. Add swipe polish in Chunk 9).

```tsx
// src/components/feed/CardStack.tsx
'use client';

import { FeedCard } from './FeedCard';

interface Topic {
  slug: string;
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
  image_url: string | null;
  platform_count: number;
  published_at: string;
}

export function CardStack({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-full bg-[#7C6AF7]/10 flex items-center justify-center mb-4">
          <span className="text-2xl">📡</span>
        </div>
        <h2 className="text-lg font-semibold text-[#F0F0F0] mb-2">No topics yet today</h2>
        <p className="text-sm text-[#666]">Check back later — the pipeline runs every few hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-6 max-w-lg mx-auto">
      {topics.map((topic) => (
        <FeedCard
          key={topic.slug}
          slug={topic.slug}
          headline={topic.headline}
          summary={topic.summary}
          keyFact={topic.key_fact}
          categoryTag={topic.category_tag}
          imageUrl={topic.image_url}
          sourceCount={topic.platform_count}
          publishedAt={topic.published_at}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/feed/CardStack.tsx
git commit -m "feat: add CardStack component for scrollable feed"
```

### Task 18: VideoRecommendation + SourceList components

**Files:**
- Create: `src/components/learn/VideoRecommendation.tsx`
- Create: `src/components/learn/SourceList.tsx`

- [ ] **Step 1: Write VideoRecommendation**

```tsx
// src/components/learn/VideoRecommendation.tsx
import Image from 'next/image';

interface VideoRecProps {
  videoId: string;
  title: string;
  channelName: string;
  duration: string;
  reason: string;
}

export function VideoRecommendation({ videoId, title, channelName, duration, reason }: VideoRecProps) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-xl bg-[#111] border border-white/5 hover:border-[#7C6AF7]/30 transition-colors"
    >
      <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-[#0a0a0a]">
        <Image
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={title}
          fill
          className="object-cover"
          sizes="128px"
        />
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
          {duration}
        </span>
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <p className="text-sm font-medium text-[#F0F0F0] line-clamp-2">{title}</p>
        <p className="text-xs text-[#666] mt-0.5">{channelName}</p>
        <p className="text-xs text-[#7C6AF7] mt-1 line-clamp-1">{reason}</p>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Write SourceList**

```tsx
// src/components/learn/SourceList.tsx
import { ExternalLink } from 'lucide-react';

interface Source {
  title: string;
  url: string;
  platform: string;
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ul className="space-y-2">
      {sources.map((source, i) => (
        <li key={i}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-[#7C6AF7] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{source.title}</span>
            <span className="text-xs text-[#444]">({source.platform})</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/learn/VideoRecommendation.tsx src/components/learn/SourceList.tsx
git commit -m "feat: add VideoRecommendation and SourceList components"
```

### Task 19: TopicIllustration component

**Files:**
- Create: `src/components/learn/TopicIllustration.tsx`

- [ ] **Step 1: Write the component with fallback states**

```tsx
// src/components/learn/TopicIllustration.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

interface Props {
  imageUrl: string | null;
  alt: string;
}

export function TopicIllustration({ imageUrl, alt }: Props) {
  const [error, setError] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className="w-full aspect-[16/9] rounded-xl bg-gradient-to-br from-[#7C6AF7]/10 to-[#080808] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🧠</div>
          <p className="text-xs text-[#666]">Visual pending</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 800px"
        onError={() => setError(true)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learn/TopicIllustration.tsx
git commit -m "feat: add TopicIllustration component with error fallback"
```

### Task 20: LearnBrief component

**Files:**
- Create: `src/components/learn/LearnBrief.tsx`

- [ ] **Step 1: Write the full learn page layout component**

```tsx
// src/components/learn/LearnBrief.tsx
import { CategoryBadge } from './CategoryBadge';
import { TopicIllustration } from './TopicIllustration';
import { VideoRecommendation } from './VideoRecommendation';
import { SourceList } from './SourceList';

interface LearnBriefData {
  what_it_is: string;
  why_it_matters: string;
  key_details: string[];
  [key: string]: unknown;
}

interface YouTubeRec {
  video_id: string;
  title: string;
  channel_name: string;
  duration: string;
  reason: string;
}

interface Source {
  title: string;
  url: string;
  platform: string;
}

interface Props {
  title: string;
  categoryTag: string;
  publishedAt: string;
  imageUrl: string | null;
  brief: LearnBriefData;
  youtubeRecs: YouTubeRec[];
  sources: Source[];
}

export function LearnBrief({
  title, categoryTag, publishedAt, imageUrl,
  brief, youtubeRecs, sources,
}: Props) {
  const timeAgo = getTimeAgo(publishedAt);

  return (
    <article className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <CategoryBadge category={categoryTag} />
          <span className="text-xs text-[#666]">{timeAgo}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#F0F0F0] leading-tight">
          {title}
        </h1>
      </header>

      {/* Illustration */}
      <TopicIllustration imageUrl={imageUrl} alt={title} />

      {/* What it is */}
      <section>
        <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-2">
          What it is
        </h2>
        <p className="text-[#D0D0D0] leading-relaxed">{brief.what_it_is}</p>
      </section>

      {/* Why it matters */}
      <section>
        <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-2">
          Why it matters
        </h2>
        <p className="text-[#D0D0D0] leading-relaxed">{brief.why_it_matters}</p>
      </section>

      {/* Key details */}
      <section>
        <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-2">
          Key details
        </h2>
        <ul className="space-y-2">
          {brief.key_details.map((detail, i) => (
            <li key={i} className="flex gap-2 text-[#D0D0D0]">
              <span className="text-[#7C6AF7] mt-0.5">•</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* YouTube recommendations */}
      {youtubeRecs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-3">
            Worth watching
          </h2>
          <div className="space-y-3">
            {youtubeRecs.map((rec) => (
              <VideoRecommendation key={rec.video_id} {...rec} />
            ))}
          </div>
          {/* YouTube attribution per API ToS */}
          <p className="text-[10px] text-[#444] mt-2">
            Video data provided by YouTube. Videos link to youtube.com.
          </p>
        </section>
      )}

      {/* Sources */}
      <section className="border-t border-white/5 pt-6">
        <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-3">
          Sources
        </h2>
        <SourceList sources={sources} />
      </section>
    </article>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learn/LearnBrief.tsx
git commit -m "feat: add LearnBrief layout component with all sections"
```

---

## Chunk 8: Frontend Pages

### Task 21: Rewrite feed page

**Files:**
- Rewrite: `src/app/feed/page.tsx`

- [ ] **Step 1: Read the current feed page to understand imports and layout**

- [ ] **Step 2: Rewrite the feed page**

```tsx
// src/app/feed/page.tsx
import { createClient } from '@/lib/supabase/server';
import { CardStack } from '@/components/feed/CardStack';

export const metadata = {
  title: 'TopSnip — AI Intelligence Feed',
  description: 'Your personal AI news dashboard',
};

export default async function FeedPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: topics } = await supabase
    .from('topics')
    .select(`
      slug,
      trending_score,
      platform_count,
      published_at,
      topic_cards (
        headline,
        summary,
        key_fact,
        category_tag,
        image_url
      )
    `)
    .eq('status', 'published')
    .gte('published_at', `${today}T00:00:00Z`)
    .order('trending_score', { ascending: false })
    .limit(30);

  const formatted = (topics || [])
    .filter((t: any) => t.topic_cards?.length > 0)
    .map((t: any) => ({
      slug: t.slug,
      headline: t.topic_cards[0].headline,
      summary: t.topic_cards[0].summary,
      key_fact: t.topic_cards[0].key_fact,
      category_tag: t.topic_cards[0].category_tag,
      image_url: t.topic_cards[0].image_url,
      platform_count: t.platform_count,
      published_at: t.published_at,
    }));

  return (
    <main className="min-h-screen bg-[#080808]">
      <header className="sticky top-0 z-10 bg-[#080808]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <h1 className="text-lg font-bold text-[#F0F0F0]">
          Top<span className="text-[#7C6AF7]">Snip</span>
        </h1>
      </header>
      <CardStack topics={formatted} />
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/feed/page.tsx
git commit -m "feat: rewrite feed page with InShorts-style card stack"
```

### Task 22: Create learn page

**Files:**
- Create: `src/app/learn/[slug]/page.tsx`

- [ ] **Step 1: Create directory and page**

```tsx
// src/app/learn/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { LearnBrief } from '@/components/learn/LearnBrief';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('topics')
    .select('title, topic_cards(headline)')
    .eq('slug', slug)
    .single();

  return {
    title: data?.topic_cards?.[0]?.headline || data?.title || 'TopSnip',
  };
}

export default async function LearnPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from('topics')
    .select(`
      id, slug, title, topic_type, platform_count, published_at,
      topic_cards (headline, summary, image_url, learn_brief, quality_score, category_tag),
      youtube_recommendations (video_id, title, channel_name, duration, reason, position)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!topic || !topic.topic_cards?.length) notFound();

  // Fetch sources
  const { data: topicSources } = await supabase
    .from('topic_sources')
    .select('source_items(title, url, sources(platform))')
    .eq('topic_id', topic.id);

  const sources = (topicSources || []).map((ts: any) => ({
    title: ts.source_items?.title || 'Source',
    url: ts.source_items?.url || '',
    platform: ts.source_items?.sources?.platform || 'web',
  }));

  const card = (topic.topic_cards as any[])[0];
  const youtubeRecs = ((topic.youtube_recommendations as any[]) || [])
    .sort((a: any, b: any) => a.position - b.position);

  return (
    <main className="min-h-screen bg-[#080808]">
      <nav className="sticky top-0 z-10 bg-[#080808]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <Link href="/feed" className="flex items-center gap-2 text-sm text-[#666] hover:text-[#F0F0F0] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>
      </nav>

      <LearnBrief
        title={topic.title}
        categoryTag={card.category_tag || topic.topic_type}
        publishedAt={topic.published_at}
        imageUrl={card.image_url}
        brief={card.learn_brief as any}
        youtubeRecs={youtubeRecs}
        sources={sources}
      />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/learn/
git commit -m "feat: add learn page with visual deep-dive layout"
```

### Task 23: Redirect root to feed

**Files:**
- Rewrite: `src/app/page.tsx`

- [ ] **Step 1: Replace landing page with redirect**

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/feed');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redirect root to /feed"
```

---

## Chunk 9: Cleanup + Configuration

### Task 24: Remove unused v2 pages and routes

**Files to delete:**
- `src/app/auth/` (entire directory)
- `src/app/onboarding/` (entire directory)
- `src/app/settings/` (entire directory)
- `src/app/knowledge/` (entire directory)
- `src/app/history/` (entire directory)
- `src/app/upgrade/` (entire directory)
- `src/app/s/` (entire directory)
- `src/app/topic/` (entire directory — replaced by `/learn`)
- `src/app/about/` (if exists)
- `src/app/api/search/` (entire directory)
- `src/app/api/email/` (entire directory)
- `src/app/api/user/` (entire directory)
- `src/app/api/feed/check-new/` (if exists as subdirectory)
- `src/app/api/feed/stats/` (if exists as subdirectory)
- `src/components/learning-brief/` (entire directory)
- `src/components/SignUpGate.tsx`

- [ ] **Step 1: Delete directories and files**

```bash
rm -rf src/app/auth src/app/onboarding src/app/settings src/app/knowledge
rm -rf src/app/history src/app/upgrade src/app/s src/app/topic src/app/about
rm -rf src/app/api/search src/app/api/email src/app/api/user
rm -rf src/components/learning-brief
rm -f src/components/SignUpGate.tsx
```

- [ ] **Step 2: Fix any broken imports**

Run: `npx next build 2>&1 | head -50`

If build fails with import errors, fix them. Common fixes:
- Remove imports of deleted components from `layout.tsx`
- Remove auth-related middleware if it exists
- Remove references to deleted pages from navigation components

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused v2 pages, routes, and components"
```

### Task 25: Update vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Update cron schedule**

```json
{
  "crons": [
    { "path": "/api/ingest/run", "schedule": "0 8 * * *" },
    { "path": "/api/content/generate", "schedule": "30 8 * * *" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: update cron schedule for v3 daily pipeline"
```

### Task 26: Add OPENAI_API_KEY to environment

- [ ] **Step 1: Add to .env.local**

```
OPENAI_API_KEY=sk-...
```

- [ ] **Step 2: Add to Vercel environment variables**

Go to Vercel Dashboard → Project → Settings → Environment Variables → Add `OPENAI_API_KEY`.

- [ ] **Step 3: Update .env.example if it exists**

Add `OPENAI_API_KEY=` as a placeholder.

---

## Chunk 10: End-to-End Verification

### Task 27: Run full build and lint

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Lint**

Run: `npx eslint src/`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

### Task 28: Manual pipeline test

- [ ] **Step 1: Trigger ingestion manually**

```bash
curl -X POST http://localhost:3000/api/ingest/run -H "Authorization: Bearer $CRON_SECRET"
```

Verify: New source_items appear in DB, topics detected.

- [ ] **Step 2: Trigger content generation manually**

```bash
curl -X POST http://localhost:3000/api/content/generate -H "Authorization: Bearer $CRON_SECRET"
```

Verify: `topic_cards` rows created, images generated (or fallback used), YouTube recs saved.

- [ ] **Step 3: Check the feed**

Visit `http://localhost:3000/feed`
Verify: Cards display with headline, summary, image, category badge.

- [ ] **Step 4: Check a learn page**

Click "Learn More" on any card.
Verify: Full learn page loads with illustration, what/why sections, key details, YouTube recs, sources.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: TopSnip v3 — personal AI intelligence dashboard complete"
```

---

## Parallel Execution Groups

Tasks that can run in parallel (for subagent-driven development):

| Group | Tasks | Dependencies |
|-------|-------|-------------|
| **A: Database** | Task 1 | None |
| **B: Utilities** | Tasks 2, 3, 4, 5 | None (parallel with A) |
| **C: Content Pipeline** | Tasks 6, 7, 8, 9 | Depends on A + B |
| **D: Pipeline Refactor** | Tasks 10, 11 | Depends on C |
| **E: API Routes** | Tasks 12, 13, 14 | Depends on D |
| **F: Components** | Tasks 15-20 | None (parallel with C/D/E) |
| **G: Pages** | Tasks 21, 22, 23 | Depends on E + F |
| **H: Cleanup** | Tasks 24, 25, 26 | Depends on G |
| **I: Verification** | Tasks 27, 28 | Depends on H |

**Optimal dispatch order:**
1. A + B + F in parallel (database, utilities, components)
2. C after A + B complete (content pipeline)
3. D after C (orchestrator refactor)
4. E after D (API routes)
5. G after E + F (pages — needs both API routes and components)
6. H after G (cleanup)
7. I after H (verification)
