"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FeedTopBar } from "./feed-top-bar";
import { FeaturedSection } from "./featured-section";
import { CategoryTabs } from "./category-tabs";
import { TopicCardGrid } from "./topic-card-grid";
import { EvergreenStrip } from "./evergreen-strip";
import { LearningDebt } from "./learning-debt";
import { NewTopicToast } from "./new-topic-toast";
import { FeedAutoRefresh } from "./feed-auto-refresh";
import type { TopicCardData } from "./topic-card";

// ── Props ──────────────────────────────────────────────────────────────────

interface FeedClientProps {
  featuredTopic: TopicCardData | null;
  quickListTopics: TopicCardData[];
  gridTopics: TopicCardData[];
  evergreenTopics: { id: string; slug: string; title: string; subtitle: string }[];
  lastPublishedAt: string | null;
  userId: string;
  isPro: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export function FeedClient({
  featuredTopic,
  quickListTopics,
  gridTopics,
  evergreenTopics,
  lastPublishedAt,
  userId,
  isPro,
}: FeedClientProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("all");
  const [newTopicCount, setNewTopicCount] = useState(0);

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  const handleNewTopics = useCallback((count: number) => {
    setNewTopicCount(count);
  }, []);

  const handleRefresh = useCallback(() => {
    setNewTopicCount(0);
    router.refresh();
  }, [router]);

  const handleDismissToast = useCallback(() => {
    setNewTopicCount(0);
  }, []);

  const isEmpty = !featuredTopic && quickListTopics.length === 0 && gridTopics.length === 0;

  return (
    <>
      {/* Top bar with search + stats */}
      <FeedTopBar />

      {/* First-visit welcome state */}
      {isEmpty && (
        <div className="flex flex-col gap-6 py-8">
          <div className="flex flex-col gap-2">
            <h2
              className="text-lg font-bold text-white"
              style={{ fontFamily: "var(--font-heading), 'Instrument Serif', serif" }}
            >
              Welcome to TopSnip.
            </h2>
            <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
              Here are some fundamentals to get started.
            </p>
          </div>
          {evergreenTopics.length > 0 && (
            <EvergreenStrip topics={evergreenTopics} />
          )}
        </div>
      )}

      {/* Featured section */}
      {!isEmpty && featuredTopic && (
        <FeaturedSection
          featuredTopic={featuredTopic}
          quickListTopics={quickListTopics}
        />
      )}

      {/* Category filter tabs */}
      {!isEmpty && <CategoryTabs onCategoryChange={handleCategoryChange} />}

      {/* Topic card grid */}
      {!isEmpty && <TopicCardGrid topics={gridTopics} activeCategory={activeCategory} />}

      {/* Evergreen strip */}
      {!isEmpty && evergreenTopics.length > 0 && (
        <div className="mt-10">
          <EvergreenStrip topics={evergreenTopics} />
        </div>
      )}

      {/* Learning Debt (Pro only) */}
      {isPro && <LearningDebt userId={userId} isPro={isPro} />}

      {/* New topic toast */}
      <NewTopicToast
        count={newTopicCount}
        onRefresh={handleRefresh}
        onDismiss={handleDismissToast}
      />

      {/* Auto-refresh poller (invisible) */}
      <FeedAutoRefresh
        lastPublishedAt={lastPublishedAt}
        onNewTopics={handleNewTopics}
      />
    </>
  );
}
