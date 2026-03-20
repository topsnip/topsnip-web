"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  ArrowRight,
  Check,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SectionReveal } from "@/components/SectionReveal";
import { InlinePreview } from "@/app/inline-preview";
import { AnimatedCounter } from "@/app/animated-counter";
import { headingFont } from "@/lib/constants";

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
      <section className="flex flex-col items-center px-4 pt-28 pb-16 sm:pt-36 sm:pb-24 relative z-10 dot-grid-bg">
        {/* Hero background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(ellipse, var(--ts-accent) 0%, transparent 70%)", opacity: 0.2 }} />
        </div>

        <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-8">
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
            className="w-full flex flex-col gap-3 max-w-2xl"
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
                className="btn-primary flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="suggestion-chip pill-interactive rounded-full border px-3 py-1.5 text-sm font-medium"
              >
                {s}
              </motion.button>
            ))}
          </div>

          {/* Product mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: chipsDelay + 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl mx-auto mt-12 relative"
          >
            {/* Browser chrome */}
            <div className="rounded-t-xl px-4 py-3 flex items-center gap-2" style={{ background: "var(--ts-surface)", borderBottom: "1px solid var(--border)" }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f56" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#27ca40" }} />
              </div>
              <div className="flex-1 mx-8">
                <div className="text-xs px-3 py-1 rounded-md text-center" style={{ background: "rgba(255,255,255,0.06)", color: "var(--ts-text-2)" }}>
                  topsnip.co/topic/claude-4-release
                </div>
              </div>
            </div>
            {/* Mock brief content */}
            <div className="rounded-b-xl p-6 sm:p-8" style={{ background: "var(--ts-surface)", border: "1px solid var(--border)", borderTop: "none" }}>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--ts-accent-12)", color: "var(--ts-accent)" }}>Models</span>
                  <span className="text-xs" style={{ color: "var(--ts-text-2)" }}>3 min read &middot; 5 sources</span>
                </div>
                <h3 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Claude 4 Is Here: What Changed and Why It Matters</h3>
                <div className="rounded-lg p-4" style={{ background: "rgba(232,115,74,0.06)", border: "1px solid rgba(232,115,74,0.12)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--ts-accent)" }}>TL;DR</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
                    Anthropic released Claude 4, their most capable model yet. It scores 92% on graduate-level reasoning benchmarks and can now process entire codebases in a single context window.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 h-2 rounded-full" style={{ background: "var(--ts-accent-12)" }}>
                    <div className="h-full w-3/4 rounded-full" style={{ background: "var(--ts-accent)" }} />
                  </div>
                  <span className="text-xs" style={{ color: "var(--ts-text-2)" }}>75% read</span>
                </div>
              </div>
            </div>
            {/* Glow under mockup */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-full opacity-30 blur-2xl"
              style={{ background: "var(--ts-accent)" }} />
          </motion.div>
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
      <section className="px-4 py-16 sm:py-24 relative z-10 overflow-hidden">
        {/* Floating decorative orb */}
        <div className="absolute right-0 top-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none animate-float"
          style={{ background: "var(--ts-accent)" }} />

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

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-5 sm:gap-3 w-full items-center">
            {(() => {
              const steps = [
                {
                  step: 1,
                  title: "Search",
                  desc: "Type any AI topic. That's it.",
                  svg: (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="22" cy="22" r="12" stroke="var(--ts-accent)" strokeWidth="2" />
                      <line x1="30.5" y1="30.5" x2="40" y2="40" stroke="var(--ts-accent)" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="22" cy="22" r="6" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="22" y1="4" x2="22" y2="8" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="22" y1="36" x2="22" y2="40" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="4" y1="22" x2="8" y2="22" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="36" y1="22" x2="40" y2="22" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                    </svg>
                  ),
                },
                {
                  step: 2,
                  title: "We Research",
                  desc: "We scan 7+ platforms and distill the signal.",
                  svg: (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="4" width="14" height="18" rx="2" stroke="var(--ts-accent)" strokeWidth="1.5" opacity="0.5" />
                      <rect x="17" y="2" width="14" height="18" rx="2" stroke="var(--ts-accent)" strokeWidth="1.5" opacity="0.7" />
                      <rect x="30" y="4" width="14" height="18" rx="2" stroke="var(--ts-accent)" strokeWidth="1.5" opacity="0.5" />
                      <line x1="7" y1="9" x2="15" y2="9" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="7" y1="13" x2="13" y2="13" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="20" y1="7" x2="28" y2="7" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="20" y1="11" x2="26" y2="11" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="33" y1="9" x2="41" y2="9" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <path d="M10 26 L24 36 L38 26" stroke="var(--ts-accent)" strokeWidth="1.5" fill="none" opacity="0.6" />
                      <path d="M24 36 L24 44" stroke="var(--ts-accent)" strokeWidth="1.5" strokeLinecap="round" />
                      <rect x="18" y="40" width="12" height="6" rx="1" stroke="var(--ts-accent)" strokeWidth="1.5" fill="rgba(232,115,74,0.1)" />
                    </svg>
                  ),
                },
                {
                  step: 3,
                  title: "You Learn",
                  desc: "Get a structured brief in under 3 minutes.",
                  svg: (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="8" y="4" width="32" height="40" rx="3" stroke="var(--ts-accent)" strokeWidth="1.5" />
                      <line x1="14" y1="12" x2="34" y2="12" stroke="var(--ts-accent)" strokeWidth="1.5" opacity="0.5" />
                      <line x1="14" y1="18" x2="30" y2="18" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="14" y1="22" x2="32" y2="22" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <line x1="14" y1="26" x2="28" y2="26" stroke="var(--ts-accent)" strokeWidth="1" opacity="0.3" />
                      <circle cx="34" cy="34" r="8" fill="var(--ts-accent)" opacity="0.15" />
                      <circle cx="34" cy="34" r="8" stroke="var(--ts-accent)" strokeWidth="1.5" />
                      <path d="M30 34 L33 37 L39 31" stroke="var(--ts-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
              ];

              return steps.flatMap(({ step, title, desc, svg }, i) => {
                const card = (
                  <SectionReveal key={step} delay={i * 0.15}>
                    <div
                      className="rounded-xl p-5 flex flex-col gap-4 h-full border backdrop-blur-sm"
                      style={{
                        background: "var(--ts-surface)",
                        borderColor: "var(--border)",
                        borderRadius: "12px",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}
                    >
                      {/* Step number + SVG illustration */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                          style={{
                            background: "var(--ts-accent)",
                          }}
                        >
                          {step}
                        </div>
                      </div>

                      {/* SVG illustration */}
                      <div className="flex items-center justify-center py-2">
                        {svg}
                      </div>

                      <p
                        className="text-base font-semibold text-white"
                        style={{ fontFamily: headingFont }}
                      >
                        {title}
                      </p>
                      <p
                        className="text-base leading-relaxed"
                        style={{ color: "var(--ts-text-2)" }}
                      >
                        {desc}
                      </p>
                    </div>
                  </SectionReveal>
                );

                if (i < 2) {
                  const arrow = (
                    <div key={`arrow-${step}`} className="hidden sm:flex items-center justify-center" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ts-muted)" }}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  );
                  return [card, arrow];
                }
                return [card];
              });
            })()}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — Social Proof / Stats
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <div className="relative" style={{ background: "linear-gradient(180deg, transparent, var(--ts-surface) 20%, var(--ts-surface) 80%, transparent)" }}>
          <SectionReveal>
            <div className="content-container-wide py-12">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
                <AnimatedCounter target={12000} suffix="+" label="Topics explained" />
                <AnimatedCounter target={50} suffix="+" label="Sources scanned" />
                <AnimatedCounter target={3} suffix=" min" label="Average read time" />
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — Pricing
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10 overflow-hidden">
        {/* Floating decorative orb */}
        <div className="absolute left-0 bottom-0 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "var(--ts-accent)" }} />

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
            {/* Free — Explore */}
            <SectionReveal delay={0}>
              <div className="glass-card backdrop-blur-sm rounded-xl p-8 flex flex-col gap-5 h-full" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
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
                      className="flex items-start gap-2 text-base"
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
                  className="btn-secondary w-full rounded-xl py-2.5 text-sm font-semibold"
                  style={{ color: "var(--ts-text-2)" }}
                >
                  Get Started
                </button>
              </div>
            </SectionReveal>

            {/* Pro — Learn (highlighted) */}
            <SectionReveal delay={0.12}>
              <div className="pro-card-glow backdrop-blur-sm rounded-xl p-8 flex flex-col gap-5 relative h-full" style={{ boxShadow: "0 0 40px rgba(232,115,74,0.1), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
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
                      className="flex items-start gap-2 text-base"
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
                  className="btn-primary w-full rounded-xl py-2.5 text-sm text-center block"
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
                className="btn-primary flex items-center gap-1.5 rounded-xl px-5 py-3 text-sm disabled:opacity-30"
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
