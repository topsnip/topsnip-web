export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Feed — Topsnip",
  description: "Today's trending AI topics, curated and explained for you.",
};

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeedSearchBar } from "./feed-search-bar";
import { SiteNav } from "@/components/SiteNav";
import { LearningDebt } from "./learning-debt";
import { TrendingSuggestions, QuickSuggestions, QuietDayState } from "./trending-suggestions";
import { FeedGreeting } from "./feed-greeting";
import { TopicCardList } from "./topic-card";
import type { TopicCardData } from "./topic-card";
import { SinceLastVisit } from "./since-last-visit";

// ── "Since you were last here" types ────────────────────────────────────────

interface SinceLastVisitTopic {
  topic_id: string;
  topic_title: string;
  topic_slug: string;
  tldr: string;
  published_at: string;
  trending_score: number;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  slug: string;
  title: string;
  trending_score: number;
  is_breaking: boolean;
  platform_count: number;
  published_at: string | null;
}

interface TopicContent {
  topic_id: string;
  tldr: string;
}

interface FeedTopic extends Topic {
  tldr: string;
  is_read: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

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

  // Fetch "since last visit" topics + update last_seen_at in parallel
  const [sinceLastVisitResult] = await Promise.all([
    supabase.rpc("get_since_last_visit", { p_user_id: user.id }),
    supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id),
  ]);

  const sinceLastVisitTopics: SinceLastVisitTopic[] =
    sinceLastVisitResult.data ?? [];

  // Fetch today's feed via RPC
  const today = new Date().toISOString().split("T")[0];
  const { data: feedRows } = await supabase.rpc("get_user_feed", {
    p_user_id: user.id,
    p_date: today,
  });

  const isQuietDay = feedRows?.[0]?.is_quiet_day ?? false;
  const topicIds: string[] =
    feedRows?.map((row: { topic_id: string }) => row.topic_id) ?? [];
  const readSet = new Set(
    feedRows
      ?.filter((row: { is_read: boolean }) => row.is_read)
      .map((row: { topic_id: string }) => row.topic_id) ?? [],
  );

  // Fetch topics + content
  let feedTopics: FeedTopic[] = [];

  if (topicIds.length > 0) {
    const [topicsResult, contentResult] = await Promise.all([
      supabase
        .from("topics")
        .select(
          "id, slug, title, trending_score, is_breaking, platform_count, published_at",
        )
        .in("id", topicIds),
      supabase
        .from("topic_content")
        .select("topic_id, tldr")
        .in("topic_id", topicIds)
        .eq("role", profile.plan === "pro" ? profile.role : "general"),
    ]);

    const topics: Topic[] = topicsResult.data ?? [];
    const content: TopicContent[] = contentResult.data ?? [];
    const contentMap = new Map(content.map((c) => [c.topic_id, c.tldr]));

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
    feedTopics = topicIds
      .filter((id) => topicMap.has(id))
      .map((id) => {
        const t = topicMap.get(id)!;
        return {
          ...t,
          tldr: contentMap.get(t.id) ?? "",
          is_read: readSet.has(t.id),
        };
      });
  }

  // Map feed topics to TopicCardData shape
  const topicCardData: TopicCardData[] = feedTopics.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    tldr: t.tldr,
    trending_score: t.trending_score,
    is_breaking: t.is_breaking,
    platform_count: t.platform_count,
    published_at: t.published_at,
    is_read: t.is_read,
  }));

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* ── Background glow ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-glow"
        style={{
          background: "var(--ts-glow-radial)",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNav user={{ id: user.id, plan: profile.plan ?? "free" }} />

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 content-container pt-28 pb-16 relative z-10">
        {/* Search bar (client component) with pulse dot */}
        <div className="feed-search-container relative">
          <FeedSearchBar />
        </div>

        {/* Quick suggestion chips below search */}
        <QuickSuggestions />

        {/* Time-of-day greeting */}
        <FeedGreeting
          email={user.email}
          isQuietDay={isQuietDay}
          topicCount={feedTopics.length}
        />

        {/* ── Quiet Day State ───────────────────────────────────────────── */}
        {isQuietDay && (
          <QuietDayState showLearningDebt={isPro} />
        )}

        {/* ── Empty State (no digest for today yet) ─────────────────────── */}
        {!isQuietDay && feedTopics.length === 0 && (
          <div
            className="empty-state-gradient rounded-2xl p-8 flex flex-col items-center text-center gap-6"
            style={{ animation: "fadeInUp 0.35s ease 0.06s both" }}
          >
            <TrendingSuggestions />
          </div>
        )}

        {/* ── Since You Were Last Here ─────────────────────────────────── */}
        <SinceLastVisit topics={sinceLastVisitTopics} />

        {/* ── Topic Cards ───────────────────────────────────────────────── */}
        {feedTopics.length > 0 && (
          <TopicCardList topics={topicCardData} />
        )}

        {/* ── Learning Debt (Pro only) ────────────────────────────────── */}
        {isPro && <LearningDebt userId={user.id} isPro={isPro} />}
      </main>

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
