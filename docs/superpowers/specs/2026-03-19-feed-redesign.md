# Feed Redesign Spec — Option C: Hybrid Dashboard

**Date:** 2026-03-19
**Status:** Draft
**Scope:** Full visual overhaul of `/feed`, data layer fixes, evergreen content, auto-refresh

---

## Problem

The feed feels empty. Root causes:
1. Feed query only pulls today's topics — empty DB = empty page
2. No fallback content when the pipeline hasn't run
3. Layout lacks visual density and interactivity
4. Content feels static — no live/refreshing feel

## Solution

Three-layer fix: data layer (7-day window + evergreen), visual overhaul (Option C hybrid dashboard), and live feel (auto-refresh polling).

---

## 1. Data Layer Changes

### 1.1 Feed Query — 7-Day Window

**Current:** `get_user_feed` RPC filters by `p_date` (today only).
**Change:** New RPC `get_user_feed_v2` that:
- Returns topics published in the **last 7 days**, ordered by `published_at DESC`
- Caps at 20 topics per request
- Still filters by user role for content
- Returns a `featured` flag on the highest-scoring topic (for the hero card)
- Returns `is_new` flag for topics published in the last 4 hours

**Fallback:** If < 3 topics in 7-day window, pad with evergreen topics.

### 1.2 Feed Stats Endpoint

New API route: `GET /api/feed/stats`
Returns:
```json
{
  "topics_today": 12,
  "topics_this_week": 47,
  "sources_scanned": 147,
  "platforms_active": 6,
  "last_updated": "2026-03-19T14:30:00Z"
}
```
Computed from `source_items` count (last 24h), `topics` count, and `sources` health.

### 1.3 Evergreen Seed Content

A set of ~15 permanent topics that are always available:
- What is RAG?
- AI Agents 101
- Fine-tuning LLMs
- What is MCP?
- Vector Databases Explained
- AI Safety Basics
- Prompt Engineering
- How LLMs Work
- Embeddings Explained
- Transformer Architecture
- Open Source vs Closed Models
- AI in Production
- Cost of Running LLMs
- Multimodal AI
- Agentic Workflows

**Implementation:** Seed script that creates these as `topic_content` rows with `role=general` and a special `status=evergreen` on the topic. The feed query includes evergreen topics in the "Learn the Fundamentals" section — always present, never empty.

### 1.4 Auto-Refresh Polling

Client-side polling every **5 minutes** on the feed page:
- `GET /api/feed/check-new?since={last_topic_published_at}`
- Returns `{ new_count: N }` — number of new topics since timestamp
- If `new_count > 0`, show a toast: "N new topics available" with a refresh button
- Clicking refresh fetches new data without full page reload (React state update)
- Polling pauses when tab is not visible (Page Visibility API)

---

## 2. Visual Overhaul — Option C Layout

### 2.1 Page Structure (top to bottom)

```
┌─────────────────────────────────────────────┐
│  SiteNav (existing, no changes)             │
├─────────────────────────────────────────────┤
│  TopBar: [Search ─────────] [12 today] [147]│
├──────────────────────┬──────────────────────┤
│  FeaturedCard        │  QuickList (3 items) │
│  (highest score)     │  TRENDING / NEW / HOT│
├──────────────────────┴──────────────────────┤
│  CategoryTabs: All | Models | Tools | ...   │
├─────────────────────────────────────────────┤
│  TopicCardGrid (2-col, filtered by tab)     │
│  ┌──────────┐ ┌──────────┐                  │
│  │  Card 1  │ │  Card 2  │                  │
│  └──────────┘ └──────────┘                  │
│  ┌──────────┐ ┌──────────┐                  │
│  │  Card 3  │ │  Card 4  │                  │
│  └──────────┘ └──────────┘                  │
├─────────────────────────────────────────────┤
│  EvergreenStrip: horizontal scroll cards    │
│  [RAG] [Agents] [Fine-tuning] [MCP] [...]  │
└─────────────────────────────────────────────┘
```

### 2.2 Components (new or rewritten)

| Component | File | Description |
|-----------|------|-------------|
| `FeedTopBar` | `feed/feed-top-bar.tsx` | Compact search + stat pills. Client component. |
| `FeaturedSection` | `feed/featured-section.tsx` | Featured card (left) + quick list (right). 60/40 split on desktop, stacked on mobile. |
| `CategoryTabs` | `feed/category-tabs.tsx` | Horizontal pill tabs. Client state for active filter. Categories: All, Models, Tools, Research, Open Source, Industry, Ethics. |
| `TopicCardGrid` | `feed/topic-card-grid.tsx` | 2-col grid (1-col mobile). Receives filtered topics. Staggered fade-in animation. |
| `TopicCard` | `feed/topic-card.tsx` | Redesigned card: category color + label, title (serif), TL;DR (2-line clamp), badges (Breaking/Trending/New), platform tags, relative time. Hover: border glow + lift. |
| `EvergreenStrip` | `feed/evergreen-strip.tsx` | Horizontal scroll of evergreen topic cards. Always visible. Icon + title + subtitle. |
| `NewTopicToast` | `feed/new-topic-toast.tsx` | "N new topics" floating toast with refresh button. Slides in from top. |
| `FeedAutoRefresh` | `feed/feed-auto-refresh.tsx` | Invisible client component that polls `/api/feed/check-new` every 5 min. |

### 2.3 Existing Components — Disposition

| Component | Action |
|-----------|--------|
| `feed-search-bar.tsx` | **Replace** with `FeedTopBar` (search is now compact, inline with stats) |
| `feed-greeting.tsx` | **Remove** — replaced by FeaturedSection. No more "Good morning" — the content IS the greeting. |
| `trending-suggestions.tsx` | **Remove** — empty states now handled by evergreen + 7-day window |
| `topic-card.tsx` (old) | **Replace** with new `TopicCard` + `TopicCardGrid` |
| `since-last-visit.tsx` | **Remove** — "new since last visit" is now indicated by `is_new` badges on cards |
| `learning-debt.tsx` | **Keep** but move into sidebar or below grid as a subtle section |

### 2.4 Mobile Layout

- TopBar: search full-width, stat pills below (2-col)
- FeaturedSection: stacks vertically (featured card → quick list)
- CategoryTabs: horizontal scroll with fade edges
- TopicCardGrid: 1 column
- EvergreenStrip: horizontal scroll (same as desktop)
- MobileTabBar: unchanged (bottom nav)

### 2.5 Card Design

```
┌─────────────────────────────┐
│ MODELS                  2h  │  ← category (colored) + relative time
│                             │
│ Claude Code Dispatch        │  ← title (Instrument Serif, 1rem)
│                             │
│ Multi-agent orchestration   │  ← TL;DR (Inter, 0.85rem, #8a8a8e)
│ arrives. Run parallel...    │     2-line clamp
│                             │
│ ⚡BREAKING    HN Reddit RSS │  ← badges + platform tags
└─────────────────────────────┘
```

Hover: `translateY(-2px)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.3)`, border shifts to category color.

---

## 3. Animations

| Element | Animation | Timing |
|---------|-----------|--------|
| TopicCards (on load) | fadeInUp (y:12→0, opacity:0→1) | stagger 50ms per card |
| FeaturedCard | fadeInUp | 300ms, ease-out |
| QuickList items | fadeInRight (x:8→0) | stagger 100ms |
| CategoryTabs | none (instant) | — |
| EvergreenStrip | fadeIn | 400ms after cards |
| NewTopicToast | slideDown (y:-40→0) | 300ms spring |
| Card hover | translateY + shadow | 200ms ease |
| Stat numbers | countUp animation | 600ms on mount |

---

## 4. Category System

Map topic titles/tags to categories using keyword matching:

| Category | Keywords | Color |
|----------|----------|-------|
| Models | claude, gpt, gemini, llama, model, release, benchmark | #7C6AF7 |
| Tools | cursor, code, ide, api, sdk, cli, framework | #f59e0b |
| Research | paper, arxiv, attention, training, architecture | #06b6d4 |
| Open Source | open source, huggingface, ollama, weights, gguf | #4ade80 |
| Industry | regulation, funding, acquisition, startup, company | #e8734a |
| Ethics | safety, alignment, bias, privacy, regulation | #f472b6 |

Default to "Models" if no match.

---

## 5. Files Changed

### New files:
- `src/app/feed/feed-top-bar.tsx`
- `src/app/feed/featured-section.tsx`
- `src/app/feed/category-tabs.tsx`
- `src/app/feed/topic-card-grid.tsx`
- `src/app/feed/topic-card.tsx` (rewrite)
- `src/app/feed/evergreen-strip.tsx`
- `src/app/feed/new-topic-toast.tsx`
- `src/app/feed/feed-auto-refresh.tsx`
- `src/app/api/feed/stats/route.ts`
- `src/app/api/feed/check-new/route.ts`
- `src/lib/content/evergreen.ts` (seed data + types)
- `scripts/seed-evergreen.ts` (run once to populate DB)

### Modified files:
- `src/app/feed/page.tsx` (major rewrite — new layout)
- `supabase/schema-v2.sql` (add `get_user_feed_v2` RPC, evergreen status)

### Removed files:
- `src/app/feed/feed-greeting.tsx`
- `src/app/feed/trending-suggestions.tsx`
- `src/app/feed/since-last-visit.tsx`

---

## 6. Non-Goals

- No changes to `/topic/[slug]` or `/s/[slug]` pages (separate effort)
- No changes to the ingestion pipeline frequency (needs Vercel Pro or external cron)
- No changes to auth flow or pricing
- No SSR streaming changes — feed is already a server component with client children
