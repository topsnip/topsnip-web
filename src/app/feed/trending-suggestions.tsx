"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

const TRENDING_TOPICS = [
  "What is MCP?",
  "Claude 4 vs GPT-5",
  "AI Agents explained",
  "RAG pipelines",
  "Fine-tuning LLMs",
  "Cursor vs Copilot",
  "Local AI models",
  "AI in healthcare",
  "Prompt engineering",
  "Multimodal AI",
  "AI coding assistants",
  "Open source AI",
];

const FEED_SUGGESTIONS = [
  "build an AI agent with n8n",
  "Claude Code skills and workflows",
  "LangChain basics for beginners",
  "Cursor AI coding tips",
  "RAG pipeline explained simply",
  "best AI tools for productivity",
  "AI image generation compared",
  "vector databases explained",
];

const EXAMPLE_SEARCHES = [
  {
    query: "What is MCP?",
    description: "Understand Model Context Protocol in 3 minutes",
  },
  {
    query: "Claude vs GPT",
    description: "Real comparison, not marketing",
  },
  {
    query: "AI agents explained",
    description: "What they are, why they matter, what to build",
  },
];

function toSearchHref(topic: string) {
  const slug = topic
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `/s/${slug}?q=${encodeURIComponent(topic)}`;
}

/* ── Floating Topic Pills (empty state) — enhanced with welcome + examples ── */

export function TrendingSuggestions() {
  return (
    <div
      className="flex flex-col items-center gap-6 py-2"
      style={{ animation: "fadeInUp 0.5s ease 0.1s both" }}
    >
      {/* Welcome message */}
      <div className="text-center flex flex-col items-center gap-3">
        <p
          className="text-base font-semibold"
          style={{
            color: "var(--ts-text-2)",
            fontFamily: headingFont,
          }}
        >
          Welcome! Here&apos;s what TopSnip can do for you.
        </p>
        <p
          className="text-sm max-w-md"
          style={{ color: "var(--ts-muted)" }}
        >
          Scanning AI sources... Check back soon or explore a topic
        </p>
      </div>

      {/* Example search suggestions with descriptions */}
      <div className="flex flex-col gap-2 w-full max-w-md">
        {EXAMPLE_SEARCHES.map((item) => (
          <Link
            key={item.query}
            href={toSearchHref(item.query)}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all duration-200 group"
            style={{
              background: "var(--ts-surface)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            <div className="flex flex-col gap-0.5">
              <span
                className="text-sm font-medium text-white group-hover:underline"
                style={{ fontFamily: headingFont }}
              >
                {item.query}
              </span>
              <span className="text-xs" style={{ color: "var(--ts-muted)" }}>
                {item.description}
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--ts-accent)", flexShrink: 0 }}
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Floating pills */}
      <div className="flex flex-wrap justify-center gap-2.5 max-w-lg">
        {TRENDING_TOPICS.map((topic, i) => (
          <Link
            key={topic}
            href={toSearchHref(topic)}
            className="trending-pill rounded-full border px-3.5 py-1.5 text-xs font-medium"
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${3 + (i % 4) * 0.7}s`,
            }}
          >
            {topic}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Quick Search Suggestions (below search bar) ────────────────────────── */

export function QuickSuggestions() {
  // Randomize 4 suggestions on mount (client-side only)
  const [picks, setPicks] = useState<string[]>(() =>
    FEED_SUGGESTIONS.slice(0, 4),
  );

  useEffect(() => {
    setPicks(
      [...FEED_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 4),
    );
  }, []);

  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-6"
      style={{ animation: "fadeInUp 0.35s ease 0.08s both" }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-widest mr-1"
        style={{
          color: "var(--ts-muted)",
          fontFamily: headingFont,
        }}
      >
        Try
      </span>
      {picks.map((s) => (
        <Link
          key={s}
          href={toSearchHref(s)}
          className="suggestion-chip rounded-full border px-2.5 py-1 text-[11px] font-medium"
        >
          {s}
        </Link>
      ))}
    </div>
  );
}

/* ── Enhanced Quiet Day State ───────────────────────────────────────────── */

interface QuietDayProps {
  showLearningDebt?: boolean;
}

export function QuietDayState({ showLearningDebt }: QuietDayProps) {
  return (
    <div
      className="flex flex-col items-center text-center gap-6 py-4"
      style={{ animation: "fadeInUp 0.35s ease 0.06s both" }}
    >
      {/* Large emoji */}
      <div className="text-5xl" role="img" aria-label="sleeping face">
        😴
      </div>

      {/* Heading */}
      <div className="flex flex-col gap-2">
        <h2
          className="text-xl font-normal text-white"
          style={{ fontFamily: headingFont }}
        >
          AI took a breather today.
        </h2>

        {showLearningDebt && (
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            Catch up on what you missed, or explore something new.
          </p>
        )}
        {!showLearningDebt && (
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            Nothing major happened today. Explore something new.
          </p>
        )}
      </div>

      {/* Suggestion pills */}
      <div className="flex flex-col gap-2 items-center">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--ts-muted)" }}
        >
          Or explore something new
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          {["RAG pipelines", "AI agents", "Fine-tuning LLMs", "What is MCP?", "AI coding tools", "Prompt engineering"].map(
            (s) => (
              <Link
                key={s}
                href={toSearchHref(s)}
                className="suggestion-chip rounded-full border px-3 py-1.5 text-xs font-medium"
              >
                {s}
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
