"use client";

import Link from "next/link";
import { getCategoryColor } from "@/lib/utils/category-colors";
import { headingFont } from "@/lib/constants";

// ── Types ──────────────────────────────────────────────────────────────────

export interface TopicCardData {
  id: string;
  slug: string;
  title: string;
  tldr: string;
  trending_score: number;
  is_breaking: boolean;
  platform_count: number;
  published_at: string | null;
  is_read: boolean;
  primary_tag?: string;
  category: string;
  is_new: boolean;
}

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
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

// ── TopicCard ──────────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: TopicCardData;
}

export function TopicCard({ topic }: TopicCardProps) {
  const categoryColor = getCategoryColor(topic.category);

  return (
    <Link
      href={`/topic/${topic.slug}`}
      className="topic-card card-interactive group block rounded-xl p-5 relative overflow-hidden"
      style={{
        background: "var(--ts-surface)",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${categoryColor}`,
        borderRadius: 12,
        textDecoration: "none",
        opacity: topic.is_read ? 0.55 : 1,
        transition:
          "border-color 200ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
        el.style.borderTopColor = categoryColor;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
        el.style.borderTopColor = categoryColor;
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${categoryColor}08, transparent 70%)`,
        }}
      />

      {/* Row 1: Category + relative time */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: categoryColor }}
        >
          {topic.category.replaceAll("-", " ")}
        </span>
        {topic.published_at && (
          <span className="text-xs" style={{ color: "var(--ts-muted)" }}>
            {relativeTime(topic.published_at)}
          </span>
        )}
      </div>

      {/* Title */}
      <h2
        className="mb-2 leading-snug text-white"
        style={{
          fontFamily: headingFont,
          fontSize: "var(--text-xl)",
          fontWeight: 400,
        }}
      >
        {decodeHtml(topic.title)}
      </h2>

      {/* TL;DR — 2-line clamp */}
      {topic.tldr && (
        <p
          className="line-clamp-2 mb-3 leading-relaxed"
          style={{
            color: "var(--ts-text-2)",
            fontSize: "0.85rem",
          }}
        >
          {decodeHtml(topic.tldr)}
        </p>
      )}

      {/* Row 3: Badges + source count */}
      <div className="flex items-center gap-2 flex-wrap">
        {topic.is_breaking && (
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
        {topic.trending_score >= 70 && !topic.is_breaking && (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: "var(--ts-accent-8)",
              color: "var(--ts-accent)",
              border: "1px solid var(--ts-accent-20)",
            }}
          >
            TRENDING
          </span>
        )}
        {topic.is_new && (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: "rgba(74, 222, 128, 0.12)",
              color: "#4ade80",
              border: "1px solid rgba(74, 222, 128, 0.25)",
            }}
          >
            NEW
          </span>
        )}

        <span
          className="ml-auto text-xs"
          style={{ color: "var(--ts-muted)" }}
        >
          {topic.platform_count} source{topic.platform_count === 1 ? "" : "s"}
        </span>
      </div>
    </Link>
  );
}

