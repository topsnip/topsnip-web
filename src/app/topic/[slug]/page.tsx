export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { decodeHtml } from "@/lib/utils/decode-html";
import { SiteNav } from "@/components/SiteNav";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReadTracker } from "./read-tracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: topic } = await supabase
    .from("topics")
    .select("title, slug")
    .eq("slug", slug)
    .single();

  if (!topic) return { title: "Topic Not Found — Topsnip" };

  return {
    title: `${topic.title} — Topsnip`,
    description: `Learn about ${topic.title} — explained simply, with sources.`,
    openGraph: {
      title: `${topic.title} — Topsnip`,
      description: `Learn about ${topic.title} — explained simply, with sources.`,
    },
  };
}

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

// ── Markdown-lite renderer (bold only) ──────────────────────────────────────

function renderMarkdown(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-white font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
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

  // ── Determine user role for content lookup ───────────────────────────────
  // [H5 fix] Require auth — RLS on topic_content requires authenticated role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/topic/${slug}`);
  }

  let contentRole = "general";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, plan")
      .eq("id", user.id)
      .single();

    // Pro users get role-specific content; free users always get general
    if (profile?.plan === "pro" && profile.role && profile.role !== "general") {
      contentRole = profile.role;
    }
  }

  // ── Fetch topic content (try user role first, fall back to general) ──────

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

  // ── Decode HTML entities (fixes double-encoded data from ingestion) ─────
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

  // ── Format published date ────────────────────────────────────────────────

  const publishedDate = topic.published_at
    ? new Date(topic.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const headingFont = "var(--font-heading), 'Instrument Serif', serif";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Read tracker (client component — records the read) */}
      {user && <ReadTracker userId={user.id} topicId={topic.id} />}

      {/* Top nav */}
      <SiteNav user={{ id: user.id, plan: "free" }} />

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="flex flex-col gap-8 pb-24">
          {/* ── Topic heading ─────────────────────────────────────────────── */}
          <div
            className="flex flex-col gap-1"
            style={{ animation: "fadeInUp 0.35s ease both" }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-muted)", fontFamily: headingFont }}
              >
                Learning brief
              </p>
              {topic.is_breaking && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: "var(--ts-error-12)",
                    color: "var(--error)",
                    border: "1px solid var(--ts-error-25)",
                  }}
                >
                  Breaking
                </span>
              )}
            </div>
            <h1
              className="text-xl font-bold text-white leading-snug"
              style={{ fontFamily: headingFont }}
            >
              {topic.title}
            </h1>
            {publishedDate && (
              <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                Published {publishedDate}
                {sources.length > 0 &&
                  ` \u00B7 Sourced from ${sources.length} sources`}
              </p>
            )}
          </div>

          {/* ── TL;DR ─────────────────────────────────────────────────────── */}
          <section
            className="rounded-xl border p-5 tldr-card"
            style={{
              background: "var(--ts-surface)",
              borderColor: "var(--border)",
              backdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.03)",
              animation: "fadeInUp 0.35s ease 0.06s both",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--ts-accent)", fontFamily: headingFont }}
            >
              TL;DR
            </p>
            <p className="text-base leading-relaxed text-white font-medium">
              {content.tldr}
            </p>
          </section>

          {/* ── What Happened ─────────────────────────────────────────────── */}
          {content.what_happened && (
            <section
              className="flex flex-col gap-3"
              style={{ animation: "fadeInUp 0.35s ease 0.12s both" }}
            >
              <h2
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-muted)", fontFamily: headingFont }}
              >
                What happened
              </h2>
              <div
                className="rounded-lg border p-5 text-sm leading-relaxed prose-content"
                style={{
                  background: "var(--ts-surface)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {content.what_happened
                  .split("\n\n")
                  .map((para: string, i: number) => (
                    <p key={i} className={i > 0 ? "mt-3" : ""}>
                      {renderMarkdown(para)}
                    </p>
                  ))}
              </div>
            </section>
          )}

          {/* ── So What? ──────────────────────────────────────────────────── */}
          {content.so_what && (
            <section
              className="flex flex-col gap-3"
              style={{ animation: "fadeInUp 0.35s ease 0.18s both" }}
            >
              <h2
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-accent)", fontFamily: headingFont }}
              >
                So what?
              </h2>
              <div
                className="rounded-lg border p-5 text-sm leading-relaxed"
                style={{
                  background: "var(--ts-accent-3)",
                  borderColor: "var(--ts-glow)",
                  color: "var(--foreground)",
                }}
              >
                {content.so_what
                  .split("\n\n")
                  .map((para: string, i: number) => (
                    <p key={i} className={i > 0 ? "mt-3" : ""}>
                      {renderMarkdown(para)}
                    </p>
                  ))}
              </div>
            </section>
          )}

          {/* ── Now What? ─────────────────────────────────────────────────── */}
          {content.now_what && (
            <section
              className="flex flex-col gap-3"
              style={{ animation: "fadeInUp 0.35s ease 0.24s both" }}
            >
              <h2
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-accent)", fontFamily: headingFont }}
              >
                Now what?
              </h2>
              <div
                className="rounded-lg border p-5 text-sm leading-relaxed"
                style={{
                  background: "var(--ts-success-3)",
                  borderColor: "var(--ts-success-12)",
                  color: "var(--foreground)",
                }}
              >
                {content.now_what.split("\n").map((line: string, i: number) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  const isBullet =
                    trimmed.startsWith("-") || trimmed.startsWith("\u2022");
                  const text = isBullet ? trimmed.slice(1).trim() : trimmed;
                  return (
                    <div
                      key={i}
                      className={`flex gap-2 ${i > 0 ? "mt-2" : ""}`}
                    >
                      {isBullet && (
                        <span
                          className="text-xs mt-1 flex-shrink-0"
                          style={{ color: "var(--success, #34d399)" }}
                        >
                          →
                        </span>
                      )}
                      <span>{renderMarkdown(text)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Sources ───────────────────────────────────────────────────── */}
          {sources.length > 0 && (
            <section
              className="flex flex-col gap-3"
              style={{ animation: "fadeInUp 0.35s ease 0.30s both" }}
            >
              <h2
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-muted)", fontFamily: headingFont }}
              >
                Sources
              </h2>
              <div className="flex flex-col gap-2">
                {sources
                  .filter((s) => s.url)
                  .map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 hover:border-[var(--ts-accent-30)] group cursor-pointer"
                      style={{
                        background: "var(--ts-surface)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
                        style={{
                          background: "var(--ts-accent-8)",
                          color: "var(--ts-accent)",
                          border: "1px solid var(--ts-glow)",
                        }}
                      >
                        {src.platform}
                      </span>
                      <span className="text-sm text-white truncate flex-1 group-hover:text-[var(--ts-accent-2)] transition-colors">
                        {src.title}
                      </span>
                      <ExternalLink
                        size={12}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
                        style={{ color: "var(--ts-text-2)" }}
                      />
                    </a>
                  ))}
              </div>
            </section>
          )}

          {/* ── Go Deeper (YouTube) ───────────────────────────────────────── */}
          {youtubeRecs && youtubeRecs.length > 0 && (
            <section
              className="flex flex-col gap-3"
              style={{ animation: "fadeInUp 0.35s ease 0.36s both" }}
            >
              <h2
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-muted)", fontFamily: headingFont }}
              >
                Go deeper
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {youtubeRecs.map((rec: YouTubeRec) => (
                  <a
                    key={rec.video_id}
                    href={`https://www.youtube.com/watch?v=${rec.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 rounded-xl border p-3 transition-all duration-200 hover:border-[var(--ts-accent-30)] group cursor-pointer"
                    style={{
                      background: "var(--ts-surface)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div
                      className="w-24 flex-shrink-0 rounded-lg overflow-hidden relative"
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
                          className="absolute bottom-1 right-1 rounded px-1 py-0.5 text-[10px] font-medium text-white"
                          style={{ background: "rgba(0,0,0,0.75)" }}
                        >
                          {rec.duration}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <p className="text-xs font-medium leading-snug text-white line-clamp-2 group-hover:text-[var(--ts-accent-2)] transition-colors">
                        {rec.title}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--ts-muted)" }}
                      >
                        {rec.channel_name}
                      </p>
                      {rec.reason && (
                        <p
                          className="text-xs mt-1 line-clamp-2"
                          style={{ color: "var(--ts-text-2)" }}
                        >
                          {rec.reason}
                        </p>
                      )}
                    </div>
                    <ExternalLink
                      size={12}
                      className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity"
                      style={{ color: "var(--ts-text-2)" }}
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── Back link ─────────────────────────────────────────────────── */}
          <Link
            href="/feed"
            className="flex items-center gap-1.5 text-xs self-start transition-opacity hover:opacity-80"
            style={{
              color: "var(--ts-text-2)",
              animation: "fadeInUp 0.35s ease 0.42s both",
            }}
          >
            <ArrowLeft size={12} />
            Back to feed
          </Link>
        </div>
      </main>
    </div>
  );
}
