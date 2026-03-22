"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getCategoryColor } from "@/lib/utils/category-colors";
import { headingFont } from "@/lib/constants";

interface SuggestedTopic {
  id: string;
  slug: string;
  title: string;
  tldr: string | null;
  readTime: number;
  categoryTag: string;
}

interface SuggestedTopicsCarouselProps {
  topics: SuggestedTopic[];
}

/**
 * Client component for the horizontal carousel with scroll snap,
 * arrows, dots, and stagger entrance animation.
 */
export function SuggestedTopicsCarousel({ topics }: SuggestedTopicsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Intersection observer for entrance animation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);

    // Update active dot
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 12
      : 280;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(idx, topics.length - 1));
  }, [topics.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 12
      : 280;
    el.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  }

  return (
    <div ref={sectionRef} className="relative">
      {/* Scroll arrows — desktop only */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            color: "var(--ts-text-2)",
          }}
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            color: "var(--ts-text-2)",
          }}
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-3"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {topics.map((topic, i) => (
          <div
            key={topic.id}
            style={{
              minWidth: "280px",
              maxWidth: "320px",
              flex: "0 0 auto",
              scrollSnapAlign: "start",
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateX(0)" : "translateX(40px)",
              transition: `opacity 350ms var(--ease-out-expo) ${i * 80}ms, transform 350ms var(--ease-out-expo) ${i * 80}ms`,
            }}
          >
            <SuggestedTopicCard topic={topic} />
          </div>
        ))}
      </div>

      {/* Scroll indicator dots */}
      {topics.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {topics.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === activeIndex ? "16px" : "6px",
                height: "6px",
                background:
                  i === activeIndex ? "var(--ts-accent)" : "var(--border)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestedTopicCard({ topic }: { topic: SuggestedTopic }) {
  const categoryColor = getCategoryColor(topic.categoryTag);
  const tldrPreview = topic.tldr
    ? topic.tldr.length > 100
      ? topic.tldr.slice(0, 97) + "..."
      : topic.tldr
    : null;

  return (
    <Link
      href={`/topic/${topic.slug}`}
      className="card-interactive flex flex-col rounded-xl overflow-hidden group"
      style={{
        background: "var(--ts-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Category color bar */}
      <div className="h-1 w-full" style={{ background: categoryColor }} />

      <div className="flex flex-col gap-2 p-4">
        {/* Title */}
        <p
          className="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-[var(--ts-accent-2)] transition-colors"
          style={{ fontFamily: headingFont }}
        >
          {topic.title}
        </p>

        {/* TLDR preview */}
        {tldrPreview && (
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: "var(--ts-text-2)" }}
          >
            {tldrPreview}
          </p>
        )}

        {/* Reading time */}
        <span
          className="flex items-center gap-1 text-[10px] mt-auto"
          style={{ color: "var(--ts-muted)" }}
        >
          <Clock size={10} />
          {topic.readTime} min read
        </span>
      </div>
    </Link>
  );
}
