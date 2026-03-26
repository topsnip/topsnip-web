"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────

interface FeedStats {
  topics_today: number;
  sources_scanned: number;
}

// ── Count-up hook ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) return;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return value;
}

// ── Component ──────────────────────────────────────────────────────────────

export function FeedTopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [stats, setStats] = useState<FeedStats | null>(null);

  // Fetch stats
  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch("/api/feed/stats");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setStats({
            topics_today: data.topics_today ?? 0,
            sources_scanned: data.sources_scanned ?? 0,
          });
        }
      } catch {
        // Silently ignore — stats are non-critical
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  // Count-up animated values
  const topicsCount = useCountUp(stats?.topics_today ?? 0);
  const sourcesCount = useCountUp(stats?.sources_scanned ?? 0);

  // Search submit — reused logic from feed-search-bar.tsx
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    if (!slug) return;
    router.push(`/s/${slug}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-0">
        <div
          className={`flex gap-2 items-center rounded-xl border px-3 py-2.5 transition-all duration-200 ${
            focused ? "accent-glow" : ""
          }`}
          style={{
            background: focused ? "rgba(6,6,10,0.6)" : "var(--ts-surface)",
            backdropFilter: "blur(16px)",
            borderColor: focused ? "var(--ts-accent-50)" : "var(--border)",
            boxShadow: focused
              ? "0 0 0 3px var(--ts-glow), 0 8px 40px -8px var(--ts-glow)"
              : "inset 0 1px 0 0 rgba(255,255,255,0.03)",
          }}
        >
          <Search
            size={15}
            style={{ color: "var(--ts-muted)", flexShrink: 0 }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search any AI topic..."
            className="flex-1 bg-transparent text-sm outline-none tracking-wide"
            style={{ color: "var(--foreground)" }}
            autoComplete="off"
            aria-label="Search any AI topic"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="btn-primary flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Search
            <ArrowRight size={11} />
          </button>
        </div>
      </form>

      {/* Stat pills */}
      {stats && (
        <motion.div
          className="flex items-center gap-2 flex-shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          aria-live="polite"
        >
          <div
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              background: "var(--ts-surface)",
              border: "1px solid var(--border)",
              color: "var(--ts-text-2)",
            }}
          >
            <span style={{ color: "var(--foreground)" }}>{topicsCount}</span>
            today
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              background: "var(--ts-surface)",
              border: "1px solid var(--border)",
              color: "var(--ts-text-2)",
            }}
          >
            <span style={{ color: "var(--foreground)" }}>{sourcesCount}</span>
            sources
          </div>
        </motion.div>
      )}
    </div>
  );
}
