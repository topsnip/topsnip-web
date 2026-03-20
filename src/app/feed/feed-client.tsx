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

  return (
    <>
      {/* Top bar with search + stats */}
      <FeedTopBar />

      {/* Featured section */}
      {featuredTopic && (
        <FeaturedSection
          featuredTopic={featuredTopic}
          quickListTopics={quickListTopics}
        />
      )}

      {/* Category filter tabs */}
      <CategoryTabs onCategoryChange={handleCategoryChange} />

      {/* Topic card grid */}
      <TopicCardGrid topics={gridTopics} activeCategory={activeCategory} />

      {/* Evergreen strip */}
      {evergreenTopics.length > 0 && (
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
