"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

function toSearchHref(topic: string) {
  const slug = topic
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `/s/${slug}?q=${encodeURIComponent(topic)}`;
}

/* ── Floating Topic Pills (empty state) ─────────────────────────────────── */

export function TrendingSuggestions() {
  return (
    <div
      className="flex flex-col items-center gap-6 py-2"
      style={{ animation: "fadeInUp 0.5s ease 0.1s both" }}
    >
      {/* Typewriter heading */}
      <div className="text-center flex flex-col items-center gap-2">
        <div className="typewriter-container">
          <p
            className="typewriter-line-1 text-base font-semibold"
            style={{
              color: "var(--ts-text-2)",
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            Scanning AI sources...
          </p>
          <p
            className="typewriter-line-2 text-sm"
            style={{ color: "var(--ts-muted)" }}
          >
            Check back soon or explore a topic
          </p>
        </div>
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
          fontFamily: "var(--font-heading), 'Instrument Serif', serif",
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
