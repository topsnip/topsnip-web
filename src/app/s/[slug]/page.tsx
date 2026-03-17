"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, ArrowLeft, ExternalLink, ChevronDown } from "lucide-react";
import { SignUpGate } from "@/components/SignUpGate";
import {
  guestLimitReached,
  incrementGuestSearchCount,
} from "@/lib/search-limits";
import { decodeHtml } from "@/lib/utils/decode-html";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

interface YouTubeRec {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  reason?: string;
  url: string;
}

interface SourceAttribution {
  title: string;
  url: string;
  platform: string;
}

interface SearchResult {
  query: string;
  tldr: string;
  what_happened: string;
  so_what: string;
  now_what: string;
  sources: SourceAttribution[];
  youtube_recs: YouTubeRec[];
  source_type: "pre_generated" | "on_demand";
}

// ── Loading stages ─────────────────────────────────────────────────────────

const LOADING_STAGES = [
  "Searching sources...",
  "Gathering official announcements...",
  "Cross-referencing platforms...",
  "Generating your learning brief...",
];

// ── Skeleton component ────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: "var(--ts-surface-2)" }}
    />
  );
}

function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div
        className="rounded-xl border p-5 tldr-card"
        style={{
          borderColor: "var(--border)",
          background: "var(--ts-surface)",
        }}
      >
        <Skeleton className="h-3 w-12 mb-3" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ── Markdown-lite renderer (bold only) ──────────────────────────────────────

function renderMarkdown(text: string) {
  // Split on **bold** markers and render
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

// ── Component ──────────────────────────────────────────────────────────────

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = searchParams.get("q") ?? "";
  const currentPath = pathname + "?" + searchParams.toString();

  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<"guest" | "free" | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [searchInput, setSearchInput] = useState(query);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const stageInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    if (guestLimitReached()) {
      setGate("guest");
      setLoading(false);
      return;
    }

    fetchResult(query);

    stageInterval.current = setInterval(() => {
      setLoadingStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1));
    }, 2500);

    return () => {
      if (stageInterval.current) clearInterval(stageInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        setIsLoggedIn(!!data.user);
      });
  }, []);

  async function fetchResult(q: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setGate(null);
    setLoadingStage(0);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        // [1.1/1.2 fix] Surface all limit codes as gates, not just "free_limit"
        if (data.code === "free_limit") {
          setGate("free");
          return;
        }
        if (data.code === "guest_limit" || data.code === "anon_rate_limit") {
          setGate("guest");
          return;
        }
        throw new Error(data.error ?? "Too many requests");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

      const data: SearchResult = await res.json();
      // Decode HTML entities from API/DB content
      data.tldr = decodeHtml(data.tldr);
      data.what_happened = decodeHtml(data.what_happened);
      data.so_what = decodeHtml(data.so_what);
      data.now_what = decodeHtml(data.now_what);
      data.query = decodeHtml(data.query);
      setResult(data);

      const { data: authData } = await createClient().auth.getUser();
      if (!authData.user) incrementGuestSearchCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (stageInterval.current) clearInterval(stageInterval.current);
      setLoading(false);
    }
  }

  function handleNewSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    const slug = q
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    router.push(`/s/${slug}?q=${encodeURIComponent(q)}`);
  }

  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    const q = followUp.trim();
    if (!q || !result) return;
    setFollowUp("");
    const slug = q
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    router.push(`/s/${slug}?q=${encodeURIComponent(q)}`);
  }

  const headingFont = "var(--font-heading), 'Instrument Serif', serif";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Freemium gates */}
      {gate === "guest" && (
        <SignUpGate reason="guest" currentPath={currentPath} />
      )}
      {gate === "free" && (
        <SignUpGate reason="free" currentPath={currentPath} />
      )}

      {/* Top nav */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{
          background: "rgba(12,12,14,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push(isLoggedIn ? "/feed" : "/")}
            aria-label="Go to homepage"
            className="text-sm font-bold tracking-tight text-white flex-shrink-0 transition-opacity hover:opacity-70 cursor-pointer"
            style={{ fontFamily: headingFont }}
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </button>

          <form
            onSubmit={handleNewSearch}
            className="flex-1 flex items-center gap-2"
          >
            <div
              className="flex-1 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
              style={{
                background: "var(--ts-surface)",
                borderColor: "var(--border)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Search
                size={14}
                style={{ color: "var(--ts-muted)", flexShrink: 0 }}
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--foreground)" }}
                aria-label="Search query"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 cursor-pointer shadow-[0_0_12px_var(--ts-accent-30)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
              }}
            >
              Search
            </button>
          </form>

          {isLoggedIn && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => router.push("/feed")}
                className="text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--ts-text-2)" }}
              >
                Feed
              </button>
              <button
                onClick={() => router.push("/history")}
                className="text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--ts-text-2)" }}
              >
                History
              </button>
              <button
                onClick={() => router.push("/settings")}
                className="text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
                style={{ color: "var(--ts-text-2)" }}
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col gap-10">
            <div className="flex flex-col items-center justify-center gap-5 pt-8">
              <div className="flex items-end gap-[5px] h-8">
                {[0.55, 0.85, 1, 0.75, 0.45].map((scale, i) => (
                  <div
                    key={i}
                    style={{
                      width: "4px",
                      height: `${Math.round(scale * 28)}px`,
                      background: "var(--ts-accent)",
                      borderRadius: "2px",
                      transformOrigin: "bottom",
                      animation: `waveBar 0.9s ease-in-out ${i * 0.12}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--ts-text-2)" }}
              >
                {LOADING_STAGES[loadingStage]}
              </p>
              <p
                className="text-xs text-center max-w-xs"
                style={{ color: "var(--ts-muted)" }}
              >
                Analyzing sources on{" "}
                <span style={{ color: "var(--ts-accent)" }}>
                  &ldquo;{query}&rdquo;
                </span>{" "}
                so you don&apos;t have to.
              </p>
            </div>
            <ResultSkeleton />
          </div>
        )}

        {/* Error state */}
        {!loading && !gate && error && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p
              className="text-base font-medium"
              style={{ color: "var(--error)" }}
            >
              {error}
            </p>
            <button
              onClick={() => fetchResult(query)}
              className="text-sm underline cursor-pointer"
              style={{ color: "var(--ts-accent)" }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div key={result.query} className="flex flex-col gap-8 pb-24">
            {/* Query heading */}
            <div
              className="flex flex-col gap-1"
              style={{ animation: "fadeInUp 0.35s ease both" }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-muted)", fontFamily: headingFont }}
              >
                Learning brief
              </p>
              <h1
                className="text-xl font-bold text-white leading-snug"
                style={{ fontFamily: headingFont }}
              >
                {result.query}
              </h1>
              <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                {result.sources.length > 0
                  ? `Sourced from ${result.sources.length} sources`
                  : "Generated from available knowledge"}
              </p>
            </div>

            {/* TL;DR */}
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
                {result.tldr}
              </p>
            </section>

            {/* What Happened */}
            {result.what_happened && (
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
                  {result.what_happened.split("\n\n").map((para, i) => (
                    <p key={i} className={i > 0 ? "mt-3" : ""}>
                      {renderMarkdown(para)}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* So What */}
            {result.so_what && (
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
                  {result.so_what.split("\n\n").map((para, i) => (
                    <p key={i} className={i > 0 ? "mt-3" : ""}>
                      {renderMarkdown(para)}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Now What */}
            {result.now_what && (
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
                  {result.now_what.split("\n").map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    // Render bullet points
                    const isBullet =
                      trimmed.startsWith("-") || trimmed.startsWith("•");
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

            {/* Source Attribution */}
            {result.sources.length > 0 && (
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
                  {result.sources
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

            {/* YouTube Recommendations — Go Deeper */}
            {result.youtube_recs && result.youtube_recs.length > 0 && (
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
                  {result.youtube_recs.map((rec) => (
                    <a
                      key={rec.video_id}
                      href={rec.url}
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rec.thumbnail}
                          alt={rec.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
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
                          {rec.channel}
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

            {/* Back link */}
            <button
              onClick={() => router.push(isLoggedIn ? "/feed" : "/")}
              aria-label="Start a new search"
              className="flex items-center gap-1.5 text-xs self-start transition-opacity hover:opacity-80 cursor-pointer"
              style={{
                color: "var(--ts-text-2)",
                animation: "fadeInUp 0.35s ease 0.42s both",
              }}
            >
              <ArrowLeft size={12} />
              New search
            </button>
          </div>
        )}
      </main>

      {/* Sticky follow-up bar */}
      {!loading && result && (
        <div
          className="sticky bottom-0 z-20 border-t px-4 py-3"
          style={{
            background: "rgba(12,12,14,0.9)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "var(--border)",
          }}
        >
          <form
            onSubmit={handleFollowUp}
            className="max-w-3xl mx-auto flex gap-2"
          >
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Search another topic..."
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: "var(--ts-surface)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              aria-label="Search another topic"
            />
            <button
              type="submit"
              disabled={!followUp.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-30 hover:opacity-90 cursor-pointer shadow-[0_0_12px_var(--ts-accent-30)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
              }}
            >
              Search
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
