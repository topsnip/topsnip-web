"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { getCategoryColor } from "@/lib/utils/category-colors";

// ── Tab definitions ────────────────────────────────────────────────────────

const TABS = [
  { key: "all", label: "All" },
  { key: "models", label: "Models" },
  { key: "tools", label: "Tools" },
  { key: "research", label: "Research" },
  { key: "open-source", label: "Open Source" },
  { key: "industry", label: "Industry" },
  { key: "ethics", label: "Ethics" },
] as const;

// ── Props ──────────────────────────────────────────────────────────────────

interface CategoryTabsProps {
  onCategoryChange: (category: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function CategoryTabs({ onCategoryChange }: CategoryTabsProps) {
  const [active, setActive] = useState<string>("all");
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSelect = useCallback(
    (key: string) => {
      setActive(key);
      onCategoryChange(key);
    },
    [onCategoryChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = TABS.findIndex((t) => t.key === active);
      let nextIndex = currentIndex;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = TABS.length - 1;
      } else {
        return;
      }

      const nextKey = TABS[nextIndex].key;
      handleSelect(nextKey);
      tabsRef.current[nextIndex]?.focus();
    },
    [active, handleSelect]
  );

  return (
    <div
      className="mb-6 relative"
      style={{
        // Fade edges on mobile scroll
        maskImage:
          "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
      }}
    >
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Filter topics by category"
        onKeyDown={handleKeyDown}
        style={{
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {TABS.map((tab, i) => {
          const isActive = active === tab.key;
          const catColor =
            tab.key === "all" ? "var(--ts-accent)" : getCategoryColor(tab.key);

          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelect(tab.key)}
              className="flex-shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                scrollSnapAlign: "start",
                background: isActive
                  ? `color-mix(in srgb, ${catColor} 15%, transparent)`
                  : "var(--ts-surface)",
                color: isActive ? catColor : "var(--ts-text-2)",
                border: "1px solid",
                borderColor: isActive
                  ? `color-mix(in srgb, ${catColor} 25%, transparent)`
                  : "var(--border)",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
