export const dynamic = "force-dynamic";

export const metadata = {
  title: "Knowledge Dashboard — Topsnip",
  description:
    "Track what you've learned, spot knowledge gaps, and stay current on AI.",
};

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/SiteNav";
import StatsBar from "./stats-bar";
import LevelBar from "./level-bar";
import ActivityTimeline from "./activity-timeline";
import LevelUpDetector from "./level-up-detector";

// ── Types ────────────────────────────────────────────────────────────────────

interface GamificationStats {
  xp: number;
  level: string;
  streak_count: number;
  longest_streak: number;
  xp_to_next_level: number;
  topics_read_today: number;
  total_topics_read: number;
  total_time_sec: number;
  recent_xp_events: {
    event_type: string;
    xp_amount: number;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
  daily_three_eligible: boolean;
}

interface Tag {
  slug: string;
  label: string;
}

interface KnowledgeSummary {
  topics_read: number;
  total_time_sec: number;
  tags_covered: string[];
  recent_reads: {
    title: string;
    slug: string;
    read_at: string;
  }[];
  unread_important: {
    title: string;
    slug: string;
    trending_score: number;
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

// ── Progress Ring SVG ────────────────────────────────────────────────────────

function ProgressRing({
  progress,
  size = 24,
}: {
  progress: number; // 0-100
  size?: number;
}) {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0 }}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--ts-accent, #E8734A)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "center",
          transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function KnowledgeDashboardPage() {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/knowledge");
  }

  // Profile + plan check
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, onboarding_complete")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  // ── Pro gate ────────────────────────────────────────────────────────────────
  if (profile.plan !== "pro") {
    return (
      <main className="min-h-screen px-4 relative">
        <SiteNav user={{ id: user.id, plan: profile.plan ?? "free" }} />
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6 pt-28 pb-16 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "var(--ts-accent-8)",
              border: "1px solid var(--ts-accent-20)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--ts-accent)" }}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: headingFont }}
          >
            Knowledge Dashboard
          </h1>
          <p
            className="text-sm leading-relaxed max-w-md"
            style={{ color: "var(--ts-text-2)" }}
          >
            Track what you&apos;ve learned, spot gaps in your AI knowledge, and
            build a reading streak. This is a Pro feature.
          </p>
          <Link
            href="/upgrade"
            className="btn-primary rounded-xl px-6 py-3 text-sm"
          >
            Upgrade to Pro
          </Link>
        </div>
      </main>
    );
  }

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const [statsResult, summaryResult, tagsResult] = await Promise.all([
    supabase.rpc("get_gamification_stats", { p_user_id: user.id }),
    supabase.rpc("get_knowledge_summary", { p_user_id: user.id }),
    supabase.from("tags").select("slug, label").order("label"),
  ]);

  const stats: GamificationStats = statsResult.data ?? {
    xp: 0,
    level: "curious",
    streak_count: 0,
    longest_streak: 0,
    xp_to_next_level: 200,
    topics_read_today: 0,
    total_topics_read: 0,
    total_time_sec: 0,
    recent_xp_events: [],
    daily_three_eligible: false,
  };

  const summary: KnowledgeSummary = summaryResult.data ?? {
    topics_read: 0,
    total_time_sec: 0,
    tags_covered: [],
    recent_reads: [],
    unread_important: [],
  };

  const allTags: Tag[] = tagsResult.data ?? [];
  const coveredSet = new Set(summary.tags_covered ?? []);
  const unreadTopics = (summary.unread_important ?? []).slice(0, 5);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-glow"
        style={{ background: "var(--ts-glow-radial)" }}
      />

      <SiteNav user={{ id: user.id, plan: profile.plan ?? "free" }} />

      {/* Level-up detector (client component) */}
      <LevelUpDetector level={stats.level} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-28 pb-16 relative z-10">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-1 mb-8"
          style={{ animation: "fadeInUp 0.35s ease both" }}
        >
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: headingFont }}
          >
            Your Knowledge
          </h1>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            What you&apos;ve learned, what you&apos;ve missed, and where to go
            next.
          </p>
        </div>

        {/* ── 1. Gamification Stats Bar ────────────────────────────────────── */}
        <div className="mb-4">
          <StatsBar
            streak={stats.streak_count}
            xp={stats.xp}
            level={stats.level}
            topicsRead={stats.total_topics_read}
            totalTimeSec={stats.total_time_sec}
          />
        </div>

        {/* ── 2. Level Progress Bar ───────────────────────────────────────── */}
        <div className="mb-10">
          <LevelBar level={stats.level} xp={stats.xp} />
        </div>

        {/* ── 3. Knowledge Map ────────────────────────────────────────────── */}
        <section
          className="mb-10"
          style={{ animation: "fadeInUp 0.35s ease 0.15s both" }}
        >
          <h2
            className="text-lg font-bold text-white mb-4"
            style={{ fontFamily: headingFont }}
          >
            Knowledge Map
          </h2>

          {allTags.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
              No tags available yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allTags.map((tag) => {
                const isCovered = coveredSet.has(tag.slug);
                // Placeholder progress — in future, replace with per-tag read/total counts
                const progress = isCovered ? 40 : 0;

                return (
                  <Link
                    key={tag.slug}
                    href={`/feed?tag=${tag.slug}`}
                    className="card-interactive flex items-center gap-3 rounded-xl px-4 py-3 group"
                    style={
                      isCovered
                        ? {
                            background: "var(--ts-accent-8)",
                            color: "var(--ts-accent)",
                            border: "1px solid var(--ts-accent-25)",
                          }
                        : {
                            background: "transparent",
                            color: "var(--ts-muted)",
                            border: "1px solid var(--border)",
                          }
                    }
                  >
                    <ProgressRing progress={progress} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate group-hover:opacity-80 transition-opacity">
                        {tag.label}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--ts-muted)" }}
                      >
                        {isCovered ? "Covered" : "Not started"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <p
            className="text-xs mt-3"
            style={{ color: "var(--ts-muted)" }}
          >
            {coveredSet.size} of {allTags.length} tags covered
          </p>
        </section>

        {/* ── 4. Recent Activity Timeline ─────────────────────────────────── */}
        <section
          className="mb-10"
          style={{ animation: "fadeInUp 0.35s ease 0.2s both" }}
        >
          <h2
            className="text-lg font-bold text-white mb-4"
            style={{ fontFamily: headingFont }}
          >
            Recent Activity
          </h2>
          <ActivityTimeline events={stats.recent_xp_events ?? []} />
        </section>

        {/* ── 5. Knowledge Gaps / Recommended Next ────────────────────────── */}
        {unreadTopics.length > 0 && (
          <section style={{ animation: "fadeInUp 0.35s ease 0.25s both" }}>
            <h2
              className="text-lg font-bold text-white mb-2"
              style={{ fontFamily: headingFont }}
            >
              Recommended Next
            </h2>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--ts-text-2)" }}
            >
              These are trending topics you haven&apos;t read yet.
            </p>

            <div className="flex flex-col gap-2">
              {unreadTopics.map((item, i) => (
                <Link
                  key={`${item.slug}-${i}`}
                  href={`/topic/${item.slug}`}
                  className="card-interactive flex items-center justify-between rounded-xl border px-4 py-3 group"
                  style={{
                    background: "var(--ts-surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <span className="text-sm font-medium text-white group-hover:text-[var(--ts-accent-2)] transition-colors line-clamp-1">
                    {item.title}
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs font-medium flex-shrink-0 ml-4"
                    style={{ color: "var(--ts-accent)" }}
                  >
                    Read
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
