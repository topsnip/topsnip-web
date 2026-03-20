export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Feed — TopSnip",
  description:
    "Today's trending AI topics, curated and explained for you. Updated daily from 7+ platforms.",
  openGraph: {
    title: "Your Feed — TopSnip",
    description:
      "Today's trending AI topics, curated and explained for you. Updated daily from 7+ platforms.",
  },
};

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/SiteNav";
import { mapTopicToCategory } from "@/lib/utils/category-mapper";
import { headingFont } from "@/lib/constants";
import type { TopicCardData } from "./topic-card";
import { FeedClient } from "./feed-client";

// ── Types ────────────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  slug: string;
  title: string;
  trending_score: number;
  is_breaking: boolean;
  is_evergreen: boolean;
  platform_count: number;
  published_at: string | null;
}

interface TopicContent {
  topic_id: string;
  tldr: string;
}

interface FeedRow {
  topic_id: string;
  is_read: boolean;
  is_new: boolean;
  featured: boolean;
  personal_score: number;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function FeedPage() {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Profile check — onboarding gate
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, plan, onboarding_complete")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  const isPro = profile.plan === "pro";

  // Fetch feed via v2 RPC + update last_seen_at in parallel
  const [feedResult] = await Promise.all([
    supabase.rpc("get_user_feed_v2", { p_user_id: user.id }),
    supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id),
  ]);

  const feedRows: FeedRow[] = feedResult.data ?? [];
  const topicIds = feedRows.map((row) => row.topic_id);
  const readSet = new Set(
    feedRows.filter((row) => row.is_read).map((row) => row.topic_id),
  );
  const newSet = new Set(
    feedRows.filter((row) => row.is_new).map((row) => row.topic_id),
  );
  const featuredId = feedRows.find((row) => row.featured)?.topic_id ?? null;

  // Fetch topics + content in parallel
  let allTopicCards: TopicCardData[] = [];
  let lastPublishedAt: string | null = null;
  const evergreenTopicIds = new Set<string>();

  if (topicIds.length > 0) {
    const [topicsResult, contentResult] = await Promise.all([
      supabase
        .from("topics")
        .select(
          "id, slug, title, trending_score, is_breaking, is_evergreen, platform_count, published_at",
        )
        .in("id", topicIds),
      supabase
        .from("topic_content")
        .select("topic_id, tldr")
        .in("topic_id", topicIds)
        .eq("role", isPro ? profile.role : "general"),
    ]);

    const topics: Topic[] = topicsResult.data ?? [];
    const content: TopicContent[] = contentResult.data ?? [];
    const contentMap = new Map(content.map((c) => [c.topic_id, c.tldr]));

    // Track evergreen topics from already-fetched data (no extra DB query)
    for (const t of topics) {
      if (t.is_evergreen) evergreenTopicIds.add(t.id);
    }

    // If no role-specific content, fall back to general
    if (content.length === 0 && profile.role !== "general") {
      const { data: generalContent } = await supabase
        .from("topic_content")
        .select("topic_id, tldr")
        .in("topic_id", topicIds)
        .eq("role", "general");

      (generalContent ?? []).forEach((c: TopicContent) => {
        contentMap.set(c.topic_id, c.tldr);
      });
    }

    // Merge topics, preserving the personalized order from the RPC
    const topicMap = new Map(topics.map((t) => [t.id, t]));
    allTopicCards = topicIds
      .filter((id) => topicMap.has(id))
      .map((id) => {
        const t = topicMap.get(id)!;
        return {
          id: t.id,
          slug: t.slug,
          title: t.title,
          tldr: contentMap.get(t.id) ?? "",
          trending_score: t.trending_score,
          is_breaking: t.is_breaking,
          platform_count: t.platform_count,
          published_at: t.published_at,
          is_read: readSet.has(t.id),
          is_new: newSet.has(t.id),
          category: mapTopicToCategory(t.title),
        };
      });

    // Determine last published_at for auto-refresh polling
    const publishedDates = topics
      .map((t) => t.published_at)
      .filter((d): d is string => d !== null)
      .sort()
      .reverse();
    lastPublishedAt = publishedDates[0] ?? null;
  }

  // Separate: featured, quick list, grid topics, evergreen topics
  const featuredTopic = allTopicCards.find((t) => t.id === featuredId) ?? allTopicCards[0] ?? null;
  const nonFeaturedTopics = allTopicCards.filter((t) => t.id !== featuredTopic?.id);
  const quickListTopics = nonFeaturedTopics.slice(0, 3);
  const gridTopics = nonFeaturedTopics.slice(3);

  // Evergreen topics for the strip (use data already fetched — no extra query)
  const evergreenTopics = allTopicCards
    .filter((t) => evergreenTopicIds.has(t.id))
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      subtitle: t.tldr ? t.tldr.slice(0, 60) + (t.tldr.length > 60 ? "..." : "") : "",
    }));

  // Filter grid topics to exclude evergreen (they show in the strip instead)
  const regularGridTopics = gridTopics.filter((t) => !evergreenTopicIds.has(t.id));

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: "var(--background)" }}
    >
      {/* ── Background glow ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-glow"
        style={{
          background: "var(--ts-glow-radial)",
        }}
      />

      {/* Background gradient for depth */}
      <div className="absolute top-0 left-0 right-0 h-96 pointer-events-none" aria-hidden="true"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(232,115,74,0.06) 0%, transparent 70%)" }} />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNav user={{ id: user.id, plan: profile.plan ?? "free" }} />

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-[900px] mx-auto px-[var(--space-page-x)] pt-28 pb-16 relative z-10">
        <FeedClient
          featuredTopic={featuredTopic}
          quickListTopics={quickListTopics}
          gridTopics={regularGridTopics}
          evergreenTopics={evergreenTopics}
          lastPublishedAt={lastPublishedAt}
          userId={user.id}
          isPro={isPro}
        />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-8 relative z-10"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="content-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/feed"
            className="text-base font-bold tracking-tight text-white"
            style={{ fontFamily: headingFont }}
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-xs font-medium transition-colors hover:text-white"
              style={{ color: "var(--ts-muted)" }}
            >
              About
            </Link>
            <Link
              href="/upgrade"
              className="text-xs font-medium transition-colors hover:text-white"
              style={{ color: "var(--ts-muted)" }}
            >
              Pricing
            </Link>
          </div>
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            &copy; {new Date().getFullYear()} Topsnip
          </p>
        </div>
      </footer>
    </div>
  );
}
