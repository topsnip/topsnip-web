export const dynamic = "force-dynamic";

export const metadata = {
  title: "Knowledge Dashboard — Topsnip",
  description:
    "Track what you've learned, spot knowledge gaps, and stay current on AI.",
};

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthNav } from "@/components/AuthNav";

// ── Types ────────────────────────────────────────────────────────────────────

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

interface Tag {
  slug: string;
  label: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

function computeTimeSaved(topicsRead: number, totalTimeSec: number): string {
  // Each topic would take ~15 min to research; user spent totalTimeSec on topsnip.
  const wouldHaveTakenSec = topicsRead * 15 * 60;
  const savedSec = Math.max(0, wouldHaveTakenSec - totalTimeSec);
  const savedHours = savedSec / 3600;

  if (savedHours < 1) {
    const savedMin = Math.round(savedSec / 60);
    return `${savedMin} min`;
  }
  return `${savedHours.toFixed(1)} hrs`;
}

function formatReadDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
        <AuthNav />
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
            className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background:
                "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
              boxShadow: "0 0 20px var(--ts-accent-30)",
            }}
          >
            Upgrade to Pro
          </Link>
        </div>
      </main>
    );
  }

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const [summaryResult, streakResult, tagsResult] = await Promise.all([
    supabase.rpc("get_knowledge_summary", { p_user_id: user.id }),
    supabase.rpc("get_reading_streak", { p_user_id: user.id }),
    supabase.from("tags").select("slug, label").order("label"),
  ]);

  const summary: KnowledgeSummary = summaryResult.data ?? {
    topics_read: 0,
    total_time_sec: 0,
    tags_covered: [],
    recent_reads: [],
    unread_important: [],
  };

  const streak: number = streakResult.data ?? 0;
  const allTags: Tag[] = tagsResult.data ?? [];

  const coveredSet = new Set(summary.tags_covered ?? []);
  const timeSaved = computeTimeSaved(
    summary.topics_read,
    summary.total_time_sec,
  );

  // Count topics per tag — we don't have per-tag counts from the RPC,
  // so we show covered vs uncovered. If you add per-tag counts to the RPC later,
  // you can enhance this.
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

      <AuthNav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-28 pb-16 relative z-10">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-1 mb-10"
          style={{ animation: "fadeInUp 0.35s ease both" }}
        >
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: headingFont }}
          >
            Knowledge Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            What you&apos;ve learned, what you&apos;ve missed, and where to go
            next.
          </p>
        </div>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
          style={{ animation: "fadeInUp 0.35s ease 0.06s both" }}
        >
          <StatCard label="Topics read" value={String(summary.topics_read)} />
          <StatCard label="Time saved" value={timeSaved} />
          <StatCard label="Tags covered" value={String(coveredSet.size)} />
          <StatCard
            label="Day streak"
            value={String(streak)}
            accent={streak >= 3}
          />
        </div>

        {/* ── Knowledge Map ────────────────────────────────────────────────── */}
        <section
          className="mb-10"
          style={{ animation: "fadeInUp 0.35s ease 0.12s both" }}
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
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const isCovered = coveredSet.has(tag.slug);
                return (
                  <span
                    key={tag.slug}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                    style={
                      isCovered
                        ? {
                            background: "var(--ts-accent-12)",
                            color: "var(--ts-accent)",
                            border: "1px solid var(--ts-accent-25)",
                          }
                        : {
                            background: "var(--ts-surface)",
                            color: "var(--ts-muted)",
                            border: "1px solid var(--border)",
                          }
                    }
                  >
                    {tag.label}
                  </span>
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

        {/* ── Recent Reads ─────────────────────────────────────────────────── */}
        <section
          className="mb-10"
          style={{ animation: "fadeInUp 0.35s ease 0.18s both" }}
        >
          <h2
            className="text-lg font-bold text-white mb-4"
            style={{ fontFamily: headingFont }}
          >
            Recent Reads
          </h2>

          {summary.recent_reads.length === 0 ? (
            <div
              className="glass-card rounded-xl p-6 text-center"
            >
              <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                Nothing read yet. Head to your{" "}
                <Link
                  href="/feed"
                  className="font-medium"
                  style={{ color: "var(--ts-accent)" }}
                >
                  feed
                </Link>{" "}
                to start.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.recent_reads.map((item, i) => (
                <Link
                  key={`${item.slug}-${i}`}
                  href={`/topic/${item.slug}`}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all hover:border-[var(--ts-accent)] group"
                  style={{
                    background: "var(--ts-surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <span className="text-sm font-medium text-white group-hover:text-[var(--ts-accent-2)] transition-colors line-clamp-1">
                    {item.title}
                  </span>
                  <span
                    className="text-xs flex-shrink-0 ml-4"
                    style={{ color: "var(--ts-muted)" }}
                  >
                    {formatReadDate(item.read_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Knowledge Gaps ───────────────────────────────────────────────── */}
        {unreadTopics.length > 0 && (
          <section style={{ animation: "fadeInUp 0.35s ease 0.24s both" }}>
            <h2
              className="text-lg font-bold text-white mb-2"
              style={{ fontFamily: headingFont }}
            >
              Knowledge Gaps
            </h2>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--ts-text-2)" }}
            >
              You might want to catch up on these.
            </p>

            <div className="flex flex-col gap-2">
              {unreadTopics.map((item, i) => (
                <Link
                  key={`${item.slug}-${i}`}
                  href={`/topic/${item.slug}`}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 transition-all hover:border-[var(--ts-accent)] group"
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

// ── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-1"
      style={{
        background: "var(--ts-surface)",
        borderColor: accent ? "var(--ts-accent-25)" : "var(--border)",
        boxShadow: accent ? "0 0 12px var(--ts-accent-8)" : undefined,
      }}
    >
      <span
        className="text-2xl font-bold tracking-tight text-white"
        style={{
          fontFamily: "var(--font-heading), 'Instrument Serif', serif",
          color: accent ? "var(--ts-accent)" : undefined,
        }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: "var(--ts-muted)" }}>
        {label}
      </span>
    </div>
  );
}
