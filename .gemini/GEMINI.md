# TopSnip Web Architecture Context

## Overview
TopSnip is a Next.js 16 web application utilizing React 19, Supabase for backend/auth/database, Stripe for payments, and Anthropic's SDK for AI features. It uses Tailwind CSS for styling and shadcn/ui components.

## Key Technologies
- **Framework**: Next.js 16 (App Router likely)
- **Auth & DB**: Supabase (@supabase/ssr, @supabase/supabase-js)
- **Payments**: Stripe
- **AI**: Anthropic Claude API (@anthropic-ai/sdk)
- **Styling**: Tailwind CSS v4, Base UI, tw-animate-css
- **Testing**: Playwright for E2E testing

## Architectural Patterns
- Authentication is likely handled via Supabase Auth.
- AI processing happens presumably via API routes to protect the Anthropic API key.
- Payments managed through Stripe.
