"use client";

import { useRef, useCallback, memo } from "react";
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
  const doc = new DOMParser().parseFromString(text, "text/html");
  return doc.body.textContent ?? text;
}

// ── Tilt detection: check for touch device + reduced motion ────────────

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ── TopicCard ──────────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: TopicCardData;
}

export const TopicCard = memo(function TopicCard({ topic }: TopicCardProps) {
  const categoryColor = getCategoryColor(topic.category);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const spotlightRef = useRef({ x: 50, y: 50 });
  const spotlightElRef = useRef<HTMLDivElement>(null);

  const MAX_TILT = 4; // degrees

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isTouchDevice() || prefersReducedMotion()) return;
      const el = cardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Normalized -1 to 1
      const normX = (x - centerX) / centerX;
      const normY = (y - centerY) / centerY;

      const rotateY = normX * MAX_TILT;
      const rotateX = -normY * MAX_TILT;

      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      el.style.willChange = "transform";

      // Update spotlight position via direct DOM manipulation (no re-render)
      const pctX = (x / rect.width) * 100;
      const pctY = (y / rect.height) * 100;
      spotlightRef.current = { x: pctX, y: pctY };
      if (spotlightElRef.current) {
        spotlightElRef.current.style.background = `radial-gradient(circle at ${pctX}% ${pctY}%, rgba(255,255,255,0.06), transparent 60%)`;
      }
    },
    [],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const el = cardRef.current;
      if (!el) return;
      el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
      el.style.borderTopColor = categoryColor;
      if (!isTouchDevice() && !prefersReducedMotion()) {
        el.style.willChange = "transform";
      }
    },
    [categoryColor],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const el = cardRef.current;
      if (!el) return;
      el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)";
      el.style.boxShadow = "none";
      el.style.borderTopColor = categoryColor;
      el.style.willChange = "auto";
    },
    [categoryColor],
  );

  return (
    <Link
      ref={cardRef}
      href={`/topic/${topic.slug}`}
      className="topic-card topic-card-tilt card-interactive group block rounded-xl p-5 relative overflow-hidden"
      style={{
        background: "var(--ts-surface)",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${categoryColor}`,
        borderRadius: 12,
        textDecoration: "none",
        opacity: topic.is_read ? 0.55 : 1,
        transition:
          "border-color 200ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms cubic-bezier(0.16,1,0.3,1), transform 300ms cubic-bezier(0.16,1,0.3,1)",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Spotlight overlay — follows cursor (updated via ref, no re-renders) */}
      <div
        ref={spotlightElRef}
        className="tilt-spotlight absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${spotlightRef.current.x}% ${spotlightRef.current.y}%, rgba(255,255,255,0.06), transparent 60%)`,
        }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${categoryColor}08, transparent 70%)`,
        }}
      />

      {/* Category top border — animates width on entrance */}
      <div
        className="category-border-animate absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{ background: categoryColor }}
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
});
