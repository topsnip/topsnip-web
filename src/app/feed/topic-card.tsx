"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  Code,
  Globe,
  Cpu,
  Briefcase,
  GraduationCap,
  Zap,
  CheckCircle,
} from "lucide-react";
import { SectionReveal } from "@/components/SectionReveal";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

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
}

// ── Category icon mapping ──────────────────────────────────────────────────

function getCategoryIcon(tag?: string) {
  const t = (tag ?? "").toLowerCase();
  if (t.includes("llm") || t.includes("model") || t.includes("language")) return Cpu;
  if (t.includes("code") || t.includes("dev") || t.includes("programming")) return Code;
  if (t.includes("business") || t.includes("startup") || t.includes("enterprise")) return Briefcase;
  if (t.includes("research") || t.includes("paper") || t.includes("academic")) return GraduationCap;
  if (t.includes("product") || t.includes("tool") || t.includes("launch")) return Zap;
  if (t.includes("agent")) return Brain;
  return Globe;
}

function getCategoryLabel(tag?: string): string {
  const t = (tag ?? "").toLowerCase();
  if (t.includes("llm") || t.includes("model") || t.includes("language")) return "AI Models";
  if (t.includes("code") || t.includes("dev") || t.includes("programming")) return "Code & Dev";
  if (t.includes("business") || t.includes("startup") || t.includes("enterprise")) return "Business";
  if (t.includes("research") || t.includes("paper") || t.includes("academic")) return "Research";
  if (t.includes("product") || t.includes("tool") || t.includes("launch")) return "Products";
  if (t.includes("agent")) return "AI Agents";
  return "General";
}

// ── Relative time helper ───────────────────────────────────────────────────

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

// ── Reading time estimate ──────────────────────────────────────────────────

function readingTime(tldr: string): string {
  // Estimate: ~200 wpm for the full brief; TL;DR is ~10% of full content
  const words = tldr.split(/\s+/).length;
  const estimatedFullWords = words * 10;
  const minutes = Math.max(2, Math.ceil(estimatedFullWords / 200));
  return `${minutes} min read`;
}

// ── Decode HTML entities ───────────────────────────────────────────────────

function decodeHtml(text: string): string {
  if (typeof window === "undefined") return text;
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

// ── Single Topic Card ──────────────────────────────────────────────────────

function TopicCardInner({ topic, index }: { topic: TopicCardData; index: number }) {
  const Icon = getCategoryIcon(topic.primary_tag);
  const categoryLabel = getCategoryLabel(topic.primary_tag);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        href={`/topic/${topic.slug}`}
        className="topic-card card-interactive group block rounded-xl p-5"
        style={{
          background: "var(--ts-surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          textDecoration: "none",
          opacity: topic.is_read ? 0.55 : 1,
        }}
      >
        {/* Category row + badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "var(--ts-accent-6)",
              }}
            >
              <Icon size={16} style={{ color: "var(--ts-accent)" }} />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: "var(--ts-text-2)" }}
            >
              {categoryLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {topic.is_read && (
              <span
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--ts-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                Read <CheckCircle size={10} />
              </span>
            )}
            {topic.is_breaking && (
              <span
                className="breaking-badge rounded-md px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: "var(--ts-error-12)",
                  color: "var(--error)",
                  border: "1px solid var(--ts-error-25)",
                }}
              >
                Breaking
              </span>
            )}
            {topic.trending_score >= 70 && !topic.is_breaking && !topic.is_read && (
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: "var(--ts-accent-8)",
                  color: "var(--ts-accent)",
                  border: "1px solid var(--ts-accent-20)",
                }}
              >
                Trending
              </span>
            )}
          </div>
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

        {/* TL;DR */}
        {topic.tldr && (
          <p
            className="text-sm leading-relaxed line-clamp-2 mb-3"
            style={{ color: "var(--ts-text-2)" }}
          >
            {decodeHtml(topic.tldr)}
          </p>
        )}

        {/* Metadata row */}
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--ts-muted)" }}
        >
          <span>
            {topic.platform_count} source{topic.platform_count === 1 ? "" : "s"}
            {topic.published_at && ` · ${relativeTime(topic.published_at)}`}
          </span>
          <span>{readingTime(topic.tldr)}</span>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Topic Card List ────────────────────────────────────────────────────────

interface TopicCardListProps {
  topics: TopicCardData[];
}

export function TopicCardList({ topics }: TopicCardListProps) {
  return (
    <SectionReveal>
      <div className="flex flex-col gap-3">
        {topics.map((topic, i) => (
          <TopicCardInner key={topic.id} topic={topic} index={i} />
        ))}
      </div>
    </SectionReveal>
  );
}
