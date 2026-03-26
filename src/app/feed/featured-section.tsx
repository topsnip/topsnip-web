"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getCategoryColor } from "@/lib/utils/category-colors";
import { headingFont } from "@/lib/constants";
import type { TopicCardData } from "./topic-card";

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function decodeHtml(text: string): string {
  if (typeof window === "undefined") return text;
  const doc = new DOMParser().parseFromString(text, "text/html");
  return doc.body.textContent ?? text;
}

// ── Props ──────────────────────────────────────────────────────────────────

interface FeaturedSectionProps {
  featuredTopic: TopicCardData;
  quickListTopics: TopicCardData[];
}

// ── Component ──────────────────────────────────────────────────────────────

export function FeaturedSection({
  featuredTopic,
  quickListTopics,
}: FeaturedSectionProps) {
  const featuredColor = getCategoryColor(featuredTopic.category);

  return (
    <div className={`grid grid-cols-1 ${quickListTopics.length > 0 ? "md:grid-cols-[3fr_2fr]" : ""} gap-4 mb-6`}>
      {/* Featured Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Link
          href={`/topic/${featuredTopic.slug}`}
          className="block rounded-xl p-6 relative overflow-hidden group"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderTop: `3px solid ${featuredColor}`,
            borderRadius: 12,
            textDecoration: "none",
          }}
        >
          {/* Category + time row */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: featuredColor }}
            >
              {featuredTopic.category.replaceAll("-", " ")}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--ts-muted)" }}
            >
              {relativeTime(featuredTopic.published_at)}
            </span>
          </div>

          {/* Title */}
          <h2
            className="mb-3 leading-snug text-white"
            style={{
              fontFamily: headingFont,
              fontSize: "var(--text-2xl)",
              fontWeight: 400,
            }}
          >
            {decodeHtml(featuredTopic.title)}
          </h2>

          {/* TL;DR — no clamp */}
          {featuredTopic.tldr && (
            <p
              className="leading-relaxed mb-4"
              style={{
                color: "var(--ts-text-2)",
                fontSize: "0.85rem",
              }}
            >
              {decodeHtml(featuredTopic.tldr)}
            </p>
          )}

          {/* Bottom row: badges + CTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {featuredTopic.is_breaking && (
                <span
                  className="breaking-badge rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: "var(--ts-error-12)",
                    color: "var(--error)",
                    border: "1px solid var(--ts-error-25)",
                  }}
                >
                  BREAKING
                </span>
              )}
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: featuredColor }}
            >
              Read the brief &rarr;
            </span>
          </div>
        </Link>
      </motion.div>

      {/* Quick List */}
      <div className="flex flex-col gap-2">
        {quickListTopics.slice(0, 3).map((topic, i) => {
          const catColor = getCategoryColor(topic.category);
          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: i * 0.1,
                ease: "easeOut",
              }}
            >
              <Link
                href={`/topic/${topic.slug}`}
                className="flex items-start gap-3 rounded-lg p-3 group"
                style={{
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  transition:
                    "background 200ms ease, border-color 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "var(--ts-surface-hover)";
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--ts-surface)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {/* Category dot */}
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: catColor }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-white line-clamp-1 leading-snug"
                  >
                    {decodeHtml(topic.title)}
                  </p>
                  <span
                    className="text-xs"
                    style={{ color: "var(--ts-muted)" }}
                  >
                    {relativeTime(topic.published_at)}
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
