export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { decodeHtml } from "@/lib/utils/decode-html";
import { FeedSearchBar } from "./feed-search-bar";
import { AuthNav } from "@/components/AuthNav";

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
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFeedDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );

  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  if (diffDays === 0) return `Today, ${formatted}`;
  if (diffDays === 1) return `Yesterday, ${formatted}`;
  return formatted;
}

const headingFont = "var(--font-heading), 'Space Grotesk', sans-serif";

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

  // Fetch today's feed via RPC
  const today = new Date().toISOString().split("T")[0];
  const { data: feedRows } = await supabase.rpc("get_user_feed", {
    p_user_id: user.id,
    p_date: today,
  });

  const isQuietDay = feedRows?.[0]?.is_quiet_day ?? false;
  const topicIds: string[] =
    feedRows?.map((row: { topic_id: string }) => row.topic_id) ?? [];

  // Fetch topics + content
  let feedTopics: FeedTopic[] = [];

  if (topicIds.length > 0) {
    const [topicsResult, contentResult] = await Promise.all([
      supabase
        .from("topics")
        .select("id, slug, title, trending_score, is_breaking, platform_count, published_at")
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

    // Merge and sort by trending score
    feedTopics = topics
      .map((t) => ({
        ...t,
        tldr: contentMap.get(t.id) ?? "",
      }))
      .sort((a, b) => b.trending_score - a.trending_score);
  }

  const feedDate = new Date();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* ── Background glow ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-glow"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(124,106,247,0.08) 0%, rgba(60,30,180,0.03) 40%, transparent 70%)",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <AuthNav />

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-28 pb-16 relative z-10">
        {/* Search bar (client component) */}
        <FeedSearchBar />

        {/* Date heading */}
        <div
          className="flex flex-col gap-1 mb-8"
          style={{ animation: "fadeInUp 0.35s ease both" }}
        >
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: headingFont }}
          >
            {isQuietDay ? "Nothing major today" : formatFeedDate(feedDate)}
          </h1>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            {isQuietDay
              ? "Quiet day in AI. The machines are resting."
              : feedTopics.length > 0
              ? `${feedTopics.length} topic${feedTopics.length === 1 ? "" : "s"} trending in AI today`
              : "Your personalized AI feed"}
          </p>
        </div>

        {/* ── Quiet Day State ───────────────────────────────────────────── */}
        {isQuietDay && (
          <div
            className="glass-card rounded-2xl p-8 flex flex-col items-center text-center gap-5"
            style={{ animation: "fadeInUp 0.35s ease 0.06s both" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(124,106,247,0.08)",
                border: "1px solid rgba(124,106,247,0.2)",
              }}
            >
              <span className="text-xl">~</span>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-white" style={{ fontFamily: headingFont }}>
                Quiet day in AI
              </p>
              <p className="text-sm max-w-md" style={{ color: "var(--ts-text-2)" }}>
                Nothing major happened today. Use the search bar to explore a topic you&apos;ve been
                meaning to learn about.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {["RAG pipelines", "AI agents", "Fine-tuning LLMs"].map((s) => (
                <Link
                  key={s}
                  href={`/s/${s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}?q=${encodeURIComponent(s)}`}
                  className="suggestion-chip rounded-full border px-3 py-1.5 text-xs font-medium"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State (no digest for today yet) ─────────────────────── */}
        {!isQuietDay && feedTopics.length === 0 && (
          <div
            className="glass-card rounded-2xl p-8 flex flex-col items-center text-center gap-5"
            style={{ animation: "fadeInUp 0.35s ease 0.06s both" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(124,106,247,0.08)",
                border: "1px solid rgba(124,106,247,0.2)",
              }}
            >
              <span className="text-xl" style={{ color: "var(--ts-accent)" }}>?</span>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-white" style={{ fontFamily: headingFont }}>
                No topics yet today
              </p>
              <p className="text-sm max-w-md" style={{ color: "var(--ts-text-2)" }}>
                Check back later — we&apos;re scanning sources. In the meantime, search any AI topic
                and get a structured explainer.
              </p>
            </div>
            <Link
              href="#"
              onClick={(e: React.MouseEvent) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                boxShadow: "0 0 20px rgba(124,106,247,0.3)",
              }}
            >
              Search a topic
            </Link>
          </div>
        )}

        {/* ── Topic Cards ───────────────────────────────────────────────── */}
        {feedTopics.length > 0 && (
          <div className="flex flex-col gap-4">
            {feedTopics.map((topic, i) => (
              <Link
                key={topic.id}
                href={`/topic/${topic.slug}`}
                className="glass-card rounded-2xl p-6 flex flex-col gap-4 cursor-pointer"
                style={{
                  animation: `fadeInUp 0.35s ease ${0.06 + i * 0.06}s both`,
                  textDecoration: "none",
                }}
              >
                {/* Header row: badges + title */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {topic.is_breaking && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: "rgba(248,113,113,0.12)",
                          color: "#F87171",
                          border: "1px solid rgba(248,113,113,0.25)",
                        }}
                      >
                        Breaking
                      </span>
                    )}
                    {topic.trending_score >= 70 && !topic.is_breaking && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: "rgba(124,106,247,0.08)",
                          color: "var(--ts-accent)",
                          border: "1px solid rgba(124,106,247,0.2)",
                        }}
                      >
                        Trending
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--ts-muted)" }}>
                      {topic.platform_count} source{topic.platform_count === 1 ? "" : "s"}
                    </span>
                  </div>

                  <h2
                    className="text-lg font-bold text-white leading-snug"
                    style={{ fontFamily: headingFont }}
                  >
                    {decodeHtml(topic.title)}
                  </h2>
                </div>

                {/* TL;DR */}
                {topic.tldr && (
                  <p
                    className="text-sm leading-relaxed line-clamp-3"
                    style={{ color: "var(--ts-text-2)" }}
                  >
                    {decodeHtml(topic.tldr)}
                  </p>
                )}

                {/* Read more indicator */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--ts-accent)" }}
                  >
                    Read full brief
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "var(--ts-accent)" }}
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-8 relative z-10"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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
