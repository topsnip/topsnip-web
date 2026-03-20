# Feed Redesign — Implementation Plan

**Companion to:** `2026-03-19-feed-redesign.md` (Option C Hybrid Dashboard)
**Date:** 2026-03-19
**Status:** Ready for execution

---

## Overview

6 phases, 23 tasks. Phases are sequential (A before B before C, etc.). Tasks within a phase can be parallelized unless a dependency is noted.

**Estimated file count:** 14 new files, 4 modified files, 3 deleted files, 1 new SQL migration.

---

## Phase A: Data Layer

Database changes, new RPC, new API endpoints, rate limiters. Everything downstream depends on this phase.

### A1 — Add `is_evergreen` column to `topics` table

**Files:**
- Create: `supabase/migrations/step7-feed-redesign.sql`

**What it does:**
- `ALTER TABLE public.topics ADD COLUMN is_evergreen boolean NOT NULL DEFAULT false;`
- Add index: `CREATE INDEX idx_topics_evergreen ON public.topics (is_evergreen) WHERE is_evergreen = true;`
- Update RLS policy on `topics` to also allow reading evergreen topics: authenticated users can read topics where `status = 'published' OR is_evergreen = true`.

**Why not alter the status CHECK constraint:** Adding `'evergreen'` to the status enum would break existing queries that filter `status = 'published'`. A boolean column is additive and non-breaking.

**Dependencies:** None
**Acceptance criteria:**
- Column exists with default `false`
- Existing topics unaffected
- Evergreen topics readable by authenticated users even if status is not `'published'`

---

### A2 — Create `get_user_feed_v2` RPC

**Files:**
- Modify: `supabase/migrations/step7-feed-redesign.sql` (append to same migration file from A1)

**What it does:**
Creates a new RPC `get_user_feed_v2(p_user_id uuid)` that:
1. Queries `topics` directly by `published_at >= NOW() - INTERVAL '7 days'` AND `status = 'published'`
2. Caps at 20 results, ordered by `trending_score DESC, published_at DESC`
3. Joins `user_reads` to set `is_read` flag
4. Joins `topic_tags` + user `interests` to compute `personal_score` (same logic as current `get_user_feed`)
5. Marks the highest-scoring topic with `featured = true`
6. Marks topics with `published_at >= NOW() - INTERVAL '4 hours'` as `is_new = true`
7. Fallback: if fewer than 3 results, pads with evergreen topics (`is_evergreen = true`), excluding already-returned IDs

**Return type:**
```sql
RETURNS TABLE (
  topic_id       uuid,
  is_read        boolean,
  is_new         boolean,
  featured       boolean,
  personal_score float
)
```

**Does NOT touch** `daily_digests` — completely bypasses it. The old `get_user_feed` remains for backward compatibility.

**Dependencies:** A1
**Acceptance criteria:**
- Returns up to 20 topics from last 7 days
- Exactly one row has `featured = true` (the highest personal_score)
- Topics published < 4h ago have `is_new = true`
- When < 3 published topics exist, evergreen topics fill in (up to total 20)
- Evergreen topics never have `featured = true`

---

### A3 — Create rate limiters for new endpoints

**Files:**
- Modify: `src/lib/ratelimit.ts`

**What it does:**
Add two new limiter instances at the bottom of the file:
```ts
export const feedPollLimiter = new RateLimiter({ limit: 15, windowMs: 60_000 });
export const feedStatsLimiter = new RateLimiter({ limit: 10, windowMs: 60_000 });
```

**Dependencies:** None
**Acceptance criteria:**
- `feedPollLimiter` allows 15 requests per minute per key
- `feedStatsLimiter` allows 10 requests per minute per key
- Existing limiters unchanged

---

### A4 — Create `GET /api/feed/check-new` endpoint

**Files:**
- Create: `src/app/api/feed/check-new/route.ts`

**What it does:**
- Accepts query param `since` (ISO 8601 timestamp)
- **Security:** `checkOrigin(req)` + auth via `createClient()` + `feedPollLimiter.check(user.id)`
- **Validation:** Parse `since` with `new Date(since)` — reject if `isNaN`. Cap lookback to 24 hours: if `since` is older than 24h, clamp to `NOW() - 24h`.
- Queries: `SELECT COUNT(*) FROM topics WHERE status = 'published' AND published_at > $since`
- Returns: `{ new_count: number }`
- On rate limit: return `429` with `Retry-After` header

**Dependencies:** A3
**Acceptance criteria:**
- Returns correct count of new topics since timestamp
- Rejects unauthenticated requests with 401
- Rejects bad origin with 403
- Returns 429 when rate limited
- Rejects invalid `since` param with 400
- Clamps lookback to 24h max

---

### A5 — Create `GET /api/feed/stats` endpoint

**Files:**
- Create: `src/app/api/feed/stats/route.ts`

**What it does:**
- **Security:** `checkOrigin(req)` + auth via `createClient()` + `feedStatsLimiter.check(user.id)`
- **Cache:** Use a module-level `let cache: { data: Stats; expiresAt: number } | null = null` variable. If `cache` exists and `Date.now() < cache.expiresAt`, return cached response. Otherwise compute fresh data and cache for 60 seconds.
- Queries (use service client for cross-table access):
  - `topics_today`: `COUNT(*) FROM topics WHERE published_at >= CURRENT_DATE AND status = 'published'`
  - `topics_this_week`: `COUNT(*) FROM topics WHERE published_at >= NOW() - INTERVAL '7 days' AND status = 'published'`
  - `sources_scanned`: `COUNT(*) FROM source_items WHERE ingested_at >= NOW() - INTERVAL '24 hours'`
  - `platforms_active`: `COUNT(DISTINCT platform) FROM sources WHERE is_active = true AND health_status = 'healthy'`
  - `last_updated`: `MAX(published_at) FROM topics WHERE status = 'published'`
- Returns JSON matching spec shape
- On rate limit: return `429`

**Dependencies:** A3
**Acceptance criteria:**
- Returns all 5 stat fields
- Response is cached for 60s (second request within window returns same data without DB hit)
- Rejects unauthenticated/bad-origin/rate-limited requests appropriately

---

## Phase B: Shared Utilities

Constants, types, and mapping functions used by multiple components.

### B1 — Extract `headingFont` to shared constant

**Files:**
- Create: `src/lib/constants.ts`
- Modify: All 19 files that define `headingFont` locally (see list below)

**What it does:**
Create a single export:
```ts
export const headingFont = "var(--font-heading), 'Instrument Serif', serif";
```

Then in each file that currently has `const headingFont = "var(--font-heading), 'Instrument Serif', serif";`, replace with:
```ts
import { headingFont } from "@/lib/constants";
```

**Files to update:** (grep found 19 files — update only the ones that define the constant locally; some may only reference it via CSS)
- `src/app/feed/page.tsx`
- `src/app/feed/topic-card.tsx`
- `src/app/feed/feed-greeting.tsx`
- `src/app/feed/trending-suggestions.tsx`
- `src/app/feed/since-last-visit.tsx`
- `src/app/feed/learning-debt.tsx`
- `src/app/page.tsx`
- `src/app/auth/login/page.tsx`
- `src/app/s/[slug]/page.tsx`
- `src/app/s/[slug]/search-loading.tsx`
- `src/app/s/[slug]/search-sidebar.tsx`
- `src/app/topic/[slug]/page.tsx`
- `src/app/knowledge/page.tsx`
- `src/app/knowledge/loading.tsx`
- `src/app/knowledge/level-bar.tsx`
- `src/app/knowledge/stats-bar.tsx`
- `src/app/inline-preview.tsx`
- `src/components/SiteNav.tsx`
- `src/components/learning-brief/LearningBrief.tsx`

**Note:** Some of these files (feed-greeting, trending-suggestions, since-last-visit) will be deleted in Phase E. Update them anyway so the build stays green during incremental development. If you prefer, skip those 3 files — they'll be removed before merge.

**Dependencies:** None
**Acceptance criteria:**
- `headingFont` is defined in exactly one place
- All files import from `@/lib/constants`
- No duplicate definitions remain
- Build passes with zero type errors

---

### B2 — Create category mapping utility

**Files:**
- Create: `src/lib/utils/category-mapper.ts`

**What it does:**
Exports a function `mapTopicToCategory(title: string, tags?: string[]): string` that:
1. Normalizes title + tags to lowercase
2. Matches against keyword lists from the spec:
   - `models`: claude, gpt, gemini, llama, model, release, benchmark
   - `tools`: cursor, code, ide, api, sdk, cli, framework
   - `research`: paper, arxiv, attention, training, architecture
   - `open-source`: open source, huggingface, ollama, weights, gguf
   - `industry`: regulation, funding, acquisition, startup, company
   - `ethics`: safety, alignment, bias, privacy, regulation
3. Returns the first matching category key (in priority order above)
4. Defaults to `"models"` if no match

Also exports the `CATEGORY_KEYWORDS` map for testing.

**Why separate from `category-colors.ts`:** Colors are a visual concern. Mapping is a data concern. Keeping them separate avoids circular dependencies when the mapper is used in API routes.

**Dependencies:** None
**Acceptance criteria:**
- `mapTopicToCategory("Claude Code Dispatch Multi-Agent")` returns `"models"`
- `mapTopicToCategory("Cursor IDE Gets MCP Support")` returns `"tools"`
- `mapTopicToCategory("unknown topic xyz")` returns `"models"` (default)
- Function handles empty strings and undefined tags gracefully

---

### B3 — Extend `TopicCardData` type with `category` and `is_new` fields

**Files:**
- Modify: `src/app/feed/topic-card.tsx` (current location of the type — will be moved in C4)

**What it does:**
Add two fields to the `TopicCardData` interface:
```ts
category: string;    // e.g. "models", "tools", "research"
is_new: boolean;     // true if published < 4h ago
```

The `primary_tag` field is kept for backward compatibility but will no longer drive category display — `category` will.

**Dependencies:** None (type-only change)
**Acceptance criteria:**
- Type updated with both fields
- Existing usages still compile (fields are added, not removed)

---

### B4 — Update category colors to match spec

**Files:**
- Modify: `src/lib/utils/category-colors.ts`

**What it does:**
The spec defines different colors than the current file for some categories. Update to match:

| Category | Current | Spec | Action |
|----------|---------|------|--------|
| Models | `#e8734a` (coral) | `#7C6AF7` (purple) | **Change** |
| Tools | `#7c6af7` (purple) | `#f59e0b` (amber) | **Change** |
| Research | `#3b82f6` (blue) | `#06b6d4` (cyan) | **Change** |
| Open Source | `#f59e0b` (amber) | `#4ade80` (green) | **Change** |
| Industry | `#10b981` (emerald) | `#e8734a` (coral) | **Change** |
| Ethics | `#ec4899` (pink) | `#f472b6` (pink) | **Change** |

**IMPORTANT DECISION REQUIRED:** The research report says "use CURRENT coral-era colors from category-colors.ts" but the spec section 4 defines different colors. The spec is the source of truth. **Update to spec colors.**

Update the `CATEGORY_COLORS` map and change `default` to `#7C6AF7` (models purple, since default category is now "models").

**Dependencies:** None
**Acceptance criteria:**
- All 6 category colors match spec section 4
- Default fallback is `#7C6AF7`
- `getCategoryColor("models")` returns `#7C6AF7`
- `getCategoryColor("tools")` returns `#f59e0b`

---

## Phase C: Core Components

The main visual building blocks. These can be built in parallel since they're leaf components.

### C1 — `FeedTopBar` component

**Files:**
- Create: `src/app/feed/feed-top-bar.tsx`

**What it does:**
Client component (`"use client"`) containing:
1. A compact search input (reuse existing search logic from `feed-search-bar.tsx` — the `handleSearch` function and router.push to `/s/[slug]`)
2. Stat pills fetched from `/api/feed/stats`:
   - "[N] today" — `topics_today`
   - "[N] sources" — `sources_scanned`
   - Animated count-up on mount using a simple `useEffect` + `requestAnimationFrame` counter (600ms duration)
3. Layout: search input takes remaining space, stat pills on the right. On mobile: search full-width, pills below in a 2-col row.

**Framer Motion:** Stat pills fade in with `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` after data loads.

**Dependencies:** A5 (stats endpoint), B1 (headingFont)
**Acceptance criteria:**
- Search input submits and navigates to `/s/[query-slug]`
- Stat pills show real numbers from API
- Count-up animation runs on mount
- Responsive: pills wrap below search on mobile
- Accessible: search input has label, pills have `aria-live="polite"`

---

### C2 — `FeaturedSection` component

**Files:**
- Create: `src/app/feed/featured-section.tsx`

**What it does:**
Client component with two sub-sections:
1. **FeaturedCard (left, 60% width):** The topic with `featured = true`. Larger card with category color top-border, Instrument Serif title at `--text-2xl`, full TL;DR (no clamp), "Read now" CTA link to `/topic/[slug]`. If `is_breaking`, show pulsing BREAKING badge.
2. **QuickList (right, 40% width):** Next 3 topics as compact rows — title (1-line clamp) + relative time + category dot. Clicking navigates to `/topic/[slug]`.

**Layout:** `grid grid-cols-[3fr_2fr] gap-4` on desktop. On mobile (`< md`), stacks vertically.

**Framer Motion:**
- FeaturedCard: `fadeInUp` (y:12 to 0, opacity 0 to 1, 300ms ease-out)
- QuickList items: `fadeInRight` (x:8 to 0, stagger 100ms)

**Dependencies:** B1, B3, B4
**Acceptance criteria:**
- Renders featured card with full TL;DR and CTA
- QuickList shows 3 items with category color dot
- Stacks on mobile
- Handles case where no featured topic exists (show nothing or first card as featured)

---

### C3 — `CategoryTabs` component

**Files:**
- Create: `src/app/feed/category-tabs.tsx`

**What it does:**
Client component with horizontal pill tabs:
- Tabs: `All`, `Models`, `Tools`, `Research`, `Open Source`, `Industry`, `Ethics`
- Active tab has category-colored background at 15% opacity + category-colored text
- Inactive tabs: `var(--ts-surface)` background, `var(--ts-text-2)` text
- State: `useState<string>("all")` — emits the active category via an `onCategoryChange(category: string)` callback prop
- On mobile: horizontal scroll with CSS `overflow-x: auto`, `scroll-snap-type: x mandatory`, fade edges using mask-image gradient

**No animations** on tab switch (instant, per spec).

**Dependencies:** B4
**Acceptance criteria:**
- Clicking a tab updates active state and calls `onCategoryChange`
- Active tab shows correct category color
- Horizontal scroll works on mobile without layout shift
- "All" tab is active by default
- Tabs are keyboard-navigable (arrow keys, enter/space to select)

---

### C4 — Redesigned `TopicCard` component

**Files:**
- Rewrite: `src/app/feed/topic-card.tsx`

**What it does:**
Complete rewrite of the topic card to match spec section 2.5:

```
┌─────────────────────────────────┐
│ MODELS                      2h  │  ← category label (colored, uppercase, xs) + relative time
│                                 │
│ Claude Code Dispatch            │  ← title (Instrument Serif, --text-xl)
│                                 │
│ Multi-agent orchestration       │  ← TL;DR (Inter, 0.85rem, --ts-text-2)
│ arrives. Run parallel...        │     2-line clamp
│                                 │
│ ⚡BREAKING    HN Reddit RSS     │  ← badges + platform tags
└─────────────────────────────────┘
```

**Changes from current card:**
- Remove: icon box (the 32x32 rounded-lg icon), reading time estimate, "Read" checkmark badge, category label derived from `primary_tag`
- Add: `category` label derived from `TopicCardData.category` field, `is_new` badge ("NEW" in green), platform tag pills (derive from `platform_count` — show generic "N sources" text since we don't have platform names in the card data)
- Keep: title, TL;DR (now 2-line clamp), BREAKING badge, TRENDING badge, relative time, link to `/topic/[slug]`
- Hover: `translateY(-2px)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.3)`, border shifts to category color (use `getCategoryColor(topic.category)`)
- Read state: `opacity: 0.55` (same as current)
- Top border: `border-top: 3px solid [categoryColor]` (was left border)

**Exports:**
- `TopicCard` — single card component
- `TopicCardData` interface (move here, keep as source of truth)

Remove `TopicCardList` — replaced by `TopicCardGrid` (C5).
Remove helper functions `getCategoryIcon`, `getCategoryLabel` — replaced by `category-mapper.ts` (B2).
Keep: `relativeTime`, `decodeHtml` helpers (move to a shared util if desired, but not required).

**Dependencies:** B1, B3, B4
**Acceptance criteria:**
- Card matches spec wireframe layout
- Category label is uppercase, colored, positioned top-left
- Relative time is top-right
- TL;DR is 2-line clamped
- Badges render correctly: BREAKING (red pulse), TRENDING (accent), NEW (green)
- Hover animation works (lift + shadow + border color)
- Read topics render at 55% opacity
- Links to `/topic/[slug]`

---

### C5 — `TopicCardGrid` component

**Files:**
- Create: `src/app/feed/topic-card-grid.tsx`

**What it does:**
Client component that:
1. Receives `topics: TopicCardData[]` and `activeCategory: string` props
2. Filters topics by `activeCategory` (if not "all")
3. Renders a 2-column grid (`grid-cols-1 md:grid-cols-2 gap-4`)
4. Each card gets staggered `fadeInUp` animation via Framer Motion:
   - `initial={{ opacity: 0, y: 12 }}`
   - `animate={{ opacity: 1, y: 0 }}`
   - `transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}`
5. Uses `AnimatePresence` so cards animate out/in when category filter changes
6. Shows empty state if no topics match the selected category: "No [Category] topics this week."

**Dependencies:** C4 (TopicCard)
**Acceptance criteria:**
- 2-col grid on desktop, 1-col on mobile
- Filtering by category works correctly
- Staggered animation on initial load
- AnimatePresence handles category switch transitions
- Empty state renders when no topics match filter

---

## Phase D: Supporting Components

Evergreen strip, toast notification, auto-refresh logic.

### D1 — `EvergreenStrip` component

**Files:**
- Create: `src/app/feed/evergreen-strip.tsx`

**What it does:**
Client component displaying a horizontal scroll strip of evergreen topic cards:
1. Section heading: "Learn the Fundamentals" (Instrument Serif)
2. Horizontal scroll container: `overflow-x: auto`, `scroll-snap-type: x mandatory`, `-webkit-overflow-scrolling: touch`
3. Each evergreen card: compact pill/chip shape with:
   - Small icon (from a predefined map: RAG = BookOpen, Agents = Bot, etc. — use lucide-react icons)
   - Title (1-line, Inter, sm)
   - Subtitle (1-line, Inter, xs, muted)
   - Links to `/topic/[slug]`
4. Fade edges on desktop using CSS `mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)`

**Framer Motion:** `fadeIn` (opacity 0 to 1, 400ms, delayed 400ms after cards).

**Props:** `topics: { id: string; slug: string; title: string; subtitle: string }[]`

The parent page will pass evergreen topics from the feed query (those with `is_evergreen = true`).

**Dependencies:** B1
**Acceptance criteria:**
- Horizontal scroll works on both desktop and mobile
- Cards snap to edges on scroll
- Fade edges visible on desktop
- Each card links to its topic page
- Section only renders if evergreen topics exist

---

### D2 — `NewTopicToast` component

**Files:**
- Create: `src/app/feed/new-topic-toast.tsx`

**What it does:**
Client component — a floating toast notification:
1. Props: `count: number`, `onRefresh: () => void`, `onDismiss: () => void`
2. Renders: "N new topics available" text + "Refresh" button + close (X) button
3. Position: fixed, top-center, z-50, below nav (~top-20)
4. Styling: `var(--ts-surface)` background, `var(--border)` border, accent-colored "Refresh" text

**Framer Motion:** `slideDown` — `initial={{ y: -40, opacity: 0 }}`, `animate={{ y: 0, opacity: 1 }}`, spring transition.

**AnimatePresence:** Wraps the toast so it animates out on dismiss.

**Dependencies:** None
**Acceptance criteria:**
- Toast appears with slide-down animation
- "Refresh" button calls `onRefresh`
- Close button calls `onDismiss`
- Toast disappears with animation when dismissed
- Accessible: `role="status"`, `aria-live="polite"`

---

### D3 — `FeedAutoRefresh` component

**Files:**
- Create: `src/app/feed/feed-auto-refresh.tsx`

**What it does:**
Invisible client component that:
1. Props: `lastPublishedAt: string | null`, `onNewTopics: (count: number) => void`
2. Polls `GET /api/feed/check-new?since={lastPublishedAt}` every 5 minutes using `setInterval`
3. Uses Page Visibility API (`document.visibilitychange`) to pause/resume polling when tab is hidden/visible
4. On response with `new_count > 0`, calls `onNewTopics(count)`
5. Cleans up interval on unmount
6. Does NOT render any DOM (returns `null`)

**Error handling:** Silently swallow fetch errors (network issues shouldn't break the feed). Log to console in dev mode only.

**Dependencies:** A4 (check-new endpoint)
**Acceptance criteria:**
- Polls every 5 minutes
- Pauses when tab is not visible
- Resumes when tab becomes visible
- Calls callback with correct count
- Cleans up on unmount (no memory leaks)
- Does not crash on network errors

---

## Phase E: Page Assembly

Rewrite the feed page, update the loading skeleton, remove deprecated components.

### E1 — Rewrite `page.tsx`

**Files:**
- Rewrite: `src/app/feed/page.tsx`

**What it does:**
Major rewrite of the feed page. Structure (top to bottom):

1. **Server-side data fetching:**
   - Auth check + profile check (keep existing)
   - Call `get_user_feed_v2` RPC instead of `get_user_feed`
   - Fetch topics + content in parallel (keep existing pattern)
   - Map topics through `mapTopicToCategory()` to add `category` field
   - Separate featured topic, regular topics, and evergreen topics
   - Update `last_seen_at` (keep existing)
   - Remove `get_since_last_visit` call
   - Remove `isQuietDay` logic

2. **Client wrapper component (`FeedClient`):**
   Create an inner client component (in the same file or a separate `feed-client.tsx`) that receives the server-fetched data and manages client state:
   - `activeCategory` state for `CategoryTabs`
   - `newTopicCount` state for toast visibility
   - `handleRefresh` that calls `router.refresh()` and resets toast
   - Wires up `FeedAutoRefresh` + `NewTopicToast`

3. **Layout (matches spec 2.1):**
   ```
   SiteNav (unchanged)
   FeedTopBar
   FeaturedSection (featured topic + quick list)
   CategoryTabs
   TopicCardGrid (filtered by active category)
   EvergreenStrip (if evergreen topics exist)
   LearningDebt (Pro only, below grid — keep existing component)
   Footer (unchanged)
   ```

4. **Remove:**
   - `FeedSearchBar` import (replaced by `FeedTopBar`)
   - `FeedGreeting` import
   - `TrendingSuggestions`, `QuickSuggestions`, `QuietDayState` imports
   - `SinceLastVisit` import
   - Old `TopicCardList` import
   - Sidebar (xl aside) — absorbed into `FeedTopBar` stats and `CategoryTabs`
   - Empty state gradient div — evergreen + 7-day window prevents empty state

5. **Keep:**
   - Background glow div
   - Background gradient div
   - Footer
   - `LearningDebt` component (moved below grid)

**Dependencies:** A2, A4, A5, B1, B2, B3, C1, C2, C3, C5, D1, D2, D3
**Acceptance criteria:**
- Page renders the new layout matching spec section 2.1
- Feed shows topics from last 7 days (not just today)
- Featured section shows highest-scored topic
- Category tabs filter the grid
- Auto-refresh polls and shows toast when new topics exist
- Evergreen strip renders at bottom
- Mobile layout stacks correctly
- No references to removed components
- Build passes with zero errors

---

### E2 — Update `loading.tsx` skeleton

**Files:**
- Rewrite: `src/app/feed/loading.tsx`

**What it does:**
Update the loading skeleton to match the new page layout:

1. **TopBar skeleton:** Full-width bar with search input placeholder + 2 small pill placeholders on the right
2. **FeaturedSection skeleton:** 60/40 grid — large card placeholder (left) + 3 compact row placeholders (right)
3. **CategoryTabs skeleton:** Row of 7 small pill placeholders
4. **TopicCardGrid skeleton:** 2x2 grid of card placeholders (same staggered delay as current)
5. **EvergreenStrip skeleton:** Horizontal row of 4 small pill placeholders

Use same styling pattern as current skeleton (`rgba(240,240,240,0.04)`, `animate-pulse`).

**Dependencies:** None (can be done anytime, but logically part of E)
**Acceptance criteria:**
- Skeleton matches the new page structure
- Staggered pulse animation per card
- Responsive: matches layout at all breakpoints

---

### E3 — Delete deprecated feed components

**Files:**
- Delete: `src/app/feed/feed-greeting.tsx`
- Delete: `src/app/feed/feed-search-bar.tsx`
- Delete: `src/app/feed/trending-suggestions.tsx`
- Delete: `src/app/feed/since-last-visit.tsx`

**What it does:**
Remove the 4 components that are no longer imported by `page.tsx`:
- `FeedGreeting` — replaced by FeaturedSection
- `FeedSearchBar` — replaced by FeedTopBar
- `TrendingSuggestions` / `QuickSuggestions` / `QuietDayState` — empty states handled by evergreen + 7-day window
- `SinceLastVisit` — "new" badges on cards replace this section

**Dependencies:** E1 (page must be rewritten first so no imports remain)
**Acceptance criteria:**
- Files deleted
- No broken imports anywhere in codebase
- Build passes

---

## Phase F: Seed Data

### F1 — Evergreen content definitions

**Files:**
- Create: `src/lib/content/evergreen.ts`

**What it does:**
Exports the list of ~15 evergreen topics with their metadata:
```ts
export interface EvergreenTopic {
  slug: string;
  title: string;
  subtitle: string;      // short description for EvergreenStrip cards
  tldr: string;           // TL;DR for topic_content
  what_happened: string;
  so_what: string;
  now_what: string;
}

export const EVERGREEN_TOPICS: EvergreenTopic[] = [
  { slug: "what-is-rag", title: "What is RAG?", subtitle: "Retrieval-Augmented Generation", ... },
  // ... all 15 from spec
];
```

Content should be concise, factual, beginner-friendly. Each entry needs all content fields filled in since the seed script will insert them into `topic_content`.

**Dependencies:** None
**Acceptance criteria:**
- All 15 topics from spec section 1.3 are defined
- Each has slug, title, subtitle, tldr, what_happened, so_what, now_what
- Slugs are URL-safe (lowercase, hyphens)

---

### F2 — Evergreen seed script

**Files:**
- Create: `scripts/seed-evergreen.ts`

**What it does:**
A Node.js script (run with `npx tsx scripts/seed-evergreen.ts`) that:
1. Imports `EVERGREEN_TOPICS` from `@/lib/content/evergreen`
2. Connects to Supabase using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars
3. For each evergreen topic:
   a. Upserts into `topics` table: `slug`, `title`, `status = 'published'`, `is_evergreen = true`, `published_at = now()`, `trending_score = 10` (low, so they never outrank real topics)
   b. Upserts into `topic_content` table with `role = 'general'`: all content fields
4. Logs progress: `[1/15] Seeded: What is RAG?`
5. Handles errors gracefully (logs and continues)

**Idempotent:** Uses `ON CONFLICT (slug) DO UPDATE` for topics and `ON CONFLICT (topic_id, role) DO UPDATE` for content. Safe to run multiple times.

**Dependencies:** A1 (is_evergreen column), F1 (content definitions)
**Acceptance criteria:**
- Script runs without errors
- All 15 topics created in DB with `is_evergreen = true`
- All 15 have `topic_content` rows with `role = 'general'`
- Running twice does not create duplicates
- Script exits cleanly

---

## Dependency Graph

```
A1 ──→ A2 ──→ E1
A3 ──→ A4 ──→ D3 ──→ E1
A3 ──→ A5 ──→ C1 ──→ E1

B1 ──→ C1, C2, C4, D1 ──→ E1
B2 ──→ E1
B3 ──→ C2, C4 ──→ C5 ──→ E1
B4 ──→ C2, C3, C4 ──→ E1

D2 ──→ E1
E1 ──→ E3

A1 ──→ F2
F1 ──→ F2

E2 (independent — can be done anytime)
```

**Parallelization opportunities:**
- A1, A3, B1, B2, B3, B4 can all start in parallel
- C1, C2, C3, C4, D1, D2 can be built in parallel once their B-phase deps are done
- D3 needs A4
- C5 needs C4
- E1 is the integration point — needs everything above
- F1 can start anytime; F2 needs A1 + F1

---

## Testing Checklist (not a phase — manual QA after E1)

- [ ] Feed loads with topics from last 7 days
- [ ] Featured section shows highest-scored topic
- [ ] Category tabs filter the grid correctly
- [ ] "All" tab shows all topics
- [ ] Evergreen strip appears at bottom
- [ ] Auto-refresh toast appears after 5 minutes (test with shorter interval)
- [ ] Toast refresh button reloads feed data
- [ ] Loading skeleton matches new layout
- [ ] Mobile layout: all sections stack vertically
- [ ] Mobile: category tabs scroll horizontally
- [ ] Mobile: evergreen strip scrolls horizontally
- [ ] Stats pills show correct numbers
- [ ] Count-up animation runs on stat pills
- [ ] Card hover animation works (lift + shadow + border)
- [ ] BREAKING badge pulses
- [ ] NEW badge shows on recent topics
- [ ] Read topics render at 55% opacity
- [ ] Empty DB: evergreen topics fill the feed
- [ ] Rate limiting: `/api/feed/check-new` returns 429 after 15 requests/min
- [ ] Rate limiting: `/api/feed/stats` returns 429 after 10 requests/min
- [ ] Unauthenticated request to both endpoints returns 401
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Lighthouse accessibility score >= 90
