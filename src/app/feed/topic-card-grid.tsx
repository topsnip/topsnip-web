"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TopicCard } from "./topic-card";
import type { TopicCardData } from "./topic-card";

// ── Props ──────────────────────────────────────────────────────────────────

interface TopicCardGridProps {
  topics: TopicCardData[];
  activeCategory: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export function TopicCardGrid({ topics, activeCategory }: TopicCardGridProps) {
  const filtered =
    activeCategory === "all"
      ? topics
      : topics.filter((t) => t.category === activeCategory);

  // Format category label for empty state
  const categoryLabel =
    activeCategory === "all"
      ? ""
      : activeCategory.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (filtered.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-xl"
        style={{
          color: "var(--ts-text-2)",
          background: "var(--ts-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p className="text-sm">
          No {categoryLabel || "matching"} topics this week.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AnimatePresence mode="popLayout">
        {filtered.map((topic, index) => (
          <motion.div
            key={topic.id}
            layout
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{
              delay: index * 0.04,
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <TopicCard topic={topic} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
