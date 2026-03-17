"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  ArrowRight,
  Check,
  Zap,
  Layers,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SectionReveal } from "@/components/SectionReveal";
import { InlinePreview } from "@/app/inline-preview";
import { AnimatedCounter } from "@/app/animated-counter";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

const ALL_SUGGESTIONS = [
  "What is MCP?",
  "AI agents",
  "RAG",
  "Claude Code",
  "LangChain basics",
  "Cursor AI tips",
  "n8n automation",
  "best AI tools 2026",
];

const HERO_LINE_1 = "Stop scrolling.";
const HERO_LINE_2 = "Start understanding.";

/* ─── Hero word stagger ──────────────────────────────────────────────── */

function HeroHeadline() {
  const words1 = HERO_LINE_1.split(" ");
  const words2 = HERO_LINE_2.split(" ");
  const totalWords1 = words1.length;

  return (
    <h1
      className="font-bold tracking-tight leading-[1.08] text-white text-center"
      style={{
        fontSize: "var(--text-4xl)",
        fontFamily: headingFont,
      }}
    >
      {/* Line 1 */}
      <span className="block">
        {words1.map((word, i) => (
          <motion.span
            key={`l1-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: i * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block mr-[0.3em]"
          >
            {word}
          </motion.span>
        ))}
      </span>
      {/* Line 2 */}
      <span className="block">
        {words2.map((word, i) => (
          <motion.span
            key={`l2-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: (totalWords1 + i) * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block mr-[0.3em]"
          >
            {word}
          </motion.span>
        ))}
      </span>
    </h1>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [bottomQuery, setBottomQuery] = useState("");
  const [bottomFocused, setBottomFocused] = useState(false);

  // Redirect logged-in users to /feed
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace("/feed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Randomize 4 suggestions on mount (client-side only to avoid hydration mismatch)
  const [suggestions, setSuggestions] = useState<string[]>(() =>
    ALL_SUGGESTIONS.slice(0, 4),
  );
  useEffect(() => {
    setSuggestions(
      [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 4),
    );
  }, []);

  function navigateToSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    if (!slug) return;
    router.push(`/s/${slug}?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    navigateToSearch(query);
  }

  function handleBottomSubmit(e: FormEvent) {
    e.preventDefault();
    navigateToSearch(bottomQuery);
  }

  // Timing constants for hero stagger
  const headlineComplete = (HERO_LINE_1.split(" ").length + HERO_LINE_2.split(" ").length) * 0.1 + 0.4;
  const subtitleDelay = headlineComplete + 0.2;
  const searchBarDelay = subtitleDelay + 0.5;
  const chipsDelay = searchBarDelay + 0.3;

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* ── Background glow ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-glow"
        style={{ background: "var(--ts-glow-radial)" }}
      />

      {/* ── Floating Nav ──────────────────────────────────────────────── */}
      <SiteNav user={null} />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — Hero
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col items-center px-4 pt-28 pb-16 sm:pt-36 sm:pb-24 relative z-10">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          {/* Headline — word stagger */}
          <HeroHeadline />

          {/* Subtitle — fades in after headline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: subtitleDelay,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-base sm:text-lg leading-relaxed max-w-lg mx-auto text-center"
            style={{
              color: "var(--ts-text-2)",
              fontSize: "var(--text-lg)",
            }}
          >
            AI moves fast. TopSnip helps you keep up — in 3 minutes, not 3
            hours.
          </motion.p>

          {/* Search bar — slides up */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: searchBarDelay,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="w-full flex flex-col gap-3 max-w-xl"
          >
            <div
              className={`flex gap-2 items-center rounded-2xl border px-5 py-4 transition-all duration-200 ${
                focused ? "accent-glow" : ""
              }`}
              style={{
                background: focused
                  ? "rgba(12,12,14,0.6)"
                  : "rgba(12,12,14,0.3)",
                backdropFilter: "blur(16px)",
                borderColor: focused
                  ? "var(--ts-accent-50)"
                  : "var(--border)",
                boxShadow: focused
                  ? "0 0 0 3px var(--ts-glow), 0 8px 40px -8px var(--ts-glow)"
                  : "inset 0 1px 0 0 rgba(255,255,255,0.03)",
              }}
            >
              <Search
                size={18}
                style={{ color: "var(--ts-muted)", flexShrink: 0 }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search any AI topic..."
                className="flex-1 bg-transparent text-sm sm:text-base outline-none tracking-wide"
                style={{ color: "var(--foreground)" }}
                autoComplete="off"
                aria-label="Search any AI topic"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 cursor-pointer shadow-[0_0_20px_var(--ts-accent-30)]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                }}
              >
                Learn
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.form>

          {/* Suggestion chips — stagger in */}
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s, i) => (
              <motion.button
                key={s}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: chipsDelay + i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => navigateToSearch(s)}
                className="suggestion-chip rounded-full border px-3 py-1.5 text-xs font-medium active:scale-95 cursor-pointer"
              >
                {s}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — Inline Topic Preview
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 pb-16 sm:pb-24 relative z-10">
        <SectionReveal>
          <div className="w-full max-w-2xl mx-auto">
            <InlinePreview />
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — How It Works
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <div className="content-container-wide flex flex-col items-center gap-12">
          <SectionReveal>
            <div className="text-center flex flex-col gap-3">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-accent)", fontFamily: headingFont }}
              >
                How it works
              </p>
              <h2
                className="font-bold tracking-tight text-white"
                style={{
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  fontFamily: headingFont,
                }}
              >
                From question to answer in 30 seconds
              </h2>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
            {[
              {
                step: 1,
                title: "Search",
                desc: "Type any AI topic. That's it.",
                icon: Search,
              },
              {
                step: 2,
                title: "We Research",
                desc: "We scan 7+ platforms and distill the signal.",
                icon: Layers,
              },
              {
                step: 3,
                title: "You Learn",
                desc: "Get a structured brief in under 3 minutes.",
                icon: BookOpen,
              },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <SectionReveal key={step} delay={i * 0.15}>
                <div
                  className="rounded-xl p-5 flex flex-col gap-4 h-full border"
                  style={{
                    background: "var(--ts-surface)",
                    borderColor: "var(--border)",
                    borderRadius: "12px",
                  }}
                >
                  {/* Step number indicator */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{
                        background: "var(--ts-accent)",
                      }}
                    >
                      {step}
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "var(--ts-accent-8)",
                        border: "1px solid var(--ts-accent-20)",
                      }}
                    >
                      <Icon size={15} style={{ color: "var(--ts-accent)" }} />
                    </div>
                  </div>

                  <p
                    className="text-base font-semibold text-white"
                    style={{ fontFamily: headingFont }}
                  >
                    {title}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--ts-text-2)" }}
                  >
                    {desc}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — Social Proof / Stats
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <SectionReveal>
          <div className="content-container-wide">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
              <AnimatedCounter target={12000} suffix="+" label="Topics explained" />
              <AnimatedCounter target={50} suffix="+" label="Sources scanned" />
              <AnimatedCounter target={3} suffix=" min" label="Average read time" />
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — Pricing
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <div className="content-container-wide flex flex-col items-center gap-12">
          <SectionReveal>
            <div className="text-center flex flex-col gap-3">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-accent)", fontFamily: headingFont }}
              >
                Pricing
              </p>
              <h2
                className="font-bold tracking-tight text-white"
                style={{
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  fontFamily: headingFont,
                }}
              >
                Start free. Upgrade when you need more.
              </h2>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Free — Explore */}
            <SectionReveal delay={0}>
              <div className="glass-card rounded-xl p-6 flex flex-col gap-5 h-full">
                <div className="flex flex-col gap-1">
                  <p
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: headingFont }}
                  >
                    Explore
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold tracking-tight text-white"
                      style={{ fontFamily: headingFont }}
                    >
                      $0
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "var(--ts-text-2)" }}
                    >
                      /month
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                    No credit card required
                  </p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {[
                    "3 searches/day (guest)",
                    "10 searches/day (signed in)",
                    "Plain-language explainers",
                    "Trending AI topics daily",
                    "YouTube recommendations",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: "var(--ts-text-2)" }}
                    >
                      <Check
                        size={13}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: "var(--ts-muted)" }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    color: "var(--ts-text-2)",
                    background: "transparent",
                    border: "1px solid var(--border)",
                  }}
                >
                  Get Started
                </button>
              </div>
            </SectionReveal>

            {/* Pro — Learn (highlighted) */}
            <SectionReveal delay={0.12}>
              <div className="pro-card-glow rounded-xl p-6 flex flex-col gap-5 relative h-full">
                {/* Most popular badge */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                    color: "#fff",
                    boxShadow: "0 0 12px var(--ts-accent-50)",
                    fontFamily: headingFont,
                  }}
                >
                  Most popular
                </div>

                <div className="flex flex-col gap-1">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--ts-accent)", fontFamily: headingFont }}
                  >
                    Learn
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold tracking-tight text-white"
                      style={{ fontFamily: headingFont }}
                    >
                      $9.99
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "var(--ts-text-2)" }}
                    >
                      /mo
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                    Cancel anytime
                  </p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {[
                    "Unlimited searches",
                    "Role-specific depth (dev, PM, CTO)",
                    '"So What" + "Now What" sections',
                    "Personalized daily feed",
                    "Knowledge tracking + learning history",
                    "Priority processing",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: "var(--ts-text-2)" }}
                    >
                      <Check
                        size={13}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: "var(--ts-accent)" }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/upgrade"
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white text-center transition-all hover:opacity-90 block cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                    boxShadow: "0 0 24px var(--ts-accent-30)",
                  }}
                >
                  Start Pro
                </Link>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 — Final CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <SectionReveal>
          <div className="w-full max-w-xl mx-auto text-center flex flex-col items-center gap-6">
            <h2
              className="font-bold tracking-tight text-white"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontFamily: headingFont,
              }}
            >
              Ready to understand AI?
            </h2>

            <form
              onSubmit={handleBottomSubmit}
              className="w-full flex gap-2 max-w-md"
            >
              <div
                className={`flex-1 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all duration-200 ${
                  bottomFocused ? "accent-glow" : ""
                }`}
                style={{
                  background: "var(--ts-surface)",
                  borderColor: bottomFocused
                    ? "var(--ts-accent-50)"
                    : "var(--border)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <Search
                  size={15}
                  style={{ color: "var(--ts-muted)", flexShrink: 0 }}
                />
                <input
                  type="text"
                  value={bottomQuery}
                  onChange={(e) => setBottomQuery(e.target.value)}
                  onFocus={() => setBottomFocused(true)}
                  onBlur={() => setBottomFocused(false)}
                  placeholder="Search any AI topic..."
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "var(--foreground)" }}
                  aria-label="Search a topic"
                />
              </div>
              <button
                type="submit"
                disabled={!bottomQuery.trim()}
                className="flex items-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-30 hover:opacity-90 active:scale-95 cursor-pointer shadow-[0_0_20px_var(--ts-accent-30)]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                }}
              >
                Go
                <ArrowRight size={14} />
              </button>
            </form>

            <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
              No credit card required. Start free.
            </p>
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 7 — Footer
          ═══════════════════════════════════════════════════════════════════ */}
      <footer
        className="px-6 py-8 relative z-10"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="content-container-wide flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-white"
            style={{ fontFamily: headingFont }}
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-xs font-medium transition-colors hover:text-white"
              style={{ color: "var(--ts-muted)" }}
            >
              About
            </Link>
            <Link
              href="/upgrade"
              className="text-xs font-medium transition-colors hover:text-white"
              style={{ color: "var(--ts-muted)" }}
            >
              Pricing
            </Link>
            <Link
              href="/auth/login"
              className="text-xs font-medium transition-colors hover:text-white"
              style={{ color: "var(--ts-muted)" }}
            >
              Login
            </Link>
          </div>
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            &copy; {new Date().getFullYear()} TopSnip
          </p>
        </div>
      </footer>
    </main>
  );
}
