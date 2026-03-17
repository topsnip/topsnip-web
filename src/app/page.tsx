"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  ArrowRight,
  Check,
  Zap,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const ALL_SUGGESTIONS = [
  "build an AI agent with n8n",
  "Claude Code skills and workflows",
  "Make vs Zapier — which one to use",
  "LangChain basics for beginners",
  "n8n vs Make for automation",
  "Cursor AI coding tips",
  "RAG pipeline explained simply",
  "best AI tools for productivity",
];

/* ─── Fade-in-on-scroll hook ────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [bottomQuery, setBottomQuery] = useState("");

  // Redirect logged-in users to /feed
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace("/feed");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Randomize 4 suggestions on each visit (client-side only to avoid hydration mismatch)
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
      {/* ── Background glow ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-glow"
        style={{
          background:
            "var(--ts-glow-radial)",
        }}
      />

      {/* ── Floating Nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-4 left-4 right-4 z-50 flex justify-center">
        <div className="floating-nav rounded-full px-6 py-3 flex items-center justify-between w-full max-w-3xl">
          <Link
            href="/"
            className="font-bold tracking-tight text-white"
            style={{
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              fontSize: "1.1rem",
            }}
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/about"
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: "var(--ts-text-2)" }}
            >
              About
            </Link>
            <Link
              href="/upgrade"
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: "var(--ts-text-2)" }}
            >
              Pricing
            </Link>
            <Link
              href="/auth/login"
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — Hero
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col items-center px-4 pt-28 pb-16 sm:pt-36 sm:pb-24 relative z-10">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          {/* Badge */}
          <div
            className="rounded-full border px-3.5 py-1 text-xs font-medium"
            style={{
              color: "var(--ts-accent)",
              borderColor: "var(--ts-accent-30)",
              background: "var(--ts-accent-6)",
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            AI & automation topics — updated daily
          </div>

          {/* Headline */}
          <div className="text-center flex flex-col gap-5">
            <h1
              className="font-bold tracking-tight leading-[1.08] text-white"
              style={{
                fontSize: "clamp(2.2rem, 7vw, 3.6rem)",
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              Stop watching.
              <br />
              Start <span style={{ color: "var(--ts-accent)" }}>knowing</span>.
            </h1>
            <p
              className="text-base sm:text-lg leading-relaxed max-w-lg mx-auto"
              style={{ color: "var(--ts-text-2)" }}
            >
              Search any AI topic. Get a clear, structured explainer — sourced
              from official announcements, developer discussions, and research.
              In 3 minutes, not 3 hours.
            </p>
          </div>

          {/* Search form */}
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col gap-3 max-w-xl"
          >
            <div
              className={`flex gap-2 items-center rounded-2xl border px-5 py-4 transition-all duration-200 ${
                focused ? "accent-glow" : ""
              }`}
              style={{
                background: focused ? "rgba(12,12,14,0.6)" : "rgba(12,12,14,0.3)",
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
                autoFocus
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
          </form>

          {/* Suggested queries */}
          <div className="flex flex-col items-center gap-3 w-full">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                color: "var(--ts-muted)",
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              Try
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => navigateToSearch(s)}
                  className="suggestion-chip rounded-full border px-3 py-1.5 text-xs font-medium active:scale-95 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            3 free searches — no account required
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — Demo Preview (Show don't tell)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 pb-16 sm:pb-24 relative z-10">
        <RevealSection className="w-full max-w-2xl mx-auto">
          <div
            className="glass-card rounded-2xl p-6 flex flex-col gap-4"
            style={{ cursor: "default" }}
            onMouseEnter={() => {}} // disable hover lift on demo card
          >
            {/* Mock query header */}
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: "var(--ts-accent)" }} />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{
                  color: "var(--ts-accent)",
                  fontFamily: "var(--font-heading), 'Instrument Serif', serif",
                }}
              >
                Example result
              </span>
            </div>
            <p
              className="text-lg font-bold text-white"
              style={{
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              &ldquo;build an AI agent with n8n&rdquo;
            </p>

            {/* Mock TL;DR */}
            <div
              className="rounded-lg p-4 tldr-card"
              style={{
                background: "var(--ts-surface-2)",
                borderTop: "none",
                borderRight: "none",
                borderBottom: "none",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "var(--ts-accent)" }}
              >
                TL;DR
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--foreground)" }}
              >
                n8n lets you build AI agents by chaining LLM calls with tool
                nodes — connect a trigger, add an AI Agent node with tools like
                HTTP Request or Code, set your system prompt, and deploy. No
                Python needed.
              </p>
            </div>

            {/* Mock key concepts */}
            <div className="flex flex-wrap gap-2">
              {[
                "AI Agent Node",
                "Tool Calling",
                "System Prompt",
                "Webhooks",
                "Vector Stores",
              ].map((c) => (
                <span
                  key={c}
                  className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    borderColor: "var(--ts-accent-25)",
                    color: "var(--ts-accent-2)",
                    background: "var(--ts-accent-6)",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>

            {/* Source count */}
            <div className="flex items-center gap-2">
              <Layers size={12} style={{ color: "var(--ts-muted)" }} />
              <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                Sourced from 6 platforms — official blogs, HN, Reddit, arXiv
              </p>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — How It Works (compact horizontal strip)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-12">
          <RevealSection className="text-center flex flex-col gap-3">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                color: "var(--ts-accent)",
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              How it works
            </p>
            <h2
              className="font-bold tracking-tight text-white"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              From question to answer in 30 seconds
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
            {[
              {
                step: "01",
                title: "Search a topic",
                desc: "Type any AI or automation topic — or browse today's trending developments.",
                icon: Search,
              },
              {
                step: "02",
                title: "AI reads the sources",
                desc: "TopSnip pulls from official blogs, HN, Reddit, arXiv, GitHub, and YouTube to build a complete picture.",
                icon: Layers,
              },
              {
                step: "03",
                title: "Understand it clearly",
                desc: "Get a structured learning brief: what happened, why it matters, and what to do next.",
                icon: Zap,
              },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <RevealSection key={step} delay={i * 100}>
                <div className="glass-card rounded-xl p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "var(--ts-accent-8)",
                        border: "1px solid var(--ts-accent-20)",
                      }}
                    >
                      <Icon size={15} style={{ color: "var(--ts-accent)" }} />
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{
                        color: "var(--ts-muted)",
                        fontFamily:
                          "var(--font-heading), 'Instrument Serif', serif",
                      }}
                    >
                      Step {step}
                    </span>
                  </div>
                  <p
                    className="text-base font-semibold text-white"
                    style={{
                      fontFamily:
                        "var(--font-heading), 'Instrument Serif', serif",
                    }}
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
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — Comparison (concrete value prop)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-12">
          <RevealSection className="text-center flex flex-col gap-3">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                color: "var(--ts-accent)",
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              Why Topsnip
            </p>
            <h2
              className="font-bold tracking-tight text-white"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              3 hours of research → 3 minutes on TopSnip
            </h2>
          </RevealSection>

          <RevealSection className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              {/* Without */}
              <div
                className="rounded-xl p-6 flex flex-col gap-4 border"
                style={{
                  background: "var(--ts-error-3)",
                  borderColor: "var(--ts-error-12)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{
                    color: "var(--error)",
                    fontFamily:
                      "var(--font-heading), 'Instrument Serif', serif",
                  }}
                >
                  Without Topsnip
                </p>
                <ul className="flex flex-col gap-2.5">
                  {[
                    "Read 10 blog posts, Reddit threads, and papers",
                    "Cross-reference conflicting information",
                    "Piece together scattered announcements",
                    "No clear takeaways or next steps",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: "var(--ts-text-2)" }}
                    >
                      <span
                        className="text-xs mt-1 flex-shrink-0"
                        style={{ color: "var(--error)" }}
                      >
                        ✕
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 pt-2">
                  <Clock size={14} style={{ color: "var(--error)" }} />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--error)" }}
                  >
                    ~3 hours
                  </span>
                </div>
              </div>

              {/* With */}
              <div
                className="rounded-xl p-6 flex flex-col gap-4 border"
                style={{
                  background: "var(--ts-success-3)",
                  borderColor: "var(--ts-success-15)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{
                    color: "var(--success)",
                    fontFamily:
                      "var(--font-heading), 'Instrument Serif', serif",
                  }}
                >
                  With Topsnip
                </p>
                <ul className="flex flex-col gap-2.5">
                  {[
                    "One search, 6 platforms analyzed",
                    "Structured brief: what, so what, now what",
                    "Multiple sources cross-referenced",
                    "Full source attribution + Go Deeper links",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: "var(--ts-text-2)" }}
                    >
                      <Check
                        size={13}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: "var(--success)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 pt-2">
                  <Zap size={14} style={{ color: "var(--success)" }} />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--success)" }}
                  >
                    ~30 seconds
                  </span>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — Pricing (2 tiers: Free + Pro)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-12">
          <RevealSection className="text-center flex flex-col gap-3">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                color: "var(--ts-accent)",
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              Pricing
            </p>
            <h2
              className="font-bold tracking-tight text-white"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              Start free. Upgrade when you need more.
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Free */}
            <RevealSection delay={0}>
              <div className="glass-card rounded-xl p-6 flex flex-col gap-5 h-full">
                <div className="flex flex-col gap-1">
                  <p
                    className="text-sm font-semibold text-white"
                    style={{
                      fontFamily:
                        "var(--font-heading), 'Instrument Serif', serif",
                    }}
                  >
                    Free
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold tracking-tight text-white"
                      style={{
                        fontFamily:
                          "var(--font-heading), 'Instrument Serif', serif",
                      }}
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
                  Start searching
                </button>
              </div>
            </RevealSection>

            {/* Pro — highlighted */}
            <RevealSection delay={120}>
              <div className="pro-card-glow rounded-xl p-6 flex flex-col gap-5 relative h-full">
                {/* Badge */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                    color: "#fff",
                    boxShadow: "0 0 12px var(--ts-accent-50)",
                    fontFamily:
                      "var(--font-heading), 'Instrument Serif', serif",
                  }}
                >
                  Recommended
                </div>

                <div className="flex flex-col gap-1">
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: "var(--ts-accent)",
                      fontFamily:
                        "var(--font-heading), 'Instrument Serif', serif",
                    }}
                  >
                    Pro
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold tracking-tight text-white"
                      style={{
                        fontFamily:
                          "var(--font-heading), 'Instrument Serif', serif",
                      }}
                    >
                      $9
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "var(--ts-text-2)" }}
                    >
                      /month
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                    or $79/year (save $29)
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
                  Get Pro
                </Link>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 — Final CTA (interactive search)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 sm:py-24 relative z-10">
        <RevealSection className="w-full max-w-xl mx-auto text-center flex flex-col items-center gap-6">
          <h2
            className="font-bold tracking-tight text-white"
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            Ready to skip the noise?
          </h2>
          <p
            className="text-sm leading-relaxed max-w-md"
            style={{ color: "var(--ts-text-2)" }}
          >
            Search any AI topic and understand it clearly — sourced, structured,
            and actionable.
          </p>
          <form
            onSubmit={handleBottomSubmit}
            className="w-full flex gap-2 max-w-md"
          >
            <div
              className="flex-1 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
              style={{
                background: "var(--ts-surface)",
                borderColor: "var(--border)",
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
                placeholder="Search a topic..."
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
        </RevealSection>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Footer
          ═══════════════════════════════════════════════════════════════════ */}
      <footer
        className="px-6 py-8 relative z-10"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-white"
            style={{
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
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
          </div>
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            © {new Date().getFullYear()} Topsnip
          </p>
        </div>
      </footer>
    </main>
  );
}
