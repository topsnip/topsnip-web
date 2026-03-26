"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SectionReveal } from "@/components/SectionReveal";
import { AnimatedCounter } from "@/app/animated-counter";
import AnimatedTerminal from "@/components/AnimatedTerminal";
import ScrollProgress from "@/components/ScrollProgress";
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

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [bottomQuery, setBottomQuery] = useState("");
  const [bottomFocused, setBottomFocused] = useState(false);

  // Parallax
  const { scrollY } = useScroll();
  const bgGlowY = useTransform(scrollY, [0, 800], [0, 800 * 0.3]);
  const heroOpacity = useTransform(scrollY, [300, 600], [1, 0]);
  const orbSwayX = useTransform(scrollY, [0, 600], [0, -30]);

  // Redirect logged-in users to /feed
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace("/feed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Randomize 4 suggestions on mount
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

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      <ScrollProgress />

      {/* Background glow */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-glow"
        style={{ background: "var(--ts-glow-radial)" }}
      />

      <SiteNav user={null} />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — Hero (2-column: Brand + Terminal)
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        style={{ opacity: heroOpacity }}
        className="flex items-center justify-center px-4 pt-24 pb-16 sm:pt-32 sm:pb-24 relative z-10 min-h-[90vh]"
      >
        {/* Pulsing background glow */}
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
          style={{ y: bgGlowY }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full animate-pulse-glow"
            style={{
              background:
                "radial-gradient(ellipse, rgba(232,115,74,0.25) 0%, transparent 70%)",
              opacity: 0.4,
            }}
          />
        </motion.div>

        <div className="w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
          {/* LEFT: Brand + Search */}
          <div className="flex flex-col gap-6 text-center lg:text-left">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{
                  background: "rgba(232,115,74,0.12)",
                  color: "var(--ts-accent)",
                  border: "1px solid rgba(232,115,74,0.2)",
                }}
              >
                <span className="pulse-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#27ca40" }} />
                Live — TopSniping the web
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-bold tracking-tight leading-[1.05] text-white"
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                fontFamily: headingFont,
                letterSpacing: "-2px",
              }}
            >
              top<span style={{ color: "var(--ts-accent)" }}>snip</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0"
              style={{ color: "var(--ts-text-2)", fontSize: "var(--text-lg)" }}
            >
              Search any topic. We find the top YouTube videos, read every transcript,
              and synthesize them into one structured result — in under 3 minutes.
            </motion.p>

            {/* Search bar */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col gap-3 max-w-lg mx-auto lg:mx-0"
            >
              <div className="flex gap-3">
                <div
                  className={`flex-1 flex gap-2 items-center rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                    focused ? "accent-glow" : ""
                  }`}
                  style={{
                    background: focused ? "rgba(12,12,14,0.6)" : "rgba(12,12,14,0.3)",
                    backdropFilter: "blur(16px)",
                    borderColor: focused ? "var(--ts-accent-50)" : "var(--border)",
                    boxShadow: focused
                      ? "0 0 0 3px var(--ts-glow), 0 8px 40px -8px var(--ts-glow)"
                      : "inset 0 1px 0 0 rgba(255,255,255,0.03)",
                  }}
                >
                  <Search size={18} style={{ color: "var(--ts-muted)", flexShrink: 0 }} />
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
                </div>
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="btn-primary flex items-center gap-1.5 rounded-xl px-6 py-3.5 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Learn
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.form>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.65 + i * 0.05,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  onClick={() => navigateToSearch(s)}
                  className="suggestion-chip pill-interactive rounded-full border px-3 py-1.5 text-sm font-medium"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>

          {/* RIGHT: Animated Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <AnimatedTerminal />
          </motion.div>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="w-full max-w-[1100px] mx-auto h-px" style={{ background: "var(--border)" }} />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — How It Works
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10 overflow-hidden">
        <motion.div
          className="absolute right-0 top-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none animate-float"
          style={{ background: "var(--ts-accent)", x: orbSwayX }}
        />

        <div className="max-w-[1100px] mx-auto flex flex-col items-center gap-12">
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
                style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontFamily: headingFont }}
              >
                From question to answer in 30 seconds
              </h2>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
            {[
              { step: 1, title: "Search", desc: "Type any topic — \"What is RAG?\", \"LangChain basics\", \"Claude Code tips\". That's it." },
              { step: 2, title: "We Research", desc: "TopSnip finds the best YouTube videos, extracts every transcript, and feeds them to Claude AI for synthesis." },
              { step: 3, title: "You Learn", desc: "Get a structured brief — TL;DR, key points, concepts, step-by-step guides, and source links. Done." },
            ].map(({ step, title, desc }, i) => (
              <SectionReveal key={step} delay={i * 0.12}>
                <div
                  className="rounded-2xl p-7 flex flex-col gap-4 h-full border transition-all duration-300 hover:-translate-y-1.5"
                  style={{
                    background: "var(--ts-surface)",
                    borderColor: "var(--border)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(232,115,74,0.3)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.05)";
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2, #f59e6c))",
                    }}
                  >
                    {step}
                  </div>
                  <p className="text-lg font-semibold text-white" style={{ fontFamily: headingFont }}>
                    {title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
                    {desc}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full max-w-[1100px] mx-auto h-px" style={{ background: "var(--border)" }} />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — Live Result Preview
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10" style={{ background: "var(--ts-surface-2, #1a1a1c)" }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <SectionReveal direction="left">
            <div className="flex flex-col gap-5">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-accent)", fontFamily: headingFont }}
              >
                See it in action
              </p>
              <h2
                className="font-bold tracking-tight text-white leading-tight"
                style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontFamily: headingFont }}
              >
                10 videos.<br />3 minutes.<br />Now you know.
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "var(--ts-text-2)", maxWidth: 560 }}>
                No tabs. No 20-minute intros. No sponsor reads. No watching the same
                explanation five times. Just the signal.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="btn-primary w-fit rounded-xl px-6 py-3 text-sm font-semibold"
              >
                Search Now →
              </button>
            </div>
          </SectionReveal>

          <SectionReveal direction="right">
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--ts-surface)", border: "1px solid var(--border)" }}>
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: "var(--ts-surface-2, #18181c)", borderBottom: "1px solid var(--border)" }}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f56" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#27ca40" }} />
                </div>
                <div className="flex-1 text-center text-xs px-3 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "var(--ts-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                  topsnip.co/s/what-is-mcp
                </div>
              </div>
              {/* Mock brief */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(232,115,74,0.12)", color: "var(--ts-accent)" }}>
                    AI Concepts
                  </span>
                  <span className="text-xs" style={{ color: "var(--ts-muted)" }}>3 min read · 8 sources</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: headingFont }}>
                  What is MCP? Model Context Protocol Explained
                </h3>
                <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(232,115,74,0.06)", border: "1px solid rgba(232,115,74,0.12)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ts-accent)" }}>TL;DR</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
                    MCP (Model Context Protocol) is an open standard by Anthropic that lets AI models
                    connect to external tools and data sources. Think of it as USB-C for AI — one
                    universal connector.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 mb-4">
                  {["Replaces custom integrations with a standardized protocol", "Enables AI to read databases, APIs, and file systems natively", "Already supported by Claude, Cursor, and Windsurf"].map((point) => (
                    <div key={point} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: "var(--ts-accent)" }} />
                      <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>{point}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {["Fireship", "AI Jason", "Anthropic", "+5 more"].map((src) => (
                    <span key={src} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--ts-text-2)" }}>
                      <span style={{ color: "#ff0000", fontSize: 12 }}>▶</span> {src}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full max-w-[1100px] mx-auto h-px" style={{ background: "var(--border)" }} />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — Stats
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <SectionReveal>
          <div className="max-w-[1100px] mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
              <AnimatedCounter target={12000} suffix="+" label="Topics explained" />
              <AnimatedCounter target={50} suffix="+" label="Sources scanned per query" />
              <AnimatedCounter target={3} suffix=" min" label="Average read time" />
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* Divider */}
      <div className="w-full max-w-[1100px] mx-auto h-px" style={{ background: "var(--border)" }} />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — Pricing
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10 overflow-hidden" style={{ background: "var(--ts-surface-2, #1a1a1c)" }}>
        <motion.div
          className="absolute left-0 bottom-0 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "var(--ts-accent)", x: orbSwayX }}
        />

        <div className="max-w-[1100px] mx-auto flex flex-col items-center gap-12">
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
                style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontFamily: headingFont }}
              >
                Start free. Upgrade when you need more.
              </h2>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
            {/* Free */}
            <SectionReveal delay={0}>
              <div className="glass-card backdrop-blur-sm rounded-xl p-8 flex flex-col gap-5 h-full" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: headingFont }}>Explore</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: headingFont }}>$0</span>
                    <span className="text-sm" style={{ color: "var(--ts-text-2)" }}>/month</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>No credit card required</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {["3 searches/day (guest)", "10 searches/day (signed in)", "Plain-language explainers", "Trending AI topics daily", "YouTube recommendations"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-base" style={{ color: "var(--ts-text-2)" }}>
                      <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ts-muted)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-secondary w-full rounded-xl py-2.5 text-sm font-semibold" style={{ color: "var(--ts-text-2)" }}>
                  Get Started
                </button>
              </div>
            </SectionReveal>

            {/* Pro */}
            <SectionReveal delay={0.12}>
              <div className="pro-card-glow backdrop-blur-sm rounded-xl p-8 flex flex-col gap-5 relative h-full" style={{ boxShadow: "0 0 40px rgba(232,115,74,0.1), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2, #f59e6c))",
                    color: "#fff",
                    boxShadow: "0 0 12px var(--ts-accent-50)",
                    fontFamily: headingFont,
                  }}
                >
                  Most popular
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--ts-accent)", fontFamily: headingFont }}>Learn</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: headingFont }}>$9.99</span>
                    <span className="text-sm" style={{ color: "var(--ts-text-2)" }}>/mo</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>Cancel anytime</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {["Unlimited searches", "Role-specific depth (dev, PM, CTO)", "\"So What\" + \"Now What\" sections", "Personalized daily feed", "Knowledge tracking + learning history", "Priority processing"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-base" style={{ color: "var(--ts-text-2)" }}>
                      <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ts-accent)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/upgrade" className="btn-primary w-full rounded-xl py-2.5 text-sm text-center block">
                  Start Pro →
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
              style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontFamily: headingFont }}
            >
              Ready to understand AI?
            </h2>

            <form onSubmit={handleBottomSubmit} className="w-full flex gap-2 max-w-md">
              <div
                className={`flex-1 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all duration-200 ${bottomFocused ? "accent-glow" : ""}`}
                style={{
                  background: "var(--ts-surface)",
                  borderColor: bottomFocused ? "var(--ts-accent-50)" : "var(--border)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <Search size={15} style={{ color: "var(--ts-muted)", flexShrink: 0 }} />
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
                Go <ArrowRight size={14} />
              </button>
            </form>

            <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
              No credit card required. Start free.
            </p>
          </div>
        </SectionReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Footer
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="px-6 py-8 relative z-10" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-base font-bold tracking-tight text-white" style={{ fontFamily: headingFont }}>
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </Link>
          <div className="flex items-center gap-6">
            {[
              { href: "/about", label: "About" },
              { href: "/upgrade", label: "Pricing" },
              { href: "/auth/login", label: "Login" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-xs font-medium transition-colors hover:text-white" style={{ color: "var(--ts-muted)" }}>
                {label}
              </Link>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            &copy; {new Date().getFullYear()} TopSnip
          </p>
        </div>
      </footer>
    </main>
  );
}
