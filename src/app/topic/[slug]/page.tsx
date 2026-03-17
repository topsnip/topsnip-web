export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeHtml } from "@/lib/utils/decode-html";
import { SiteNav } from "@/components/SiteNav";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReadTracker } from "./read-tracker";
import { ScrollProgress } from "./scroll-progress";
import { MarkUnderstood } from "./mark-understood";
import { ShareButton } from "./share-button";
import { LearningBrief } from "@/components/learning-brief/LearningBrief";

// ── Types ──────────────────────────────────────────────────────────────────

interface Source {
  title: string;
  url: string;
  platform: string;
}

interface YouTubeRec {
  id: string;
  video_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string | null;
  duration: string | null;
  reason: string | null;
  position: number;
}

interface RelatedTopic {
  id: string;
  slug: string;
  title: string;
  tldr: string | null;
  source_count: number;
}

// ── Metadata (OG tags for sharing) ─────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("id, title, slug")
    .eq("slug", slug)
    .single();

  if (!topic) return { title: "Topic Not Found — TopSnip" };

  // Fetch TL;DR for description
  const { data: content } = await supabase
    .from("topic_content")
    .select("tldr")
    .eq("topic_id", topic.id)
    .eq("role", "general")
    .single();

  const description = content?.tldr
    ? decodeHtml(content.tldr).slice(0, 160)
    : `Learn about ${topic.title} — explained simply, with sources.`;

  return {
    title: `${topic.title} — TopSnip`,
    description,
    openGraph: {
      title: `${topic.title} — TopSnip`,
      description,
      type: "article",
      siteName: "TopSnip",
    },
    twitter: {
      card: "summary",
      title: `${topic.title} — TopSnip`,
      description,
    },
  };
}

// ── Helper: estimate reading time ──────────────────────────────────────────

function estimateReadTime(
  tldr: string,
  whatHappened: string,
  soWhat: string,
  nowWhat: string,
): number {
  const totalWords = [tldr, whatHappened, soWhat, nowWhat]
    .filter(Boolean)
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.ceil(totalWords / 200));
}

// ── Helper: get unique platforms from sources ──────────────────────────────

function getUniquePlatforms(sources: Source[]): string[] {
  const platforms = new Set(
    sources.map((s) => s.platform).filter(Boolean),
  );
  return Array.from(platforms).slice(0, 5);
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // ── Fetch topic by slug ──────────────────────────────────────────────────

  const { data: topic } = await supabase
    .from("topics")
    .select(
      "id, slug, title, status, trending_score, is_breaking, published_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!topic) notFound();

  // ── Check auth — NO redirect for anonymous users ─────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // ── Determine content role ───────────────────────────────────────────────

  let contentRole = "general";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, plan")
      .eq("id", user.id)
      .single();

    if (profile?.plan === "pro" && profile.role && profile.role !== "general") {
      contentRole = profile.role;
    }
  }

  // ── Fetch topic content (role-specific for auth, general for anon) ──────

  let { data: content } = await supabase
    .from("topic_content")
    .select(
      "id, topic_id, role, tldr, what_happened, so_what, now_what, sources_json",
    )
    .eq("topic_id", topic.id)
    .eq("role", contentRole)
    .single();

  // Fall back to general if role-specific content not found
  if (!content && contentRole !== "general") {
    const { data: fallback } = await supabase
      .from("topic_content")
      .select(
        "id, topic_id, role, tldr, what_happened, so_what, now_what, sources_json",
      )
      .eq("topic_id", topic.id)
      .eq("role", "general")
      .single();
    content = fallback;
  }

  if (!content) notFound();

  // ── Decode HTML entities ─────────────────────────────────────────────────

  topic.title = decodeHtml(topic.title);
  content.tldr = decodeHtml(content.tldr);
  content.what_happened = decodeHtml(content.what_happened);
  content.so_what = decodeHtml(content.so_what);
  content.now_what = decodeHtml(content.now_what);

  // ── Fetch YouTube recommendations ────────────────────────────────────────

  const { data: youtubeRecs } = await supabase
    .from("youtube_recommendations")
    .select(
      "id, video_id, title, channel_name, thumbnail_url, duration, reason, position",
    )
    .eq("topic_content_id", content.id)
    .order("position", { ascending: true });

  // ── Parse sources ────────────────────────────────────────────────────────

  const sources: Source[] = Array.isArray(content.sources_json)
    ? (content.sources_json as Source[])
    : [];

  // ── Compute metadata ─────────────────────────────────────────────────────

  const publishedDate = topic.published_at
    ? new Date(topic.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const readTime = estimateReadTime(
    content.tldr,
    content.what_happened,
    content.so_what,
    content.now_what,
  );

  const platforms = getUniquePlatforms(sources);
  const isTrending = (topic.trending_score ?? 0) > 3;

  // ── Fetch related topics ─────────────────────────────────────────────────

  const { data: relatedTopicsRaw } = await supabase
    .from("topics")
    .select("id, slug, title, published_at")
    .eq("status", "published")
    .neq("id", topic.id)
    .order("published_at", { ascending: false })
    .limit(4);

  // Get TL;DR and source count for related topics
  const relatedTopics: RelatedTopic[] = [];
  if (relatedTopicsRaw && relatedTopicsRaw.length > 0) {
    for (const rt of relatedTopicsRaw) {
      const { data: rtContent } = await supabase
        .from("topic_content")
        .select("tldr, sources_json")
        .eq("topic_id", rt.id)
        .eq("role", "general")
        .single();

      relatedTopics.push({
        id: rt.id,
        slug: rt.slug,
        title: decodeHtml(rt.title),
        tldr: rtContent?.tldr ? decodeHtml(rtContent.tldr) : null,
        source_count: Array.isArray(rtContent?.sources_json)
          ? rtContent.sources_json.length
          : 0,
      });
    }
  }

  // ── Map YouTube recs to LearningBrief format ─────────────────────────────

  const briefYoutubeRecs = (youtubeRecs ?? []).map((rec: YouTubeRec) => ({
    title: rec.title,
    videoId: rec.video_id,
    channelName: rec.channel_name,
    thumbnail: rec.thumbnail_url ?? undefined,
  }));

  // ── Map sources to LearningBrief format ──────────────────────────────────

  const briefSources = sources.map((s) => ({
    title: s.title,
    url: s.url,
    platform: s.platform,
  }));

  const headingFont = "var(--font-heading), 'Instrument Serif', serif";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Scroll progress bar */}
      <ScrollProgress />

      {/* Read tracker (client component — records the read, auth only) */}
      {user && <ReadTracker userId={user.id} topicId={topic.id} />}

      {/* Top nav */}
      <SiteNav user={user ? { id: user.id, plan: "free" } : null} />

      {/* Main content area */}
      <main className="flex-1 content-container-wide py-8" style={{ paddingTop: "5rem" }}>
        {/* ── Topic Header ─────────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-3 mb-8"
          style={{ animation: "fadeInUp 0.35s ease both" }}
        >
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--ts-muted)", fontFamily: headingFont }}
            >
              Learning brief
            </p>
            {topic.is_breaking && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: "var(--ts-error-12)",
                  color: "var(--error)",
                  border: "1px solid var(--ts-error-25)",
                  animation: "badgePulse 2s ease-in-out infinite",
                }}
              >
                Breaking
              </span>
            )}
            {isTrending && !topic.is_breaking && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background: "var(--ts-accent-10)",
                  color: "var(--ts-accent)",
                  border: "1px solid var(--ts-accent-20)",
                  animation: "badgePulse 2s ease-in-out infinite",
                }}
              >
                Trending
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            className="text-white leading-snug"
            style={{
              fontFamily: headingFont,
              fontSize: "var(--text-3xl)",
            }}
          >
            {topic.title}
          </h1>

          {/* Metadata row */}
          <div
            className="flex items-center gap-3 flex-wrap text-xs"
            style={{ color: "var(--ts-text-2)" }}
          >
            {publishedDate && <span>{publishedDate}</span>}

            {sources.length > 0 && (
              <>
                <span style={{ color: "var(--ts-muted)" }}>&middot;</span>
                <span
                  className="rounded-full px-2 py-0.5 font-medium"
                  style={{
                    background: "var(--ts-accent-8)",
                    color: "var(--ts-accent)",
                    border: "1px solid var(--ts-accent-12)",
                  }}
                >
                  {sources.length} source{sources.length !== 1 ? "s" : ""}
                </span>
              </>
            )}

            {platforms.length > 0 && (
              <>
                <span style={{ color: "var(--ts-muted)" }}>&middot;</span>
                <div className="flex items-center gap-1.5">
                  {platforms.map((p) => (
                    <span
                      key={p}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: "var(--ts-surface)",
                        color: "var(--ts-text-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </>
            )}

            <span style={{ color: "var(--ts-muted)" }}>&middot;</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {readTime} min read
            </span>
          </div>

          {/* AI content disclosure */}
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "var(--ts-muted)" }}
          >
            Generated by AI from multiple sources. Always verify critical
            information.
          </p>
        </div>

        {/* ── Two-column layout ───────────────────────────────────────── */}
        <div className="two-column">
          {/* ── Main column (brief content) ──────────────────────────── */}
          <div
            className="flex flex-col gap-0"
            style={{ animation: "fadeInUp 0.35s ease 0.06s both" }}
          >
            <LearningBrief
              tldr={content.tldr}
              whatHappened={content.what_happened}
              soWhat={content.so_what}
              nowWhat={content.now_what}
              sources={briefSources}
              youtubeRecs={[]} /* YouTube recs moved to sidebar on desktop */
              animated={true}
              isBlurred={!isAuthenticated}
              redirectPath={`/topic/${slug}`}
              onMarkUnderstood={undefined} /* Mark understood is in sidebar */
            />

            {/* Mobile-only: YouTube recs inline (hidden on desktop) */}
            {briefYoutubeRecs.length > 0 && (
              <div
                className="lg:hidden mt-6"
                style={{ animation: "fadeInUp 0.35s ease 0.36s both" }}
              >
                <h3
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{
                    color: "var(--ts-muted)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  Go Deeper
                </h3>
                <div className="flex flex-col gap-2">
                  {(youtubeRecs ?? []).map((rec: YouTubeRec) => (
                    <a
                      key={rec.video_id}
                      href={`https://www.youtube.com/watch?v=${rec.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-interactive flex gap-3 rounded-xl border p-3 group"
                      style={{
                        background: "var(--ts-surface)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div
                        className="w-20 flex-shrink-0 rounded-lg overflow-hidden relative"
                        style={{
                          aspectRatio: "16/9",
                          background: "var(--ts-surface-2)",
                        }}
                      >
                        {rec.thumbnail_url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={rec.thumbnail_url}
                            alt={rec.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug text-white line-clamp-2">
                          {rec.title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--ts-muted)" }}
                        >
                          {rec.channel_name}
                        </p>
                      </div>
                      <ExternalLink
                        size={12}
                        className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity"
                        style={{ color: "var(--ts-text-2)" }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile-only: Mark as understood (hidden on desktop) */}
            {isAuthenticated && (
              <div className="lg:hidden mt-6">
                <MarkUnderstood topicId={topic.id} />
              </div>
            )}
          </div>

          {/* ── Sidebar (desktop only) ───────────────────────────────── */}
          <aside
            className="hidden lg:flex flex-col gap-5"
            style={{
              position: "sticky",
              top: "80px",
              maxHeight: "calc(100vh - 96px)",
              overflowY: "auto",
              animation: "fadeInUp 0.35s ease 0.18s both",
            }}
          >
            {/* YouTube Recs */}
            {(youtubeRecs ?? []).length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{
                    color: "var(--ts-muted)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  Go Deeper
                </p>
                <div className="flex flex-col gap-2">
                  {(youtubeRecs ?? []).map((rec: YouTubeRec) => (
                    <a
                      key={rec.video_id}
                      href={`https://www.youtube.com/watch?v=${rec.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-interactive flex gap-2.5 rounded-lg p-2 group"
                    >
                      <div
                        className="w-16 flex-shrink-0 rounded-md overflow-hidden relative"
                        style={{
                          aspectRatio: "16/9",
                          background: "var(--ts-surface-2)",
                        }}
                      >
                        {rec.thumbnail_url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={rec.thumbnail_url}
                            alt={rec.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        {rec.duration && (
                          <span
                            className="absolute bottom-0.5 right-0.5 rounded px-1 py-0.5 text-[9px] font-medium text-white"
                            style={{ background: "rgba(0,0,0,0.75)" }}
                          >
                            {rec.duration}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-[11px] font-medium leading-snug text-white line-clamp-2 group-hover:text-[var(--ts-accent-2)] transition-colors">
                          {rec.title}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--ts-muted)" }}
                        >
                          {rec.channel_name}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Related topics */}
            {relatedTopics.length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{
                    color: "var(--ts-muted)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  Related
                </p>
                <div className="flex flex-col gap-2">
                  {relatedTopics.slice(0, 3).map((rt) => (
                    <Link
                      key={rt.id}
                      href={`/topic/${rt.slug}`}
                      className="card-interactive flex flex-col gap-1 rounded-lg p-2 group"
                    >
                      <p className="text-xs font-medium text-white leading-snug line-clamp-2 group-hover:text-[var(--ts-accent-2)] transition-colors">
                        {rt.title}
                      </p>
                      {rt.source_count > 0 && (
                        <p
                          className="text-[10px]"
                          style={{ color: "var(--ts-muted)" }}
                        >
                          {rt.source_count} source
                          {rt.source_count !== 1 ? "s" : ""}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Mark as Understood + Share */}
            {isAuthenticated && (
              <div className="flex flex-col gap-2">
                <MarkUnderstood topicId={topic.id} />
                <ShareButton />
              </div>
            )}

            {/* Anonymous: share + sign up CTA */}
            {!isAuthenticated && (
              <div className="flex flex-col gap-2">
                <ShareButton />
                <Link
                  href={`/auth/login?redirect=/topic/${slug}`}
                  className="btn-primary flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm"
                >
                  Sign up to learn more
                </Link>
              </div>
            )}
          </aside>
        </div>

        {/* ── Keep Learning (Related Topics — full width) ─────────────── */}
        {relatedTopics.length > 0 && (
          <section
            className="mt-12 mb-8"
            style={{ animation: "fadeInUp 0.35s ease 0.42s both" }}
          >
            <h2
              className="text-white mb-5"
              style={{
                fontFamily: headingFont,
                fontSize: "var(--text-xl)",
              }}
            >
              Keep learning
            </h2>

            {/* Desktop: grid, Mobile: horizontal scroll */}
            <div
              className="hidden sm:grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(relatedTopics.length, 4)}, 1fr)`,
              }}
            >
              {relatedTopics.map((rt) => (
                <RelatedTopicCard key={rt.id} topic={rt} />
              ))}
            </div>

            <div
              className="sm:hidden flex gap-3 overflow-x-auto pb-2"
              style={{
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
              }}
            >
              {relatedTopics.map((rt) => (
                <div
                  key={rt.id}
                  style={{ minWidth: "260px", scrollSnapAlign: "start" }}
                >
                  <RelatedTopicCard topic={rt} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Back to feed link ───────────────────────────────────────── */}
        <div
          className="pb-12"
          style={{ animation: "fadeInUp 0.35s ease 0.48s both" }}
        >
          <Link
            href="/feed"
            className="btn-ghost flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft size={12} />
            Back to feed
          </Link>
        </div>
      </main>

      {/* Badge pulse animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes badgePulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.03); }
            }
          `,
        }}
      />
    </div>
  );
}

// ── Related Topic Card ─────────────────────────────────────────────────────

function RelatedTopicCard({ topic }: { topic: RelatedTopic }) {
  const tldrPreview = topic.tldr
    ? topic.tldr.split(".").slice(0, 1).join(".") + "."
    : null;

  return (
    <Link
      href={`/topic/${topic.slug}`}
      className="card-interactive flex flex-col gap-2 rounded-xl p-4 group"
      style={{
        background: "var(--ts-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-[var(--ts-accent-2)] transition-colors"
        style={{ fontFamily: "var(--font-heading), 'Instrument Serif', serif" }}
      >
        {topic.title}
      </p>
      {tldrPreview && (
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: "var(--ts-text-2)" }}
        >
          {tldrPreview}
        </p>
      )}
      {topic.source_count > 0 && (
        <span
          className="self-start rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: "var(--ts-accent-8)",
            color: "var(--ts-accent)",
          }}
        >
          {topic.source_count} source{topic.source_count !== 1 ? "s" : ""}
        </span>
      )}
    </Link>
  );
}
