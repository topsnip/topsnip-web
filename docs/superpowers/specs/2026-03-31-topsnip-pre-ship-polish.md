---
title: TopSnip Pre-Ship Polish — Content, Presentation & UX Overhaul
created: 2026-03-31
status: draft
type: spec
depends-on: "[[product-spec-v1]]"
---

# TopSnip Pre-Ship Polish Spec

> "It shouldn't be just another blog or newsletter. Someone comes, reads a bit, understands it, learns it, and goes away."

---

## Problem Statement

TopSnip currently looks and feels like a basic 2018 HTML/CSS site with AI-generated summaries. The content is interchangeable with a free newsletter. The UI has no visual distinction. There's no reason for someone to stay on TopSnip instead of reading TLDR AI, asking ChatGPT, or visiting the official source.

**Three things must be true before we ship:**
1. The content *teaches* — it doesn't just summarize
2. The presentation makes learning feel fast and satisfying, not like reading a wall of text
3. The UI/UX feels like a premium 2026 product that you want to come back to

---

## Pillar 1: Content Quality — Prompt Rewrite

### Current State
- Prompts in `src/lib/content/prompts.ts` produce decent journalistic summaries
- Voice instructions exist (smart, direct, slightly dry) but output still reads generic
- Role variants change tone but don't change *structure* enough

### Target State
Content that makes you say "oh, that's what that means" — not "I could have read this anywhere."

### Changes

#### 1.1 — New JSON output schema (all roles)

Current schema produces 4 flat text blocks. New schema adds structured teaching elements:

```json
{
  "tldr": "2-3 sentences. The hook. Why should I care?",
  "key_takeaways": [
    {
      "label": "What changed",
      "text": "One sentence — the factual delta"
    },
    {
      "label": "Why it matters",
      "text": "One sentence — the implication"
    },
    {
      "label": "What to watch",
      "text": "One sentence — the open question"
    }
  ],
  "what_happened": "...(existing, but with improved formatting instructions)",
  "so_what": "...(Pro only — role-specific)",
  "now_what": "...(Pro only — role-specific action items)",
  "reading_time_seconds": 120,
  "complexity": "beginner | intermediate | advanced",
  "sources": [...]
}
```

The `key_takeaways` array is the "insight cards" — scannable, visual, always visible (even to free users). They're the bridge between TL;DR and the full brief.

#### 1.2 — Prompt voice improvements

Add to SYSTEM_BASE:
- **Teaching frame:** "You're not writing a news article. You're explaining this to someone who came here specifically to understand it. They have 3 minutes. Make every sentence count."
- **Curiosity hooks:** "The TL;DR should make the reader want to keep reading. Frame it as a question answered, a surprising fact revealed, or a change that affects them directly."
- **Concrete over abstract:** "Instead of 'this could impact many businesses,' say 'if you run a SaaS app that uses OpenAI, your API bill just dropped 40%.'"
- **Anti-slop rules:** Expand the NEVER list to catch more AI-isms. Add: "Don't start any section with a transition from the previous section. Each section stands alone."

#### 1.3 — Key takeaways prompt

New instruction block added to the user prompt:

```
The "key_takeaways" array must contain exactly 3 items:
1. "What changed" — the factual news in one sentence
2. "Why it matters" — the implication for the reader in one sentence
3. "What to watch" — the open question or next development in one sentence

These are displayed as visual cards. Each must be under 25 words.
Be specific. Not "AI is getting better" but "Claude 4 now handles 1M-token
contexts — that's an entire codebase in one prompt."
```

#### 1.4 — Reading time + complexity

The prompt calculates `reading_time_seconds` based on word count (~200 words/minute). The `complexity` field helps with future personalization and UI badges.

### Files Modified
- `src/lib/content/prompts.ts` — All system/user prompts
- `src/lib/content/types.ts` — Add key_takeaways, reading_time_seconds, complexity to content types
- `src/lib/content/generator.ts` — Parse new JSON fields
- `src/lib/content/formats/*.ts` — Update format-specific schemas to include key_takeaways
- `src/app/api/search/route.ts` — Parse new fields from on-demand generation

### Validation
- Generate 5 topics with new prompts
- Compare side-by-side with old output
- Key takeaways must be specific (no vague statements)
- Reading time must be accurate (±30 seconds)

---

## Pillar 2: Content Presentation — Learning Brief Redesign

### Current State
- 4 identical-looking grey/surface-colored cards stacked vertically
- No visual hierarchy — TL;DR looks the same as Sources
- No progressive disclosure — everything dumps on the page at once
- No completion/progress interaction

### Target State
A layered reading experience: scan → hook → learn → confirm.

### Changes

#### 2.1 — Hero TL;DR with key takeaway cards

**Top of brief:** TL;DR rendered prominently (already has coral accent border — keep).

**Below TL;DR:** 3 key takeaway cards in a horizontal row (stack on mobile):
- Each card: small label (muted), bold text (white), subtle left border color
- Card 1: coral border — "What changed"
- Card 2: blue border — "Why it matters"
- Card 3: amber border — "What to watch"
- Cards are always visible (free + Pro) — they're the hook

#### 2.2 — Reading time + complexity badge

**Above TL;DR:** Small badge row:
- `⏱ 2 min read` — from reading_time_seconds
- `Beginner` / `Intermediate` / `Advanced` pill — from complexity
- Source count: `12 sources`

Sets expectation immediately. User knows the time commitment before reading.

#### 2.3 — Progressive disclosure for What Happened

Instead of dumping 3-5 paragraphs:
- Show first paragraph fully visible
- Remainder collapsed behind a "Keep reading" button
- Expand animates smoothly (already have CollapsibleContent — reuse)
- Collapsed state shows a 2-line fade gradient

#### 2.4 — Pro sections visual distinction

So What and Now What (Pro only) get distinct visual treatment:
- **So What:** Coral-tinted card with "PRO" badge in corner
- **Now What:** Checklist format (already exists via NowWhatChecklist)
- **Pro gate:** When isPro=false, show the ProUpgradeGate (already implemented this session)

#### 2.5 — "I got it" completion interaction

After Sources section, add a completion bar:
- Button: "✓ I understand this topic"
- On click: confetti-free celebration — the button transforms to "✓ Understood" with a subtle glow + the brief collapses to just TL;DR + takeaway cards
- Awards XP (existing system) + marks topic as read
- This gives the user a sense of *completion* — they learned something, not just read something

#### 2.6 — Visual hierarchy overhaul

Current: all sections use the same `var(--ts-surface)` background with `var(--border)`.

New hierarchy:
| Section | Background | Border | Treatment |
|---------|-----------|--------|-----------|
| TL;DR | `rgba(232,115,74,0.04)` | coral left | Bold text, larger font (keep current) |
| Key Takeaways | transparent | colored left per card | Horizontal card row |
| What Happened | `var(--ts-surface)` | subtle | Standard card, progressive disclosure |
| So What (Pro) | `var(--ts-accent-6)` | coral left + PRO badge | Distinct accent tint |
| Now What (Pro) | `var(--ts-surface)` | none | Checklist format |
| Sources | transparent | none | Compact pill layout (keep current) |
| Completion | transparent | none | Single centered button |

### Files Modified
- `src/components/learning-brief/LearningBrief.tsx` — Major refactor of LegacyBrief
- `src/components/learning-brief/KeyTakeawayCards.tsx` — New component
- `src/components/learning-brief/ReadingMeta.tsx` — New component (time + complexity)
- `src/components/learning-brief/CompletionBar.tsx` — New component
- `src/components/learning-brief/formats/*.tsx` — Update v2 renderers with same patterns

### Validation
- Render a topic with new layout — screenshot compare old vs new
- Mobile responsive: cards stack, progressive disclosure works on touch
- Completion interaction triggers XP award

---

## Pillar 3: UI/UX Overhaul

### Current State (from UX Audit)
- Nav inconsistency across auth states (Critical — Issue #1)
- Search results page has bespoke nav (Critical — Issue #2)
- No loading skeletons on several pages (High — Issue #5)
- Mobile nav truncation is unreadable (High — Issue #7)
- About page is a markdown dump (Medium — Issue #9)
- No footer on most authenticated pages (Medium — Issue #10)
- Feed is empty on first visit after onboarding (Critical gap)

### Target State
Consistent, polished, premium-feeling UI. "Perplexity meets Every.to" — dark editorial aesthetic.

### Changes

#### 3.1 — Unified SiteNav across all pages

Replace the 3+ different navs with the single `SiteNav` component everywhere. It already handles auth states and the brand guide styling. Pages that hardcode their own nav: Landing, About, Upgrade, Search results.

#### 3.2 — Feed first-visit experience

When a user completes onboarding and has an empty feed:
- Show 3-5 evergreen "Start here" topic cards (already have evergreen content system)
- Welcome message: "Here's what matters today" (or "Start with these fundamentals" if nothing is trending)
- Remove the empty dead-end state

#### 3.3 — Loading skeletons

Add skeleton loaders to: History, Settings, Knowledge, Feed (while checking for new topics). Use consistent skeleton pattern — pulsing bars matching the card layout they'll replace.

#### 3.4 — Mobile nav fix

Replace 5-item truncated text nav with icon-only bottom bar on mobile:
- Feed (grid icon), Search (search icon), Knowledge (book icon), Settings (gear icon)
- Active state: coral accent
- 4 items max on mobile

#### 3.5 — Footer on all pages

Add shared footer to authenticated layout. Links: About, Privacy, Terms, topsnip.co. Minimal, one line.

#### 3.6 — Typography and spacing pass

Ensure Instrument Serif is used for all section headings (currently mixed). Verify line-height, letter-spacing, and font-weight match brand guide across all pages.

#### 3.7 — Deprecated code removal

- Remove references to old FastAPI transcript service
- Clean up unused imports and dead code paths
- Remove feature flags that are now permanently on

### Files Modified
- `src/components/SiteNav.tsx` — Ensure it handles all page contexts
- `src/app/about/page.tsx` — Replace hardcoded nav with SiteNav
- `src/app/upgrade/page.tsx` — Same
- `src/app/page.tsx` — Same (landing)
- `src/app/s/[slug]/page.tsx` — Same (search results)
- `src/app/feed/page.tsx` — First-visit experience
- `src/app/history/page.tsx` — Add skeleton
- `src/app/settings/page.tsx` — Add skeleton
- `src/app/knowledge/page.tsx` — Add skeleton
- `src/components/MobileNav.tsx` — New component (icon bottom bar)
- `src/components/Footer.tsx` — New shared footer
- Various pages — Add footer to layout

### Validation
- Navigate all pages logged in and logged out — consistent nav
- First-time user flow: onboarding → feed shows evergreen content
- Mobile: nav is readable, bottom bar works
- Lighthouse: aim for 90+ performance, 90+ accessibility

---

## Execution Order

These pillars have dependencies:

1. **Pillar 1 (Content Quality)** — First, because the new JSON schema with key_takeaways must exist before Pillar 2 can render them
2. **Pillar 2 (Content Presentation)** — Second, redesign the brief components to use the new schema
3. **Pillar 3 (UI/UX)** — Third, polish everything else (nav, loading, mobile, footer, cleanup)

Each pillar is independently shippable — if we finish Pillar 1, content is already better even with old UI.

---

## Out of Scope (for this spec)

- Visual content (screenshots, diagrams, annotated walkthroughs) — v1.1
- Email digest redesign — post-ship
- Light mode — never (brand is dark-first)
- Team tier — post-PMF
- Complete landing page redesign — the current one is functional enough; focus on the product pages

---

## Success Criteria

Before shipping, we should be able to:
1. Open a topic brief and *learn something in under 3 minutes* — not just read a summary
2. Show the site to someone and have them say "this looks professional" not "this looks like a side project"
3. A free user should get enough value to come back; the Pro gate should feel like a natural "want more?" not a paywall slap
