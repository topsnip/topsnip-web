"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Check, Zap, Layers, Eye, Clock } from "lucide-react";
import Link from "next/link";

const SUGGESTED_QUERIES = [
  "build an AI agent with n8n",
  "Claude Code skills and workflows",
  "Make vs Zapier — which one to use",
  "LangChain basics for beginners",
  "n8n vs Make for automation",
  "Cursor AI coding tips",
];

/* ─── Fade-in-on-scroll hook ────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
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
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const slug = q.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    router.push(`/s/${slug}?q=${encodeURIComponent(q)}`);
  }

  function handleSuggestion(suggestion: string) {
    const slug = suggestion.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    router.push(`/s/${slug}?q=${encodeURIComponent(suggestion)}`);
  }

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* ── Background glow ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(124,106,247,0.08) 0%, transparent 70%)",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="w-full flex items-center justify-between px-6 py-5 max-w-5xl mx-auto relative z-10">
        <div className="text-xl font-extrabold tracking-tight text-white">
          top<span style={{ color: "var(--ts-accent)" }}>snip</span>
        </div>
        <div className="flex items-center gap-6">
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
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — Hero
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col items-center px-4 pt-16 pb-24 sm:pt-24 sm:pb-32 relative z-10">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          {/* Badge */}
          <div
            className="rounded-full border px-3.5 py-1 text-xs font-medium"
            style={{
              color: "var(--ts-accent)",
              borderColor: "rgba(124,106,247,0.3)",
              background: "rgba(124,106,247,0.06)",
            }}
          >
            AI & automation topics — more coming soon
          </div>

          {/* Headline */}
          <div className="text-center flex flex-col gap-5">
            <h1
              className="font-extrabold tracking-tight leading-[1.08] text-white"
              style={{ fontSize: "clamp(2.2rem, 7vw, 3.6rem)" }}
            >
              Stop watching.
              <br />
              Start knowing.
            </h1>
            <p
              className="text-base sm:text-lg leading-relaxed max-w-lg mx-auto"
              style={{ color: "var(--ts-text-2)" }}
            >
              Type a topic. Topsnip reads the 8 best YouTube videos on it and
              gives you one distilled summary — in seconds, not hours.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 max-w-xl">
            <div
              className="flex gap-2 items-center rounded-xl border px-4 py-3.5 transition-all duration-200"
              style={{
                background: "var(--ts-surface)",
                borderColor: focused ? "rgba(124,106,247,0.6)" : "var(--border)",
                boxShadow: focused ? "0 0 0 3px var(--ts-glow)" : "none",
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
                placeholder="What do you want to learn today?"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--foreground)" }}
                autoComplete="off"
                autoFocus
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 cursor-pointer"
                style={{ background: "var(--ts-accent)" }}
              >
                Topsnip it
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          {/* Suggested queries */}
          <div className="flex flex-col items-center gap-3 w-full">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--ts-muted)" }}
            >
              Try
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUERIES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="suggestion-chip rounded-full border px-3 py-1.5 text-xs font-medium active:scale-95 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Social proof line */}
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            3 free searches. No account required.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — How It Works
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-20 sm:py-28 relative z-10">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-14">
          <RevealSection className="text-center flex flex-col gap-3">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--ts-accent)" }}
            >
              How it works
            </p>
            <h2
              className="font-bold tracking-tight text-white"
              style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}
            >
              From question to answer in 30 seconds
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
            {[
              {
                step: "01",
                title: "Search a topic",
                desc: "Type any AI or automation topic into the search bar. That's it.",
                icon: Search,
              },
              {
                step: "02",
                title: "AI reads 8 videos",
                desc: "Topsnip finds the top YouTube videos and feeds every transcript to Claude AI.",
                icon: Layers,
              },
              {
                step: "03",
                title: "Get the signal",
                desc: "One structured summary: TL;DR, key points, concepts, actionable steps, and sources.",
                icon: Zap,
              },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <RevealSection key={step} delay={i * 120}>
                <div
                  className="rounded-xl border p-6 flex flex-col gap-4 h-full"
                  style={{ background: "var(--ts-surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "rgba(124,106,247,0.08)",
                        border: "1px solid rgba(124,106,247,0.2)",
                      }}
                    >
                      <Icon size={16} style={{ color: "var(--ts-accent)" }} />
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "var(--ts-muted)" }}
                    >
                      Step {step}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-base font-semibold text-white">{title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
                      {desc}
                    </p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — Why Topsnip
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-20 sm:py-28 relative z-10">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-14">
          <RevealSection className="text-center flex flex-col gap-3">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--ts-accent)" }}
            >
              Why Topsnip
            </p>
            <h2
              className="font-bold tracking-tight text-white"
              style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}
            >
              Learn faster. Watch less.
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            {[
              {
                icon: Clock,
                title: "Save hours, not minutes",
                desc: "8 videos at 20 minutes each = nearly 3 hours. Topsnip gives you the same knowledge in a 30-second read.",
              },
              {
                icon: Layers,
                title: "Multiple perspectives, one summary",
                desc: "Instead of one creator's opinion, you get a synthesis from 8 different sources — balanced and comprehensive.",
              },
              {
                icon: Zap,
                title: "Structured, not rambling",
                desc: "Key points, concepts, and step-by-step instructions — extracted and organized. No filler, no intros, no sponsor reads.",
              },
              {
                icon: Eye,
                title: "Full source transparency",
                desc: "Every summary links back to the original videos. Verify anything. Go deeper on what matters to you.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <RevealSection key={title} delay={i * 100}>
                <div
                  className="rounded-xl border p-6 flex flex-col gap-3 h-full"
                  style={{ background: "var(--ts-surface)", borderColor: "var(--border)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(124,106,247,0.08)",
                      border: "1px solid rgba(124,106,247,0.2)",
                    }}
                  >
                    <Icon size={16} style={{ color: "var(--ts-accent)" }} />
                  </div>
                  <p className="text-base font-semibold text-white">{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
                    {desc}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — Pricing
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-20 sm:py-28 relative z-10">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-14">
          <RevealSection className="text-center flex flex-col gap-3">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--ts-accent)" }}
            >
              Pricing
            </p>
            <h2
              className="font-bold tracking-tight text-white"
              style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}
            >
              Start free. Upgrade when you need more.
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
            {/* Guest */}
            <RevealSection delay={0}>
              <div
                className="rounded-xl border p-6 flex flex-col gap-5 h-full"
                style={{ background: "var(--ts-surface)", borderColor: "var(--border)" }}
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-white">Guest</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold tracking-tight text-white">Free</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>No account needed</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {["3 searches/day", "Full result pages", "All topics"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--ts-text-2)" }}>
                      <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ts-muted)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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

            {/* Free account */}
            <RevealSection delay={120}>
              <div
                className="rounded-xl border p-6 flex flex-col gap-5 h-full"
                style={{ background: "var(--ts-surface)", borderColor: "var(--border)" }}
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-white">Free</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold tracking-tight text-white">$0</span>
                    <span className="text-sm" style={{ color: "var(--ts-text-2)" }}>/month</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>Signed-in account</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {["10 searches/day", "Full result pages", "All topics", "Search history"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--ts-text-2)" }}>
                      <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ts-muted)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    color: "var(--ts-text-2)",
                    background: "transparent",
                    border: "1px solid var(--border)",
                  }}
                >
                  Sign up free
                </button>
              </div>
            </RevealSection>

            {/* Pro — highlighted */}
            <RevealSection delay={240}>
              <div
                className="rounded-xl border p-6 flex flex-col gap-5 relative h-full"
                style={{ background: "var(--ts-surface)", borderColor: "var(--ts-accent)" }}
              >
                {/* Badge */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                  style={{ background: "var(--ts-accent)", color: "#fff" }}
                >
                  Most popular
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--ts-accent)" }}>Pro</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold tracking-tight text-white">$9</span>
                    <span className="text-sm" style={{ color: "var(--ts-text-2)" }}>/month</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>or $79/year (save $29)</p>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {["Unlimited searches", "Full result pages", "All topics", "Search history", "Priority processing"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--ts-text-2)" }}>
                      <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ts-accent)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/upgrade"
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white text-center transition-all hover:opacity-90 block"
                  style={{ background: "var(--ts-accent)" }}
                >
                  Get Pro
                </Link>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — Final CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-20 sm:py-28 relative z-10">
        <RevealSection className="w-full max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
          <h2
            className="font-bold tracking-tight text-white"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}
          >
            Ready to skip the noise?
          </h2>
          <p
            className="text-base leading-relaxed max-w-md"
            style={{ color: "var(--ts-text-2)" }}
          >
            Type a topic and get the distilled knowledge from 8 YouTube videos
            — no account, no credit card, no 20-minute intros.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 cursor-pointer"
            style={{ background: "var(--ts-accent)" }}
          >
            Topsnip something
            <ArrowRight size={14} />
          </button>
        </RevealSection>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Footer
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="px-6 py-8 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-lg font-extrabold tracking-tight text-white">
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </div>
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
            {new Date().getFullYear()} Topsnip. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
