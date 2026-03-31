<p align="center">
  <img src="public/logo.svg" alt="topsnip" height="40" />
</p>

<p align="center">
  <strong>Come learn something. Leave knowing it.</strong>
</p>

<p align="center">
  <a href="https://topsnip.co">topsnip.co</a> &nbsp;·&nbsp;
  <a href="#how-it-works">How It Works</a> &nbsp;·&nbsp;
  <a href="#tech-stack">Tech Stack</a> &nbsp;·&nbsp;
  <a href="#self-hosting">Self-Hosting</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Claude_Haiku-4.5-7C6AF7?logo=anthropic" alt="Claude Haiku 4.5" />
  <img src="https://img.shields.io/badge/Supabase-Auth_+_DB-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe" alt="Stripe" />
  <img src="https://img.shields.io/badge/Playwright-E2E_Tests-2EAD33?logo=playwright" alt="Playwright" />
</p>

---

## What is topsnip?

TopSnip is an **AI Learning Intelligence Platform**. We monitor 7+ sources — YouTube, Hacker News, Reddit, arXiv, GitHub, official blogs, and more — then use Claude to synthesize everything into clear, structured learning briefs: TL;DR, key points, role-specific insights, and source links.

**5 topics. 3 minutes. Now you know.**

No tabs. No noise. No scrolling through 10 articles. Just the signal — personalized to your role.

---

## How It Works

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  You search  │ ──▶ │  7+ platforms     │ ──▶ │  Claude reads &   │ ──▶ │  Structured      │
│  a topic     │     │  scanned (YT, HN, │     │  cross-references │     │  learning brief  │
│              │     │  arXiv, Reddit…)  │     │  all sources      │     │  personalized    │
└──────────────┘     └──────────────────┘     └───────────────────┘     └──────────────────┘
```

1. **Search** — Type any AI topic into the search bar
2. **We scan everything** — YouTube, Hacker News, Reddit, arXiv, GitHub, official blogs
3. **AI distills it** — Claude reads, cross-references, and synthesizes into a clear explainer
4. **You get it your way** — TL;DR, key points, role-specific insights, and source links

Results are cached for 48 hours so repeat searches are instant.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend + API** | Next.js 16 (App Router) | Server components, API routes, proxy middleware |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Dark-first design system, custom brand tokens |
| **Transcript Service** | FastAPI on Railway | YouTube transcript extraction, auth-protected |
| **Database + Auth** | Supabase (Postgres) | User profiles, search cache, search history, RLS |
| **LLM** | Claude Haiku 4.5 (Anthropic API) | Multi-transcript synthesis |
| **Payments** | Stripe | Subscriptions (monthly/yearly) |
| **E2E Testing** | Playwright | 15 browser tests covering all critical flows |
| **Hosting** | Vercel | Edge deployment, serverless functions |

---

## Pricing

| Tier | Searches/day | Price |
|------|-------------|-------|
| **Guest** | 3 | Free — no account needed |
| **Free** | 10 | $0 — just sign in |
| **Pro** | Unlimited | $9/mo or $79/yr |

Guest limits are tracked via localStorage. Free tier limits are enforced atomically in the database via a Postgres RPC function.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (hero, how-it-works, pricing)
│   ├── s/[slug]/page.tsx           # Result page (TL;DR, points, concepts, sources)
│   ├── auth/login/page.tsx         # Google OAuth + magic link login
│   ├── auth/callback/route.ts      # OAuth callback (open-redirect protected)
│   ├── upgrade/page.tsx            # Pricing / Stripe checkout
│   ├── history/page.tsx            # Auth-protected search history
│   ├── api/search/route.ts         # Main pipeline: YouTube → transcripts → Claude
│   ├── api/stripe/checkout/route.ts
│   └── api/stripe/webhook/route.ts
├── components/
│   └── SignUpGate.tsx              # Freemium limit modal
├── lib/
│   ├── supabase/client.ts          # Browser Supabase client
│   ├── supabase/server.ts          # Server Supabase client
│   └── search-limits.ts            # Guest limit tracking
└── proxy.ts                        # Next.js 16 middleware (session refresh)

services/transcripts/
├── main.py                         # FastAPI transcript service
├── railway.toml                    # Railway deploy config
└── requirements.txt                # Pinned dependencies

e2e/
└── browser-flows.spec.ts           # 15 Playwright E2E tests

supabase/
└── schema.sql                      # Full DB schema + RLS + RPC functions
```

---

## Self-Hosting

### Prerequisites

- Node.js 20+
- Python 3.11+
- Supabase project (free tier works)
- Anthropic API key
- YouTube Data API v3 key
- Stripe account (test mode for development)

### Setup

```bash
# Clone
git clone https://github.com/topsnip/topsnip-web.git
cd topsnip-web

# Install dependencies
npm install

# Copy env template and fill in your keys
cp .env.example .env.local

# Run database migrations
# (apply supabase/schema.sql to your Supabase project)

# Start the transcript service
cd services/transcripts
pip install -r requirements.txt
uvicorn main:app --port 8000

# Start the web app
cd ../..
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
YOUTUBE_API_KEY=
TRANSCRIPT_SERVICE_URL=
TRANSCRIPT_SERVICE_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
NEXT_PUBLIC_APP_URL=
```

---

## Testing

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed
```

**15 tests** covering:
- Guest search limit (localStorage) → SignUpGate modal
- Google OAuth redirect flow
- Magic link email submission
- Stripe checkout redirect (unauthenticated → login)
- History page auth protection
- Free tier DB limit → SignUpGate
- Homepage search form + suggestion chips
- Result page loading states + content rendering

---

## Security

- **RLS** on all Supabase tables — users can only access their own data
- **Atomic rate limiting** via Postgres RPC (`claim_search_slot`) — no race conditions
- **Open redirect protection** on auth callback
- **`getUser()` over `getSession()`** — server-side auth validation
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Stripe webhook signature verification**
- **Shared secret** between web app and transcript service

---

## License

Private. All rights reserved.

---

<p align="center">
  <sub>Built by <a href="https://github.com/topsnip">topsnip</a></sub>
</p>
