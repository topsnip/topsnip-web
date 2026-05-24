# Codebase Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the codebase review findings in dependency order, then sharpen TopSnip from a generic personal AI news dashboard into an AI change radar for builders.

**Architecture:** Stabilize the ingestion and scoring pipeline first because every downstream product surface depends on topic quality. Then harden public data access, cost controls, source grounding, API contracts, and UI correctness. Finish with cleanup, documentation, and the product pivot features once the foundations are reliable.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4, Supabase Postgres/RLS/Storage, Anthropic SDK, OpenAI image API, YouTube Data API, Upstash Redis, Vitest, Playwright.

---

## Execution Summary

Run the work in this order:

1. Create a branch and run the baseline checks.
2. Add a Vitest `test` script and pipeline-focused tests.
3. Fix ingestion correctness: source-specific fetchers, engagement snapshots, velocity, and topic merge aggregation.
4. Fix public API and UI correctness: feed contract, source count, empty links, learn DTO.
5. Harden database/RLS, storage setup, migrations, and cost ledgers.
6. Add source-grounding verification before publish.
7. Add reliability work: retries, health status, generation claim release, key prechecks.
8. Clean old product surfaces: README, Stripe, stale CSS/robots/analytics, site URL.
9. Add the product sharpen: action label, novelty note, and daily briefing artifact.
10. Run full verification and create a human-readable release note.

The first shippable milestone is after Task 6. At that point the feed should be materially more trustworthy even before the product pivot work.

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `docs/superpowers/plans/2026-05-23-codebase-review-remediation.md` | This implementation plan. |
| `src/__tests__/lib/ingest-pipeline.test.ts` | Tests for source-specific fetchers, engagement snapshot behavior, and topic merge aggregation. |
| `src/__tests__/lib/feed-api-contract.test.ts` | Tests for feed date/ranking/pagination formatting helpers. |
| `src/__tests__/lib/source-verifier.test.ts` | Tests for source-grounding verifier parsing and fail-closed behavior. |
| `src/__tests__/lib/usage-ledger.test.ts` | Tests for persisted API usage accounting helpers. |
| `src/lib/content/source-verifier.ts` | Haiku-backed verifier for generated card/brief grounding. |
| `src/lib/content/usage-ledger.ts` | Supabase-backed usage events for LLM, image, and YouTube quota accounting. |
| `src/lib/ingest/fetchers/retry-fetch.ts` | Shared fetch retry helper for external source APIs. |
| `src/lib/feed/format-feed.ts` | Shared feed DTO formatter for page/API tests and reuse. |
| `src/lib/learn/get-learn-topic.ts` | Shared learn-page data fetcher/DTO. |
| `src/app/briefing/page.tsx` | Daily briefing artifact page. |
| `src/app/api/briefing/route.ts` | JSON API for daily briefing cards. |
| `supabase/migration-v6-review-remediation.sql` | RLS, storage bucket, usage ledger, source media/action fields, idempotence fixes. |

### Modified Files

| File | Responsibility |
|---|---|
| `package.json` | Add `test` script. |
| `.env.local.example` | Add `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and v3 notes. |
| `README.md` | Replace old auth/search/transcript docs with v3 setup and operations. |
| `src/lib/ingest/orchestrator.ts` | Source-specific fetch dispatch, upsert updates, all-row engagement snapshots, merge aggregation, limited snapshot concurrency. |
| `src/lib/ingest/scorer.ts` | Export/test velocity behavior as needed. |
| `src/lib/ingest/fetchers/reddit.ts` | Fetch exactly the configured subreddit source. |
| `src/lib/ingest/fetchers/arxiv.ts` | Fetch the configured arXiv source URL/query. |
| `src/lib/ingest/fetchers/rss.ts` | Use shared retry helper and optionally capture image metadata. |
| `src/lib/ingest/fetchers/youtube.ts` | Use shared retry helper and stronger health/quota behavior. |
| `src/lib/ingest/fetchers/github.ts` | Use shared retry helper and stronger health behavior. |
| `src/lib/ingest/types.ts` | Add optional source media fields if used for image fallback. |
| `src/lib/content/orchestrator.ts` | Release claims on `null`, usage accounting, action/novelty fields, publish gating. |
| `src/lib/content/card-generator.ts` | Source verifier, source-image fallback, action/novelty parsing, usage accounting. |
| `src/lib/content/card-prompts.ts` | Add action/novelty fields and citation discipline. |
| `src/lib/content/card-quality.ts` | Use verifier result and stricter quality score. |
| `src/lib/content/image-generator.ts` | Usage accounting, clearer prompt language, key precheck. |
| `src/lib/content/youtube-recs.ts` | Required-key prechecks, retry helper, usage accounting, YouTube branding metadata if needed. |
| `src/lib/ratelimit.ts` | Fail behavior for production without Redis; call into usage ledger where appropriate. |
| `src/app/api/feed/route.ts` | Implement `date`, `days`, ranking, `total`, generic error shape. |
| `src/app/feed/page.tsx` | Use shared feed formatter and show real error state. |
| `src/components/feed/FeedCard.tsx` | Display source count and platform count correctly; action label if present. |
| `src/components/feed/CardStack.tsx` | Empty-state copy and data shape updates. |
| `src/app/api/learn/[slug]/route.ts` | Use shared learn DTO. |
| `src/app/learn/[slug]/page.tsx` | Use shared learn DTO. |
| `src/components/learn/SourceList.tsx` | Filter empty URLs or render non-link source rows. |
| `src/components/learn/LearnBrief.tsx` | Add YouTube attribution/branding treatment; render action/novelty fields. |
| `src/components/learn/VideoRecommendation.tsx` | Add accessible YouTube label/branding. |
| `src/app/api/stripe/*` | Disable with explicit 410 unless monetization is re-enabled. |
| `src/app/globals.css` | Remove stale auth/search CSS. |
| `src/app/robots.ts` | Remove stale auth/search disallows or keep only real routes. |
| `src/lib/analytics.ts` | Remove or mark old auth/search/subscription helpers as dormant. |
| `src/app/layout.tsx`, `src/app/sitemap.ts` | Derive site URL from `NEXT_PUBLIC_APP_URL`. |
| `e2e/smoke.spec.ts` | Make feed date/ranking tests assert real behavior. |

---

## Task 0: Branch, Baseline, And Safety

**Files:**
- Read: `CODEBASE_REVIEW.md`
- Read: `package.json`
- Read: `supabase/migration-v*.sql`

- [ ] **Step 1: Create a working branch**

Run:

```bash
git switch -c codex/review-remediation
```

Expected: branch changes to `codex/review-remediation`.

- [ ] **Step 2: Confirm working tree state**

Run:

```bash
git status --short
```

Expected: only intentional review/planning docs are untracked or modified. Do not overwrite unrelated human changes.

- [ ] **Step 3: Run baseline checks**

Run:

```bash
npx tsc --noEmit --incremental false --pretty false
npm run lint
npx vitest run
```

Expected:

```text
tsc exits 0
eslint exits 0
vitest exits 0
```

- [ ] **Step 4: Commit the plan and review artifact if they are still uncommitted**

Run:

```bash
git add CODEBASE_REVIEW.md docs/superpowers/plans/2026-05-23-codebase-review-remediation.md
git commit -m "docs: add codebase review remediation plan"
```

Expected: commit succeeds. If these docs are already committed, skip this step.

---

## Task 1: Add Test Script And Pipeline Test Harness

**Files:**
- Modify: `package.json`
- Create: `src/__tests__/lib/ingest-pipeline.test.ts`

- [ ] **Step 1: Add the unit test script**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "tsc --noEmit && next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:e2e": "npx playwright test",
    "test:e2e:headed": "npx playwright test --headed"
  }
}
```

- [ ] **Step 2: Create the ingest pipeline test file with a reusable fake Supabase**

Create `src/__tests__/lib/ingest-pipeline.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('ingest pipeline remediation guardrails', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps this suite wired into Vitest', () => {
    expect(true).toBe(true);
  });
});
```

This first test is intentionally small. Later tasks replace it with real behavior tests as functions are exported.

- [ ] **Step 3: Run the new script**

Run:

```bash
npm test
```

Expected: all current Vitest tests pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json package-lock.json src/__tests__/lib/ingest-pipeline.test.ts
git commit -m "test: add pipeline test harness"
```

---

## Task 2: Make Reddit And arXiv Fetchers Source-Specific

**Files:**
- Modify: `src/lib/ingest/orchestrator.ts`
- Modify: `src/lib/ingest/fetchers/reddit.ts`
- Modify: `src/lib/ingest/fetchers/arxiv.ts`
- Modify: `src/__tests__/lib/ingest-pipeline.test.ts`

- [ ] **Step 1: Write failing tests for source parsing**

Append to `src/__tests__/lib/ingest-pipeline.test.ts`:

```ts
import { getSubredditFromSourceUrl } from '@/lib/ingest/fetchers/reddit';
import { buildArxivFetchUrl } from '@/lib/ingest/fetchers/arxiv';

describe('source-specific fetcher parsing', () => {
  it('extracts subreddit from configured source URL', () => {
    expect(getSubredditFromSourceUrl('https://reddit.com/r/LocalLLaMA')).toBe('LocalLLaMA');
    expect(getSubredditFromSourceUrl('https://www.reddit.com/r/MachineLearning/')).toBe('MachineLearning');
  });

  it('uses configured arXiv URL when it points at export.arxiv.org', () => {
    const url = 'http://export.arxiv.org/api/query?search_query=cat:cs.CL&max_results=20';
    expect(buildArxivFetchUrl(url, 20)).toContain('cat%3Acs.CL');
  });
});
```

Run:

```bash
npx vitest run src/__tests__/lib/ingest-pipeline.test.ts
```

Expected: FAIL because the exported helpers do not exist.

- [ ] **Step 2: Export and use Reddit source parsing**

Replace the hardcoded multi-subreddit behavior in `src/lib/ingest/fetchers/reddit.ts` with a single configured subreddit:

```ts
import type { FetchResult, RawSourceItem } from "../types";

interface RedditPost {
  id: string;
  title: string;
  url: string;
  permalink: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

interface RedditListing {
  data: {
    children: Array<{ data: RedditPost }>;
  };
}

export function getSubredditFromSourceUrl(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const match = parsed.pathname.match(/\/r\/([^/]+)/i);
    return match?.[1] || "MachineLearning";
  } catch {
    return "MachineLearning";
  }
}

export async function fetchReddit(
  sourceId: string,
  sourceUrl: string,
  minScore: number = 50
): Promise<FetchResult> {
  const sub = getSubredditFromSourceUrl(sourceUrl);

  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "TopSnip/1.0 (AI Intelligence Dashboard)",
      },
    });

    if (!res.ok) {
      return {
        sourceId,
        items: [],
        health: res.status === 429 ? "degraded" : "down",
        error: `Reddit r/${sub} returned ${res.status}`,
      };
    }

    const listing: RedditListing = await res.json();
    const items: RawSourceItem[] = [];

    for (const child of listing.data.children) {
      const post = child.data;
      if (post.score < minScore) continue;

      items.push({
        externalId: post.id,
        sourceId,
        title: post.title,
        url: post.url.startsWith("http")
          ? post.url
          : `https://www.reddit.com${post.permalink}`,
        contentSnippet: post.selftext?.slice(0, 500) || post.title,
        engagementScore: post.score + post.num_comments,
        publishedAt: new Date(post.created_utc * 1000).toISOString(),
      });
    }

    return {
      sourceId,
      items,
      health: items.length > 0 ? "healthy" : "degraded",
      error: items.length === 0 ? `No qualifying Reddit posts for r/${sub}` : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sourceId,
      items: [],
      health: "down",
      error: `Reddit fetch failed for r/${sub}: ${msg}`,
    };
  }
}
```

- [ ] **Step 3: Export and use arXiv URL builder**

Modify `src/lib/ingest/fetchers/arxiv.ts` so it accepts the configured source URL:

```ts
import type { FetchResult, RawSourceItem } from "../types";
import { safeText, isSafeUrl } from "../safe-fetch";

const ARXIV_API_URL = "https://export.arxiv.org/api/query";

export function buildArxivFetchUrl(sourceUrl: string, maxResults: number = 20): string {
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.hostname !== "export.arxiv.org") {
      throw new Error("not arxiv export host");
    }
    parsed.searchParams.set("max_results", String(maxResults));
    return parsed.toString();
  } catch {
    const params = new URLSearchParams({
      search_query: "cat:cs.AI",
      start: "0",
      max_results: String(maxResults),
      sortBy: "submittedDate",
      sortOrder: "descending",
    });
    return `${ARXIV_API_URL}?${params}`;
  }
}

export async function fetchArxiv(
  sourceId: string,
  sourceUrl: string,
  maxResults: number = 20
): Promise<FetchResult> {
  try {
    const fetchUrl = buildArxivFetchUrl(sourceUrl, maxResults);
    if (!isSafeUrl(fetchUrl)) {
      return { sourceId, items: [], health: "down", error: "arXiv URL blocked by SSRF policy" };
    }

    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`arXiv API returned ${res.status}`);
    }

    const xml = await safeText(res, 2_000_000);
    const items: RawSourceItem[] = [];
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

    for (const entry of entries) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\s+/g, " ") || "";
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim().replace(/\s+/g, " ") || "";
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || "";
      const arxivId = id.replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");

      if (title && id) {
        items.push({
          externalId: arxivId,
          sourceId,
          title,
          url: id,
          contentSnippet: summary.slice(0, 500),
          engagementScore: 0,
          publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
        });
      }
    }

    return { sourceId, items, health: items.length > 0 ? "healthy" : "degraded" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sourceId,
      items: [],
      health: "down",
      error: `arXiv fetch failed: ${msg}`,
    };
  }
}
```

- [ ] **Step 4: Pass `source.url` from the orchestrator**

Modify `src/lib/ingest/orchestrator.ts`:

```ts
case "reddit":
  return fetchReddit(source.id, source.url);
case "arxiv":
  return fetchArxiv(source.id, source.url);
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npx vitest run src/__tests__/lib/ingest-pipeline.test.ts
npx tsc --noEmit --incremental false --pretty false
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/ingest/orchestrator.ts src/lib/ingest/fetchers/reddit.ts src/lib/ingest/fetchers/arxiv.ts src/__tests__/lib/ingest-pipeline.test.ts
git commit -m "fix(ingest): make reddit and arxiv fetchers source-specific"
```

---

## Task 3: Fix Engagement Updates, Snapshots, And Velocity

**Files:**
- Modify: `src/lib/ingest/orchestrator.ts`
- Modify: `src/lib/ingest/scorer.ts`
- Modify: `src/__tests__/lib/ingest-pipeline.test.ts`

- [ ] **Step 1: Export velocity for unit testing**

In `src/lib/ingest/scorer.ts`, change:

```ts
function computeVelocity(
```

to:

```ts
export function computeVelocity(
```

- [ ] **Step 2: Add a velocity regression test**

Append to `src/__tests__/lib/ingest-pipeline.test.ts`:

```ts
import { computeVelocity } from '@/lib/ingest/scorer';

describe('engagement velocity', () => {
  it('uses the last two engagement snapshots instead of raw volume', () => {
    const velocity = computeVelocity(
      [
        { score: 100, timestamp: '2026-05-23T00:00:00.000Z' },
        { score: 160, timestamp: '2026-05-23T02:00:00.000Z' },
      ],
      160
    );

    expect(velocity).toBe(30);
  });
});
```

Run:

```bash
npx vitest run src/__tests__/lib/ingest-pipeline.test.ts
```

Expected: PASS after Step 1.

- [ ] **Step 3: Replace ignore-only upsert with update-on-conflict**

In `src/lib/ingest/orchestrator.ts`, change the source item upsert from:

```ts
.upsert(rows, { onConflict: "source_id,external_id", ignoreDuplicates: true })
```

to:

```ts
.upsert(rows, { onConflict: "source_id,external_id" })
```

Keep `.select("id")`. This makes Supabase return IDs for inserted and updated rows, so snapshots include repeated items.

- [ ] **Step 4: Rename the ID collection for clarity**

In `src/lib/ingest/orchestrator.ts`, rename:

```ts
const allUpsertedIds: string[] = [];
```

to:

```ts
const touchedSourceItemIds: string[] = [];
```

Then replace all later `allUpsertedIds` usages with `touchedSourceItemIds`.

- [ ] **Step 5: Cap snapshot update concurrency**

Add this helper near `runWithConcurrency` in `src/lib/ingest/orchestrator.ts`:

```ts
async function runLimited<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  async function lane() {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}
```

In `snapshotEngagement`, replace the unbounded `Promise.all(items.map(...))` block with:

```ts
const updateErrors: string[] = [];

await runLimited(items, 10, async (item) => {
  const history: Array<{ score: number; timestamp: string }> =
    Array.isArray(item.engagement_history) ? item.engagement_history : [];

  history.push({ score: item.engagement_score || 0, timestamp: now });
  const pruned = history.slice(-MAX_ENGAGEMENT_SNAPSHOTS);

  const { error: updateErr } = await supabase
    .from("source_items")
    .update({ engagement_history: pruned })
    .eq("id", item.id);

  if (updateErr) {
    updateErrors.push(`Engagement snapshot update failed for ${item.id}: ${updateErr.message}`);
  }
});

errors.push(...updateErrors);
```

- [ ] **Step 6: Run verification**

Run:

```bash
npx vitest run src/__tests__/lib/ingest-pipeline.test.ts
npm test
npx tsc --noEmit --incremental false --pretty false
```

Expected: all pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/ingest/orchestrator.ts src/lib/ingest/scorer.ts src/__tests__/lib/ingest-pipeline.test.ts
git commit -m "fix(ingest): update engagement snapshots for repeated items"
```

---

## Task 4: Update Topic Aggregates On Merge

**Files:**
- Modify: `src/lib/ingest/orchestrator.ts`
- Modify: `src/__tests__/lib/ingest-pipeline.test.ts`

- [ ] **Step 1: Add a pure helper for aggregate merging**

In `src/lib/ingest/orchestrator.ts`, export this helper near the top-level helper functions:

```ts
export function mergeTopicAggregates(
  existing: {
    trending_score: number | null;
    source_count: number | null;
    platforms: string[] | null;
  },
  candidate: {
    trendingScore: number;
    sourceCount: number;
    platforms: string[];
  }
) {
  const platforms = Array.from(new Set([...(existing.platforms ?? []), ...candidate.platforms]));
  return {
    trending_score: Math.max(existing.trending_score ?? 0, candidate.trendingScore),
    source_count: Math.max(existing.source_count ?? 0, 0) + candidate.sourceCount,
    platform_count: platforms.length,
    platforms,
    updated_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Add the aggregate unit test**

Append to `src/__tests__/lib/ingest-pipeline.test.ts`:

```ts
import { mergeTopicAggregates } from '@/lib/ingest/orchestrator';

describe('topic merge aggregates', () => {
  it('unions platforms and increases source count when merging candidates', () => {
    const merged = mergeTopicAggregates(
      { trending_score: 1.5, source_count: 2, platforms: ['rss'] },
      { trendingScore: 2.25, sourceCount: 3, platforms: ['reddit', 'rss'] }
    );

    expect(merged.trending_score).toBe(2.25);
    expect(merged.source_count).toBe(5);
    expect(merged.platform_count).toBe(2);
    expect(merged.platforms.sort()).toEqual(['reddit', 'rss']);
  });
});
```

- [ ] **Step 3: Use the helper in the merge branch**

Inside the `if (mergeTargetId)` branch in `src/lib/ingest/orchestrator.ts`, after linking `topic_sources`, fetch the existing topic and update aggregates:

```ts
const { data: existingTopic } = await supabase
  .from("topics")
  .select("trending_score, source_count, platforms")
  .eq("id", mergeTargetId)
  .maybeSingle();

if (existingTopic) {
  await supabase
    .from("topics")
    .update(mergeTopicAggregates(existingTopic, candidate))
    .eq("id", mergeTargetId);
}
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx vitest run src/__tests__/lib/ingest-pipeline.test.ts
npx tsc --noEmit --incremental false --pretty false
```

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/ingest/orchestrator.ts src/__tests__/lib/ingest-pipeline.test.ts
git commit -m "fix(ingest): update topic aggregates on merge"
```

---

## Task 5: Fix Feed API Contract And Ranking

**Files:**
- Create: `src/lib/feed/format-feed.ts`
- Create: `src/__tests__/lib/feed-api-contract.test.ts`
- Modify: `src/app/api/feed/route.ts`
- Modify: `src/app/feed/page.tsx`
- Modify: `e2e/smoke.spec.ts`

- [ ] **Step 1: Create feed formatter**

Create `src/lib/feed/format-feed.ts`:

```ts
type TopicJoin = {
  slug: string;
  trending_score: number;
  platform_count: number;
  source_count?: number | null;
  published_at: string;
};

export type FeedCardRow = {
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
  image_url: string | null;
  action_label?: string | null;
  novelty_note?: string | null;
  topics: TopicJoin | TopicJoin[];
};

export type FeedTopicDto = {
  slug: string;
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
  image_url: string | null;
  action_label: string | null;
  novelty_note: string | null;
  trending_score: number;
  platform_count: number;
  source_count: number;
  published_at: string;
};

export function formatFeedRows(rows: FeedCardRow[]): FeedTopicDto[] {
  return rows.flatMap((card) => {
    const topic = Array.isArray(card.topics) ? card.topics[0] : card.topics;
    if (!topic) return [];

    return [{
      slug: topic.slug,
      headline: card.headline,
      summary: card.summary,
      key_fact: card.key_fact,
      category_tag: card.category_tag,
      image_url: card.image_url,
      action_label: card.action_label ?? null,
      novelty_note: card.novelty_note ?? null,
      trending_score: topic.trending_score,
      platform_count: topic.platform_count,
      source_count: topic.source_count ?? topic.platform_count,
      published_at: topic.published_at,
    }];
  });
}

export function isoDayRange(date: string): { start: string; end: string } {
  const startDate = new Date(`${date}T00:00:00.000Z`);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}
```

- [ ] **Step 2: Add formatter tests**

Create `src/__tests__/lib/feed-api-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatFeedRows, isoDayRange } from '@/lib/feed/format-feed';

describe('feed API contract helpers', () => {
  it('formats source_count separately from platform_count', () => {
    const rows = formatFeedRows([
      {
        headline: 'Headline',
        summary: 'Summary',
        key_fact: null,
        category_tag: 'Industry',
        image_url: null,
        topics: {
          slug: 'story',
          trending_score: 9,
          platform_count: 2,
          source_count: 7,
          published_at: '2026-05-23T12:00:00.000Z',
        },
      },
    ]);

    expect(rows[0].source_count).toBe(7);
    expect(rows[0].platform_count).toBe(2);
  });

  it('builds an exact UTC day range for date filtering', () => {
    expect(isoDayRange('2026-05-23')).toEqual({
      start: '2026-05-23T00:00:00.000Z',
      end: '2026-05-24T00:00:00.000Z',
    });
  });
});
```

- [ ] **Step 3: Update feed API**

In `src/app/api/feed/route.ts`:

1. Import helpers:

```ts
import { formatFeedRows, isoDayRange, type FeedCardRow } from '@/lib/feed/format-feed';
```

2. Replace date handling with:

```ts
const date = url.searchParams.get('date');
const days = Math.max(1, Math.min(parseInt(url.searchParams.get('days') || '7') || 7, 30));
const range = date
  ? isoDayRange(date)
  : { start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() };
```

3. Select `source_count` and future optional fields:

```ts
.select(`
  headline,
  summary,
  key_fact,
  category_tag,
  image_url,
  action_label,
  novelty_note,
  topics!inner (
    slug,
    trending_score,
    platform_count,
    source_count,
    published_at,
    status
  )
`, { count: 'exact' })
```

4. Filter by range:

```ts
.gte('topics.published_at', range.start)
.lt('topics.published_at', range.end)
```

5. Sort formatted rows in memory by `trending_score` descending because the query starts from `topic_cards`:

```ts
const formatted = formatFeedRows(page as unknown as FeedCardRow[])
  .sort((a, b) => b.trending_score - a.trending_score);
```

6. Return real count:

```ts
return NextResponse.json({
  topics: formatted,
  total: count ?? formatted.length,
  has_more: hasMore,
});
```

7. Replace raw DB error response with:

```ts
console.error('[feed-api] Query error:', error.message);
return NextResponse.json({ error: 'Could not load feed' }, { status: 500 });
```

- [ ] **Step 4: Update feed page**

In `src/app/feed/page.tsx`, import and use `formatFeedRows`. Select `source_count`, `action_label`, and `novelty_note`. Sort by `trending_score` in formatted results.

Also replace empty error behavior with:

```tsx
if (error) {
  console.error('[feed] Query error:', error.message);
  return (
    <main className="min-h-screen bg-[#080808]">
      <header className="sticky top-0 z-10 bg-[#080808]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <h1 className="text-lg font-bold text-[#F0F0F0]">
          Top<span className="text-[#7C6AF7]">Snip</span>
        </h1>
      </header>
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
        <p className="text-sm text-[#999]">The feed could not load. Try again shortly.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Update E2E contract test name**

In `e2e/smoke.spec.ts`, change:

```ts
test("feed API supports date parameter", async ({ request }) => {
```

to:

```ts
test("feed API accepts date parameter and returns pagination metadata", async ({ request }) => {
```

Keep the broad assertion unless a test database fixture exists.

- [ ] **Step 6: Run verification**

Run:

```bash
npx vitest run src/__tests__/lib/feed-api-contract.test.ts
npm test
npx tsc --noEmit --incremental false --pretty false
```

Expected: all pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/feed/format-feed.ts src/__tests__/lib/feed-api-contract.test.ts src/app/api/feed/route.ts src/app/feed/page.tsx e2e/smoke.spec.ts
git commit -m "fix(feed): honor date contract and rank by trending score"
```

---

## Task 6: Add Migration For RLS, Storage, Usage Ledger, And New Card Fields

**Files:**
- Create: `supabase/migration-v6-review-remediation.sql`

- [ ] **Step 1: Create migration**

Create `supabase/migration-v6-review-remediation.sql`:

```sql
-- migration-v6-review-remediation.sql
-- TopSnip review remediation: RLS tightening, storage setup, usage ledger,
-- idempotent policy repair, source media, and card action fields.

-- 1. topic_cards action/novelty fields
ALTER TABLE topic_cards
  ADD COLUMN IF NOT EXISTS action_label TEXT,
  ADD COLUMN IF NOT EXISTS novelty_note TEXT;

-- 2. source_items optional media field for image fallback
ALTER TABLE source_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. API usage ledger for cost controls
CREATE TABLE IF NOT EXISTS api_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_events_created_at
  ON api_usage_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_events_provider_created_at
  ON api_usage_events(provider, created_at DESC);

ALTER TABLE api_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service write api_usage_events" ON api_usage_events;
CREATE POLICY "Service write api_usage_events" ON api_usage_events
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Storage bucket for generated illustrations
INSERT INTO storage.buckets (id, name, public)
VALUES ('topic-illustrations', 'topic-illustrations', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read topic illustrations" ON storage.objects;
CREATE POLICY "Public read topic illustrations" ON storage.objects
  FOR SELECT USING (bucket_id = 'topic-illustrations');

DROP POLICY IF EXISTS "Service write topic illustrations" ON storage.objects;
CREATE POLICY "Service write topic illustrations" ON storage.objects
  FOR ALL USING (bucket_id = 'topic-illustrations' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'topic-illustrations' AND auth.role() = 'service_role');

-- 5. Tighten public RLS policies for raw ingestion tables.
DROP POLICY IF EXISTS "Public read source items" ON source_items;
DROP POLICY IF EXISTS "Public read source_items for published topics" ON source_items;
CREATE POLICY "Public read source_items for published topics" ON source_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM topic_sources ts
      JOIN topics t ON t.id = ts.topic_id
      WHERE ts.source_item_id = source_items.id
        AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Public read topic sources" ON topic_sources;
DROP POLICY IF EXISTS "Public read topic_sources for published topics" ON topic_sources;
CREATE POLICY "Public read topic_sources for published topics" ON topic_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM topics t
      WHERE t.id = topic_sources.topic_id
        AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Public read sources" ON sources;
DROP POLICY IF EXISTS "Public read sources used by published topics" ON sources;
CREATE POLICY "Public read sources used by published topics" ON sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM source_items si
      JOIN topic_sources ts ON ts.source_item_id = si.id
      JOIN topics t ON t.id = ts.topic_id
      WHERE si.source_id = sources.id
        AND t.status = 'published'
    )
  );

-- 6. Make existing created policies idempotent for future reruns.
DROP POLICY IF EXISTS "Service write topics" ON topics;
CREATE POLICY "Service write topics" ON topics
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow public read on topic_cards" ON topic_cards;
CREATE POLICY "Allow public read on topic_cards" ON topic_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM topics t
      WHERE t.id = topic_cards.topic_id
        AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Allow service write on topic_cards" ON topic_cards;
CREATE POLICY "Allow service write on topic_cards" ON topic_cards
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

- [ ] **Step 2: Add a note at the top of the migration**

Add this comment after the header:

```sql
-- Run this after migration-v5-hardening.sql. It assumes v3 topic_cards and
-- v5 schema-drift columns already exist.
```

- [ ] **Step 3: Manual migration verification command**

After applying in Supabase SQL editor, run:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'topic_cards'
  AND column_name IN ('action_label', 'novelty_note');

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'api_usage_events'
ORDER BY ordinal_position;

SELECT id, public
FROM storage.buckets
WHERE id = 'topic-illustrations';
```

Expected: both card columns exist, ledger columns exist, and bucket is public.

- [ ] **Step 4: Commit**

Run:

```bash
git add supabase/migration-v6-review-remediation.sql
git commit -m "chore(db): add review remediation migration"
```

---

## Task 7: Release Generation Claims On Null Results

**Files:**
- Modify: `src/lib/content/orchestrator.ts`

- [ ] **Step 1: Add a release helper**

In `src/lib/content/orchestrator.ts`, add:

```ts
async function releaseTopicClaim(
  supabase: SupabaseClient,
  topicId: string
): Promise<void> {
  await supabase
    .from("topics")
    .update({ status: "detected", updated_at: new Date().toISOString() })
    .eq("id", topicId)
    .eq("status", "generating");
}
```

- [ ] **Step 2: Use helper when `generateCard` returns null**

Replace:

```ts
return result ? { topic } : null;
```

with:

```ts
if (!result) {
  await releaseTopicClaim(supabase, topic.id);
  return null;
}

return { topic };
```

- [ ] **Step 3: Use helper in the catch block**

Replace the catch block release query with:

```ts
await releaseTopicClaim(supabase, topic.id);
```

- [ ] **Step 4: Update stale route comment**

In `src/app/api/content/generate/route.ts`, replace:

```ts
* and generates role-specific learning briefs.
```

with:

```ts
* and generates v3 cards, learn briefs, illustrations, and video recommendations.
```

- [ ] **Step 5: Run verification**

Run:

```bash
npx tsc --noEmit --incremental false --pretty false
npm test
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/content/orchestrator.ts src/app/api/content/generate/route.ts
git commit -m "fix(content): release topic claims when generation returns null"
```

---

## Task 8: Add Persisted Usage Ledger And Required-Key Prechecks

**Files:**
- Create: `src/lib/content/usage-ledger.ts`
- Create: `src/__tests__/lib/usage-ledger.test.ts`
- Modify: `src/lib/content/orchestrator.ts`
- Modify: `src/lib/content/image-generator.ts`
- Modify: `src/lib/content/youtube-recs.ts`
- Modify: `src/lib/ratelimit.ts`
- Modify: `.env.local.example`

- [ ] **Step 1: Create usage ledger helper**

Create `src/lib/content/usage-ledger.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type UsageProvider = 'anthropic' | 'openai' | 'youtube';

export async function recordUsage(
  supabase: SupabaseClient | null,
  event: {
    provider: UsageProvider;
    operation: string;
    units?: number;
    topicId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from('api_usage_events').insert({
    provider: event.provider,
    operation: event.operation,
    units: event.units ?? 1,
    topic_id: event.topicId ?? null,
    metadata: event.metadata ?? {},
  });

  if (error) {
    console.warn(`[usage-ledger] failed to record ${event.provider}:${event.operation}: ${error.message}`);
  }
}

export async function getUsageSince(
  supabase: SupabaseClient,
  provider: UsageProvider,
  sinceIso: string
): Promise<number> {
  const { data, error } = await supabase
    .from('api_usage_events')
    .select('units')
    .eq('provider', provider)
    .gte('created_at', sinceIso);

  if (error) {
    console.warn(`[usage-ledger] failed to read usage for ${provider}: ${error.message}`);
    return 0;
  }

  return (data ?? []).reduce((sum, row: { units: number | null }) => sum + (row.units ?? 0), 0);
}
```

- [ ] **Step 2: Add helper tests**

Create `src/__tests__/lib/usage-ledger.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { getUsageSince, recordUsage } from '@/lib/content/usage-ledger';

function fakeSupabase() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const gte = vi.fn().mockResolvedValue({ data: [{ units: 2 }, { units: 3 }], error: null });
  const eq = vi.fn(() => ({ gte }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ insert, select }));
  return { client: { from }, insert, from };
}

describe('usage ledger', () => {
  it('records usage events when a Supabase client is available', async () => {
    const { client, insert } = fakeSupabase();
    await recordUsage(client as any, {
      provider: 'anthropic',
      operation: 'card_generation',
      units: 1,
      topicId: 'topic-1',
    });

    expect(insert).toHaveBeenCalledWith({
      provider: 'anthropic',
      operation: 'card_generation',
      units: 1,
      topic_id: 'topic-1',
      metadata: {},
    });
  });

  it('sums usage since a cutoff', async () => {
    const { client } = fakeSupabase();
    await expect(getUsageSince(client as any, 'openai', '2026-05-23T00:00:00.000Z')).resolves.toBe(5);
  });
});
```

- [ ] **Step 3: Add env vars**

Add to `.env.local.example`:

```env
# OpenAI image generation
OPENAI_API_KEY=sk-...

# Upstash Redis quota/rate backing. Required in production for durable cost caps.
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

- [ ] **Step 4: Precheck keys in YouTube recs**

In `src/lib/content/youtube-recs.ts`, move the `ANTHROPIC_API_KEY` check before `incrementYoutubeQuota(101)` and before YouTube fetches:

```ts
const apiKeyAnthropic = process.env.ANTHROPIC_API_KEY;
if (!apiKeyAnthropic) {
  return { recs: [], error: "ANTHROPIC_API_KEY not configured" };
}
```

Then remove the later duplicate check.

- [ ] **Step 5: Record YouTube usage**

Change `findAndSaveYouTubeRecs` signature:

```ts
export async function findAndSaveYouTubeRecs(
  supabase: SupabaseClient,
  topicId: string,
  topicTitle: string
): Promise<{ recs: YouTubeRecommendation[]; error?: string }> {
```

After the quota claim succeeds, add:

```ts
await recordUsage(supabase, {
  provider: 'youtube',
  operation: 'recommendation_search',
  units: 101,
  topicId,
});
```

Import `recordUsage`.

- [ ] **Step 6: Record OpenAI image usage**

Change `generateIllustration` signature in `src/lib/content/image-generator.ts`:

```ts
export async function generateIllustration(
  prompt: string,
  supabase: SupabaseClient | null = null,
  topicId: string | null = null
): Promise<ArrayBuffer | null> {
```

Import `type SupabaseClient` and `recordUsage`. After the OpenAI call returns, before decoding b64, add:

```ts
await recordUsage(supabase, {
  provider: 'openai',
  operation: 'image_generation',
  units: 1,
  topicId,
});
```

In `src/lib/content/card-generator.ts`, change:

```ts
const imageBuffer = await generateIllustration(illustrationPrompt);
```

to:

```ts
const imageBuffer = await generateIllustration(illustrationPrompt, supabase, topicId);
```

- [ ] **Step 7: Record Anthropic card generation usage**

In `src/lib/content/card-generator.ts`, after `callClaudeWithRetry(...)`, add:

```ts
await recordUsage(supabase, {
  provider: 'anthropic',
  operation: 'card_generation',
  units: 1,
  topicId,
  metadata: { model: MODEL },
});
```

Import `recordUsage`.

- [ ] **Step 8: Make Redis absence loud in production**

In `src/lib/ratelimit.ts`, change quota fail-open comments to runtime warnings:

```ts
if (!redis) {
  if (process.env.NODE_ENV === "production") {
    console.error("[quota] Redis is not configured in production; durable quota caps are disabled");
  }
  return true;
}
```

Apply this to both `incrementYoutubeQuota` and `claimDalleImage`.

- [ ] **Step 9: Run verification**

Run:

```bash
npx vitest run src/__tests__/lib/usage-ledger.test.ts
npm test
npx tsc --noEmit --incremental false --pretty false
```

Expected: pass.

- [ ] **Step 10: Commit**

Run:

```bash
git add src/lib/content/usage-ledger.ts src/__tests__/lib/usage-ledger.test.ts src/lib/content/orchestrator.ts src/lib/content/image-generator.ts src/lib/content/youtube-recs.ts src/lib/content/card-generator.ts src/lib/ratelimit.ts .env.local.example
git commit -m "feat(cost): persist API usage events"
```

---

## Task 9: Add Source Grounding Verification

**Files:**
- Create: `src/lib/content/source-verifier.ts`
- Create: `src/__tests__/lib/source-verifier.test.ts`
- Modify: `src/lib/content/card-generator.ts`
- Modify: `src/lib/content/card-quality.ts`
- Modify: `src/lib/content/card-prompts.ts`

- [ ] **Step 1: Create verifier**

Create `src/lib/content/source-verifier.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import type { LearnBrief, TopicCard } from './card-types';

const MODEL = 'claude-haiku-4-5';

export interface SourceVerification {
  pass: boolean;
  unsupportedClaims: string[];
  copiedPhrases: string[];
  reason: string;
}

export function parseVerificationResponse(text: string): SourceVerification {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { pass: false, unsupportedClaims: [], copiedPhrases: [], reason: 'verifier returned no JSON' };
    }
    const parsed = JSON.parse(match[0]);
    return {
      pass: Boolean(parsed.pass),
      unsupportedClaims: Array.isArray(parsed.unsupportedClaims) ? parsed.unsupportedClaims.map(String) : [],
      copiedPhrases: Array.isArray(parsed.copiedPhrases) ? parsed.copiedPhrases.map(String) : [],
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'no reason provided',
    };
  } catch {
    return { pass: false, unsupportedClaims: [], copiedPhrases: [], reason: 'verifier returned invalid JSON' };
  }
}

export async function verifySourceGrounding(
  card: TopicCard,
  brief: LearnBrief,
  sourceSnippets: string[],
  anthropicClient = new Anthropic()
): Promise<SourceVerification> {
  const sourceText = sourceSnippets.slice(0, 8).join('\n---\n').slice(0, 12_000);
  const generated = JSON.stringify({ card, learn_brief: brief }).slice(0, 8_000);

  const message = await anthropicClient.messages.create(
    {
      model: MODEL,
      max_tokens: 500,
      system: `You verify whether generated AI news copy is grounded in provided source snippets.
Return JSON only:
{"pass": boolean, "unsupportedClaims": string[], "copiedPhrases": string[], "reason": string}
Fail if generated copy makes specific factual claims not present in sources.
Fail if it copies distinctive phrasing or sentence structure from the sources.
Pass only when claims are supported and wording is transformed.`,
      messages: [
        {
          role: 'user',
          content: `<sources>\n${sourceText}\n</sources>\n\n<generated>\n${generated}\n</generated>`,
        },
      ],
    },
    { signal: AbortSignal.timeout(20_000) }
  );

  const block = message.content[0];
  if (!block || block.type !== 'text') {
    return { pass: false, unsupportedClaims: [], copiedPhrases: [], reason: 'verifier returned non-text response' };
  }

  return parseVerificationResponse(block.text);
}
```

- [ ] **Step 2: Add verifier tests**

Create `src/__tests__/lib/source-verifier.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseVerificationResponse } from '@/lib/content/source-verifier';

describe('source verifier response parsing', () => {
  it('parses a passing verifier response', () => {
    expect(parseVerificationResponse('{"pass":true,"unsupportedClaims":[],"copiedPhrases":[],"reason":"grounded"}')).toEqual({
      pass: true,
      unsupportedClaims: [],
      copiedPhrases: [],
      reason: 'grounded',
    });
  });

  it('fails closed on malformed verifier output', () => {
    expect(parseVerificationResponse('not json').pass).toBe(false);
  });
});
```

- [ ] **Step 3: Call verifier before image generation**

In `src/lib/content/card-generator.ts`, after `checkCardQuality` passes and before image generation:

```ts
const verification = await verifySourceGrounding(parsed.card, parsed.learn_brief, sourceSnippets);
await recordUsage(supabase, {
  provider: 'anthropic',
  operation: 'source_verification',
  units: 1,
  topicId,
  metadata: { model: 'claude-haiku-4-5' },
});

if (!verification.pass) {
  console.warn(`[card-gen] Source verification failed for ${topicSlug}:`, verification);
  return null;
}
```

Import `verifySourceGrounding`.

- [ ] **Step 4: Update prompt to request action and citations**

In `src/lib/content/card-prompts.ts`, add these fields to the JSON schema:

```json
"action_label": "string - one of: Ignore, Monitor, Try, Migrate, Watch",
"novelty_note": "string - one sentence explaining what changed compared with normal background noise"
```

Also add this rule:

```text
- For every concrete claim, ensure the fact appears in source material. If source support is weak, say less.
```

- [ ] **Step 5: Parse action and novelty fields**

This is implemented fully in Task 15 after DB columns are present. For now, ensure the verifier tolerates extra JSON fields.

- [ ] **Step 6: Run verification**

Run:

```bash
npx vitest run src/__tests__/lib/source-verifier.test.ts
npm test
npx tsc --noEmit --incremental false --pretty false
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/content/source-verifier.ts src/__tests__/lib/source-verifier.test.ts src/lib/content/card-generator.ts src/lib/content/card-prompts.ts src/lib/content/card-quality.ts
git commit -m "feat(content): verify generated cards against source snippets"
```

---

## Task 10: Image Fallback, Storage Readiness, And Prompt Cleanup

**Files:**
- Modify: `src/lib/ingest/types.ts`
- Modify: `src/lib/ingest/fetchers/rss.ts`
- Modify: `src/lib/content/image-generator.ts`
- Modify: `src/lib/content/card-generator.ts`
- Modify: `src/components/feed/FeedCard.tsx`

- [ ] **Step 1: Add optional image field to raw item type**

In `src/lib/ingest/types.ts`, add:

```ts
imageUrl?: string | null;
```

to `RawSourceItem`.

- [ ] **Step 2: Store image_url during source item upsert**

In `src/lib/ingest/orchestrator.ts`, add to each row:

```ts
image_url: item.imageUrl ? sanitizeUrl(item.imageUrl) : null,
```

- [ ] **Step 3: Extract RSS image metadata**

In `src/lib/ingest/fetchers/rss.ts`, add:

```ts
function extractImage(itemXml: string): string {
  const mediaMatch = itemXml.match(/<media:content\b[^>]*\burl=["']([^"']+)["']/i);
  if (mediaMatch?.[1]) return mediaMatch[1];

  const enclosureMatch = itemXml.match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\/[^"']+["']/i);
  if (enclosureMatch?.[1]) return enclosureMatch[1];

  return "";
}
```

Add `imageUrl: extractImage(entry)` to the parsed `FeedItem`, then map it into `RawSourceItem.imageUrl`.

- [ ] **Step 4: Add source fallback helper in card generator**

In `src/lib/content/card-generator.ts`, add:

```ts
async function findSourceImageFallback(
  supabase: SupabaseClient,
  topicId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('topic_sources')
    .select('source_items(image_url, engagement_score)')
    .eq('topic_id', topicId);

  const rows = (data ?? [])
    .map((row: any) => row.source_items)
    .filter((item: any) => item?.image_url)
    .sort((a: any, b: any) => (b.engagement_score ?? 0) - (a.engagement_score ?? 0));

  return rows[0]?.image_url ?? null;
}
```

After image upload attempt, add:

```ts
if (!imageUrl) {
  imageUrl = await findSourceImageFallback(supabase, topicId);
}
```

- [ ] **Step 5: Clean image prompt contradiction**

In `src/lib/content/image-generator.ts`, replace:

```ts
'Purple accent color (#7C6AF7). White text (#F0F0F0).',
```

with:

```ts
'Purple accent color (#7C6AF7). Use simple geometric shapes and clear visual hierarchy.',
```

Keep:

```ts
'No watermarks, no logos, no text overlays.',
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm test
npx tsc --noEmit --incremental false --pretty false
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/ingest/types.ts src/lib/ingest/orchestrator.ts src/lib/ingest/fetchers/rss.ts src/lib/content/image-generator.ts src/lib/content/card-generator.ts
git commit -m "feat(images): use source image fallback when generation fails"
```

---

## Task 11: External Fetch Retry And Health Accuracy

**Files:**
- Create: `src/lib/ingest/fetchers/retry-fetch.ts`
- Modify: `src/lib/ingest/fetchers/rss.ts`
- Modify: `src/lib/ingest/fetchers/youtube.ts`
- Modify: `src/lib/ingest/fetchers/github.ts`
- Modify: `src/lib/ingest/fetchers/hn.ts`
- Modify: `src/lib/content/youtube-recs.ts`

- [ ] **Step 1: Create shared retry helper**

Create `src/lib/ingest/fetchers/retry-fetch.ts`:

```ts
export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  attempts = 2
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
```

- [ ] **Step 2: Use retry helper in source fetchers**

In fetchers, replace direct `fetch(...)` calls that hit external APIs with `fetchWithRetry(...)`. Keep the same URL and `RequestInit` shape.

Example for RSS:

```ts
const res = await fetchWithRetry(feedUrl, {
  signal: AbortSignal.timeout(15_000),
  headers: {
    "User-Agent": "TopSnip/1.0 (AI Learning Platform)",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
  },
});
```

- [ ] **Step 3: Ensure zero-result health is not healthy**

For every fetcher that can return zero items, return:

```ts
health: items.length > 0 ? "healthy" : "degraded"
```

Include an `error` string when the empty result is likely operational rather than a legitimate quiet source.

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit --incremental false --pretty false
npm test
```

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/ingest/fetchers/retry-fetch.ts src/lib/ingest/fetchers/rss.ts src/lib/ingest/fetchers/youtube.ts src/lib/ingest/fetchers/github.ts src/lib/ingest/fetchers/hn.ts src/lib/content/youtube-recs.ts
git commit -m "fix(reliability): retry external source fetches"
```

---

## Task 12: Learn DTO, Source Links, YouTube Branding, And Counts

**Files:**
- Create: `src/lib/learn/get-learn-topic.ts`
- Modify: `src/app/learn/[slug]/page.tsx`
- Modify: `src/app/api/learn/[slug]/route.ts`
- Modify: `src/components/learn/SourceList.tsx`
- Modify: `src/components/learn/LearnBrief.tsx`
- Modify: `src/components/learn/VideoRecommendation.tsx`
- Modify: `src/components/feed/FeedCard.tsx`
- Modify: `src/components/feed/CardStack.tsx`

- [ ] **Step 1: Create shared learn DTO helper**

Create `src/lib/learn/get-learn-topic.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getLearnTopic(supabase: SupabaseClient, slug: string) {
  const { data: topic } = await supabase
    .from('topics')
    .select('id, slug, title, topic_type, platform_count, source_count, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!topic) return null;

  const [{ data: card }, { data: youtubeRecs }, { data: topicSources }] = await Promise.all([
    supabase
      .from('topic_cards')
      .select('headline, summary, image_url, learn_brief, quality_score, category_tag, action_label, novelty_note')
      .eq('topic_id', topic.id)
      .single(),
    supabase
      .from('youtube_recommendations')
      .select('video_id, title, channel_name, duration, reason, position')
      .eq('topic_id', topic.id)
      .order('position', { ascending: true }),
    supabase
      .from('topic_sources')
      .select('source_items(title, url, sources(platform))')
      .eq('topic_id', topic.id),
  ]);

  if (!card) return null;

  const sources = ((topicSources || []) as any[])
    .map((ts) => ({
      title: ts.source_items?.title || 'Source',
      url: ts.source_items?.url || '',
      platform: ts.source_items?.sources?.platform || 'web',
    }))
    .filter((source) => Boolean(source.title));

  return {
    topic,
    card,
    youtubeRecs: youtubeRecs || [],
    sources,
  };
}
```

- [ ] **Step 2: Use helper in learn page and API**

In both `src/app/learn/[slug]/page.tsx` and `src/app/api/learn/[slug]/route.ts`, replace the serial query logic with `getLearnTopic(supabase, slug)`.

For the page:

```ts
const data = await getLearnTopic(supabase, slug);
if (!data) notFound();
```

For the API:

```ts
const data = await getLearnTopic(supabase, slug);
if (!data) {
  return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
}
```

- [ ] **Step 3: Fix source links**

In `src/components/learn/SourceList.tsx`, render non-links for missing URLs:

```tsx
if (!source.url) {
  return (
    <li key={i} className="flex items-center gap-2 text-sm text-[#777]">
      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{source.title}</span>
      <span className="text-xs text-[#444]">({source.platform})</span>
    </li>
  );
}
```

- [ ] **Step 4: Add YouTube branding label**

In `src/components/learn/LearnBrief.tsx`, change attribution copy to:

```tsx
<p className="text-[10px] text-[#666] mt-2">
  YouTube recommendations use YouTube Data API metadata. Thumbnails and titles link to youtube.com.
</p>
```

In `src/components/learn/VideoRecommendation.tsx`, add:

```tsx
<span className="text-[10px] uppercase tracking-wide text-red-300">YouTube</span>
```

above the title inside the text column.

- [ ] **Step 5: Display source and platform counts correctly**

In `FeedCardProps`, replace:

```ts
sourceCount: number;
```

with:

```ts
sourceCount: number;
platformCount: number;
```

Render:

```tsx
<span>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
<span>·</span>
<span>{platformCount} platform{platformCount !== 1 ? 's' : ''}</span>
```

Update all `FeedCard` call sites to pass both fields.

- [ ] **Step 6: Update empty state copy**

In `src/components/feed/CardStack.tsx`, replace:

```tsx
<p className="text-sm text-[#666]">Check back later — the pipeline runs every few hours.</p>
```

with:

```tsx
<p className="text-sm text-[#666]">Check back after the next daily pipeline run.</p>
```

- [ ] **Step 7: Run verification**

Run:

```bash
npx tsc --noEmit --incremental false --pretty false
npm test
```

Expected: pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/learn/get-learn-topic.ts src/app/learn/[slug]/page.tsx src/app/api/learn/[slug]/route.ts src/components/learn/SourceList.tsx src/components/learn/LearnBrief.tsx src/components/learn/VideoRecommendation.tsx src/components/feed/FeedCard.tsx src/components/feed/CardStack.tsx
git commit -m "fix(ui): correct learn data and source attribution"
```

---

## Task 13: Disable Dormant Stripe And Remove Old Product Rot

**Files:**
- Modify: `src/app/api/stripe/checkout/route.ts`
- Modify: `src/app/api/stripe/portal/route.ts`
- Modify: `src/app/api/stripe/webhook/route.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/robots.ts`
- Modify: `src/lib/analytics.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Disable Stripe checkout and portal with 410**

Replace `POST` handlers in `checkout` and `portal` with:

```ts
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Billing is disabled for TopSnip v3" },
    { status: 410 }
  );
}
```

- [ ] **Step 2: Keep webhook disabled unless Stripe is needed**

Replace `src/app/api/stripe/webhook/route.ts` with:

```ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Billing webhooks are disabled for TopSnip v3" },
    { status: 410 }
  );
}
```

- [ ] **Step 3: Remove stale CSS blocks**

In `src/app/globals.css`, remove blocks related to:

```text
auth pages
feed-search-container
search bar pulse dot
```

Keep shared layout, typography, animations, and scrollbar utilities.

- [ ] **Step 4: Update robots**

In `src/app/robots.ts`, use:

```ts
disallow: ["/api/"],
```

Remove stale auth/settings/onboarding/history disallows.

- [ ] **Step 5: Simplify analytics helpers**

In `src/lib/analytics.ts`, keep:

```ts
trackEvent
trackTopicClick
trackPageView
```

Remove search/signup/login/subscription helper exports unless still imported. Run `rg -n "trackSearch|trackSignUp|trackLogin|trackSubscriptionAction" src` first; if imports exist, remove those call sites or keep deprecated wrappers with comments.

- [ ] **Step 6: Derive app URL**

In `src/app/sitemap.ts`, replace hardcoded `SITE_URL` with:

```ts
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.topsnip.co";
```

In `src/app/layout.tsx`, set metadata base with:

```ts
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.topsnip.co";
```

Then use `new URL(appUrl)`.

- [ ] **Step 7: Run verification**

Run:

```bash
rg -n "upgrade|settings|onboarding|history|feed-search-container|trackSearch|trackSignUp|trackLogin|trackSubscriptionAction" src
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm test
```

Expected: no stale references except intentional docs/history in review files.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/app/api/stripe src/app/globals.css src/app/robots.ts src/lib/analytics.ts src/app/layout.tsx src/app/sitemap.ts
git commit -m "chore: disable dormant billing and remove old product rot"
```

---

## Task 14: Rewrite README And Env Docs For v3

**Files:**
- Modify: `README.md`
- Modify: `.env.local.example`

- [ ] **Step 1: Replace README with v3-focused content**

Use this structure:

```md
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
```

- [ ] **Step 2: Remove old transcript/search/auth/pricing language**

Run:

```bash
rg -n "transcript|search bar|Google OAuth|magic link|Guest|Free tier|Pro|upgrade|history|schema.sql|services/transcripts" README.md
```

Expected: no matches unless they appear in a "removed from v3" note.

- [ ] **Step 3: Run docs sanity**

Run:

```bash
npm test
```

Expected: pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add README.md .env.local.example
git commit -m "docs: rewrite setup docs for TopSnip v3"
```

---

## Task 15: Add Action Label And Novelty Note To Cards

**Files:**
- Modify: `src/lib/content/card-types.ts`
- Modify: `src/lib/content/card-prompts.ts`
- Modify: `src/lib/content/card-generator.ts`
- Modify: `src/components/feed/FeedCard.tsx`
- Modify: `src/components/learn/LearnBrief.tsx`
- Modify: `src/lib/feed/format-feed.ts`

- [ ] **Step 1: Extend types**

In `src/lib/content/card-types.ts`, add to `TopicCard`:

```ts
action_label: "Ignore" | "Monitor" | "Try" | "Migrate" | "Watch";
novelty_note: string | null;
```

- [ ] **Step 2: Extend prompt schema**

In `src/lib/content/card-prompts.ts`, ensure the `card` schema includes:

```json
"action_label": "string - one of: Ignore, Monitor, Try, Migrate, Watch",
"novelty_note": "string - one sentence explaining what actually changed and why this is not background noise"
```

Add rule:

```text
- Pick an action_label:
  Ignore = low consequence
  Monitor = real but not actionable yet
  Try = worth hands-on testing
  Migrate = builders should consider changing implementation
  Watch = video/research is worth deeper attention
```

- [ ] **Step 3: Parse action and novelty**

In `parseCardResponse`, add:

```ts
const actionLabels = new Set(['Ignore', 'Monitor', 'Try', 'Migrate', 'Watch']);
const actionLabel = actionLabels.has(parsed.card.action_label)
  ? parsed.card.action_label
  : 'Monitor';
```

Then include:

```ts
action_label: actionLabel,
novelty_note: parsed.card.novelty_note || null,
```

- [ ] **Step 4: Save fields**

In the `topic_cards` upsert, add:

```ts
action_label: parsed.card.action_label,
novelty_note: parsed.card.novelty_note,
```

- [ ] **Step 5: Render in feed**

In `FeedCard`, render `action_label` near the badge:

```tsx
{actionLabel && (
  <span className="text-[10px] text-white/80 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
    {actionLabel}
  </span>
)}
```

Use stable prop names `actionLabel` and `noveltyNote`.

- [ ] **Step 6: Render in learn page**

In `LearnBrief`, show novelty below the title when present:

```tsx
{noveltyNote && (
  <p className="text-sm text-[#A0A0A0] leading-relaxed">{noveltyNote}</p>
)}
```

- [ ] **Step 7: Update card parser tests**

In `src/__tests__/lib/card-generator.test.ts`, update valid JSON test to include:

```ts
action_label: 'Try',
novelty_note: 'The new release changes API behavior for builders.',
```

Assert:

```ts
expect(result!.card.action_label).toBe('Try');
expect(result!.card.novelty_note).toContain('API behavior');
```

- [ ] **Step 8: Run verification**

Run:

```bash
npx vitest run src/__tests__/lib/card-generator.test.ts src/__tests__/lib/feed-api-contract.test.ts
npm test
npx tsc --noEmit --incremental false --pretty false
```

Expected: pass.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/lib/content/card-types.ts src/lib/content/card-prompts.ts src/lib/content/card-generator.ts src/components/feed/FeedCard.tsx src/components/learn/LearnBrief.tsx src/lib/feed/format-feed.ts src/__tests__/lib/card-generator.test.ts
git commit -m "feat(product): add action and novelty signals to cards"
```

---

## Task 16: Add Daily Briefing Artifact

**Files:**
- Create: `src/app/api/briefing/route.ts`
- Create: `src/app/briefing/page.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Create briefing API**

Create `src/app/api/briefing/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { formatFeedRows, isoDayRange, type FeedCardRow } from '@/lib/feed/format-feed';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const { start, end } = isoDayRange(date);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('topic_cards')
    .select(`
      headline,
      summary,
      key_fact,
      category_tag,
      image_url,
      action_label,
      novelty_note,
      topics!inner (
        slug,
        trending_score,
        platform_count,
        source_count,
        published_at,
        status
      )
    `)
    .eq('topics.status', 'published')
    .gte('topics.published_at', start)
    .lt('topics.published_at', end)
    .limit(10);

  if (error) {
    console.error('[briefing-api] Query error:', error.message);
    return NextResponse.json({ error: 'Could not load briefing' }, { status: 500 });
  }

  const topics = formatFeedRows((data ?? []) as unknown as FeedCardRow[])
    .sort((a, b) => b.trending_score - a.trending_score)
    .slice(0, 5);

  return NextResponse.json({ date, topics });
}
```

- [ ] **Step 2: Create briefing page**

Create `src/app/briefing/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatFeedRows, isoDayRange, type FeedCardRow } from '@/lib/feed/format-feed';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'TopSnip Briefing',
  description: 'Daily AI change radar for builders',
};

export default async function BriefingPage() {
  const date = new Date().toISOString().slice(0, 10);
  const { start, end } = isoDayRange(date);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('topic_cards')
    .select(`
      headline,
      summary,
      key_fact,
      category_tag,
      image_url,
      action_label,
      novelty_note,
      topics!inner (
        slug,
        trending_score,
        platform_count,
        source_count,
        published_at,
        status
      )
    `)
    .eq('topics.status', 'published')
    .gte('topics.published_at', start)
    .lt('topics.published_at', end)
    .limit(10);

  const topics = error
    ? []
    : formatFeedRows((data ?? []) as unknown as FeedCardRow[])
        .sort((a, b) => b.trending_score - a.trending_score)
        .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#080808] text-[#F0F0F0]">
      <article className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-[#7C6AF7]">{date}</p>
          <h1 className="text-3xl font-bold">AI change radar</h1>
          <p className="text-sm text-[#999]">Five builder-relevant changes worth knowing.</p>
        </header>

        {topics.length === 0 ? (
          <p className="text-sm text-[#999]">No briefing topics published yet today.</p>
        ) : (
          <ol className="space-y-5">
            {topics.map((topic, index) => (
              <li key={topic.slug} className="border-t border-white/10 pt-5">
                <div className="flex items-center gap-2 text-xs text-[#7C6AF7]">
                  <span>{index + 1}</span>
                  {topic.action_label && <span>{topic.action_label}</span>}
                  <span>{topic.category_tag}</span>
                </div>
                <h2 className="mt-2 text-xl font-semibold leading-tight">
                  <Link href={`/learn/${topic.slug}`}>{topic.headline}</Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#C8C8C8]">{topic.summary}</p>
                {topic.novelty_note && (
                  <p className="mt-2 text-sm text-[#999]">{topic.novelty_note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </article>
    </main>
  );
}
```

- [ ] **Step 3: Add sitemap entry**

In `src/app/sitemap.ts`, add:

```ts
{
  url: `${SITE_URL}/briefing`,
  lastModified: new Date(),
  changeFrequency: "daily",
  priority: 0.9,
},
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx tsc --noEmit --incremental false --pretty false
npm run lint
npm test
```

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/api/briefing/route.ts src/app/briefing/page.tsx src/app/sitemap.ts
git commit -m "feat(product): add daily AI change briefing"
```

---

## Task 17: Fresh Install And Migration Idempotence Check

**Files:**
- Read/modify if needed: `supabase/*.sql`
- Read/modify if needed: `scripts/*.ts`

- [ ] **Step 1: Scan for non-idempotent policy creation**

Run:

```bash
rg -n "CREATE POLICY" supabase
```

For each `CREATE POLICY`, confirm the same migration contains a matching:

```sql
DROP POLICY IF EXISTS "<policy name>" ON <table_name>;
```

Add missing drops to the same migration or to `migration-v6-review-remediation.sql`.

- [ ] **Step 2: Scan for stale schema setup names**

Run:

```bash
rg -n "schema.sql|migration-v2|topic_content_id|topic_content" README.md docs supabase scripts src
```

Expected:

- `topic_content` may appear in historical docs and migration backfill comments.
- Runtime `src/` must not reference `topic_content` or `topic_content_id`.
- README must not reference `schema.sql`.

- [ ] **Step 3: Run verification**

Run:

```bash
npm test
npx tsc --noEmit --incremental false --pretty false
```

Expected: pass.

- [ ] **Step 4: Commit if changes were needed**

Run:

```bash
git add supabase README.md docs scripts src
git commit -m "chore(db): make migrations safer to rerun"
```

If no files changed, skip commit.

---

## Task 18: Evergreen Decision

**Decision:** Remove the unused evergreen runtime surface for now. Reintroduce it later only if the product explicitly needs foundational learning paths.

**Files:**
- Delete: `src/lib/content/evergreen.ts`
- Delete: `src/app/api/content/restore-evergreens/route.ts`
- Modify: `src/lib/content/orchestrator.ts`
- Modify: `src/app/api/content/retro-classify/route.ts`

- [ ] **Step 1: Remove runtime filters that depend on `is_evergreen` only if safe**

Keep the database column. Remove only unused static content and one-shot restore route.

Do not remove these filters yet:

```ts
.eq("is_evergreen", false)
```

They are harmless and protect old data if it exists.

- [ ] **Step 2: Delete unused evergreen files**

Run:

```bash
git rm src/lib/content/evergreen.ts src/app/api/content/restore-evergreens/route.ts
```

- [ ] **Step 3: Confirm no imports broke**

Run:

```bash
rg -n "EVERGREEN_TOPICS|restore-evergreens|content/evergreen" src
npx tsc --noEmit --incremental false --pretty false
npm test
```

Expected: no `rg` matches in `src`, typecheck/tests pass.

- [ ] **Step 4: Commit**

Run:

```bash
git commit -m "chore: remove unused evergreen runtime code"
```

---

## Task 19: Full Verification

**Files:**
- All changed files

- [ ] **Step 1: Run local checks**

Run:

```bash
npm test
npm run lint
npx tsc --noEmit --incremental false --pretty false
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run Playwright against local app if feasible**

If local Supabase env vars are configured:

```bash
npm run dev
```

In a second terminal:

```bash
npx playwright test --config=playwright.config.ts --project=chromium
```

Expected: smoke tests pass. If Playwright still targets production, either set `baseURL` temporarily through config/env or document that it was not run locally.

- [ ] **Step 3: Manual API checks**

With the dev server running:

```bash
curl -s http://localhost:3000/api/feed?limit=5 | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d); console.log(j.topics.length, j.has_more, typeof j.total)})"
curl -s http://localhost:3000/api/briefing | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d); console.log(j.date, Array.isArray(j.topics))})"
```

Expected: first command prints a number, boolean, and `number`; second prints a date and `true`.

- [ ] **Step 4: Manual cron auth checks**

Without auth:

```bash
curl -i http://localhost:3000/api/ingest/run
curl -i -X POST http://localhost:3000/api/content/generate
```

Expected: 401 responses.

With auth:

```bash
curl -i http://localhost:3000/api/ingest/health -H "Authorization: Bearer $CRON_SECRET"
```

Expected: 200 if env vars are configured; 401 if `$CRON_SECRET` is missing in the shell.

- [ ] **Step 5: Supabase migration manual checks**

After applying v6 in Supabase, run:

```sql
SELECT * FROM api_usage_events LIMIT 1;
SELECT id, public FROM storage.buckets WHERE id = 'topic-illustrations';
SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('source_items', 'topic_sources', 'sources', 'topic_cards');
```

Expected: table exists, bucket exists, raw source public policies are scoped to published topics.

- [ ] **Step 6: Final status**

Run:

```bash
git status --short
git log --oneline -10
```

Expected: clean working tree after committing all intended changes.

---

## Task 20: Release Notes And Human Handoff

**Files:**
- Create: `docs/review-remediation-release-notes.md`

- [ ] **Step 1: Create release notes**

Create `docs/review-remediation-release-notes.md`:

```md
# Review Remediation Release Notes

## What changed

- Fixed ingestion correctness so repeated source items update engagement and velocity.
- Made Reddit and arXiv source rows source-specific.
- Updated topic merge behavior to refresh score and source aggregates.
- Tightened public RLS around raw source data.
- Added persistent API usage accounting.
- Added source-grounding verification before publish.
- Fixed feed API date/ranking/pagination contract.
- Improved image fallback, attribution, and public UI correctness.
- Disabled dormant billing routes for v3.
- Rewrote README for the actual v3 product.
- Added action and novelty signals for the AI change radar direction.
- Added a daily briefing artifact.

## Required production actions

1. Apply Supabase migrations through `supabase/migration-v6-review-remediation.sql`.
2. Confirm `topic-illustrations` bucket exists and is public-readable.
3. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production.
4. Configure `OPENAI_API_KEY` if image generation should run.
5. Trigger a manual ingest and content generation run with `CRON_SECRET`.

## Verification run

- `npm test`
- `npm run lint`
- `npx tsc --noEmit --incremental false --pretty false`
- `npm run build`
```

- [ ] **Step 2: Commit**

Run:

```bash
git add docs/review-remediation-release-notes.md
git commit -m "docs: add remediation release notes"
```

---

## Final Definition Of Done

The remediation is complete when:

- `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false --pretty false`, and `npm run build` all pass.
- Feed API accepts `date`, returns real `total`, and ranks by `trending_score`.
- Ingestion updates duplicate source items and records multiple engagement snapshots.
- Reddit and arXiv fetch only their configured source.
- Topic merges update aggregate score/source/platform fields.
- Public RLS does not expose unlinked or unpublished raw source items.
- Image generation failures can fall back to source images before category placeholders.
- Source-grounding verifier can block unsupported generated claims.
- Usage ledger records Anthropic, OpenAI, and YouTube operations.
- Stripe routes return explicit disabled responses.
- README describes v3, not the old search/auth/transcript product.
- `/briefing` exists as the builder-focused daily artifact.

