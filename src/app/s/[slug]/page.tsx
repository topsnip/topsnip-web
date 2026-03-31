"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { SiteNav } from "@/components/SiteNav";
import { SignUpGate } from "@/components/SignUpGate";
import { LearningBrief } from "@/components/learning-brief";
import type { LearningBriefYouTubeRec } from "@/components/learning-brief";
import {
  guestLimitReached,
  incrementGuestSearchCount,
} from "@/lib/search-limits";
import { decodeHtml } from "@/lib/utils/decode-html";
import { createClient } from "@/lib/supabase/client";
import { SearchLoading } from "./search-loading";
import { SearchSidebar, getRelatedTopics } from "./search-sidebar";

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
  key_takeaways?: Array<{label: string, text: string}>;
  reading_time_seconds?: number;
  complexity?: "beginner" | "intermediate" | "advanced";
  sources: SourceAttribution[];
  youtube_recs: YouTubeRec[];
  source_type: "pre_generated" | "on_demand";
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mapYouTubeRecs(recs: YouTubeRec[]): LearningBriefYouTubeRec[] {
  return recs.map((rec) => ({
    title: rec.title,
    videoId: rec.video_id,
    channelName: rec.channel,
    thumbnail: rec.thumbnail,
  }));
}

import { headingFont } from "@/lib/constants";

const customEase = [0.16, 1, 0.3, 1] as const;

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
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<"guest" | "free" | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [searchInput, setSearchInput] = useState(query);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPro, setIsPro] = useState(false);

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

    return () => {
      if (stageInterval.current) clearInterval(stageInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setIsLoggedIn(!!data.user);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", data.user.id)
          .single();
        setIsPro(profile?.plan === "pro");
      }
    });
  }, []);

  async function fetchResult(q: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setGate(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
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

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
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
      <SiteNav user={isLoggedIn ? { id: "search-user", plan: "free" } : null} />

      {/* Background glow */}
      <div className="absolute top-0 left-0 right-0 h-96 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{ background: "var(--ts-accent)" }} />
      </div>

      {/* Search bar below nav */}
      <div
        className="sticky top-0 z-20 border-b px-4 py-3 mt-16"
        style={{
          background: "rgba(12,12,14,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderColor: "var(--border)",
        }}
      >
        <form
          onSubmit={handleNewSearch}
          className="max-w-[1280px] mx-auto flex items-center gap-2"
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
            className="btn-primary rounded-lg px-3 py-1.5 text-xs"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 sm:px-6 py-8">
        {/* Loading state — progressive loader */}
        {loading && <SearchLoading query={query} />}

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
              className="link-interactive text-sm underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Result — two-column layout */}
        {!loading && result && (
          <motion.div
            key={result.query}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: [...customEase] }}
            className="flex flex-col gap-8 pb-24"
          >
            {/* Query heading in browser-style card */}
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [...customEase] }}
            >
              {/* Browser chrome */}
              <div className="rounded-t-xl px-4 py-3 flex items-center gap-2"
                style={{ background: "var(--ts-surface)", border: "1px solid var(--border)", borderBottom: "none" }}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f56" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#27ca40" }} />
                </div>
                <div className="flex-1 mx-4">
                  <div className="text-xs px-3 py-1 rounded-md text-center truncate"
                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--ts-text-2)" }}>
                    topsnip.co/s/{result.query.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}
                  </div>
                </div>
              </div>
              {/* Content area */}
              <div className="rounded-b-xl px-6 py-5 -mt-px"
                style={{ background: "var(--ts-surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "var(--ts-muted)", fontFamily: headingFont, fontVariant: "small-caps" }}>
                  Learning brief
                </p>
                <h1 className="text-white leading-snug"
                  style={{ fontFamily: headingFont, fontSize: "clamp(1.5rem, 1.2rem + 1.5vw, 2rem)" }}>
                  {result.query}
                </h1>
                <p className="text-xs mt-2" style={{ color: "var(--ts-muted)" }}>
                  {result.source_type === "on_demand"
                    ? "Generated from AI knowledge"
                    : result.sources.length > 0
                      ? `Sourced from ${result.sources.length} sources`
                      : "Generated from available knowledge"}
                </p>
                <p className="text-[11px] leading-relaxed mt-1" style={{ color: "var(--ts-muted)" }}>
                  Generated by AI from multiple sources. Always verify critical information.
                </p>
              </div>
            </motion.div>

            {/* Gradient divider */}
            <div className="h-px w-full my-6" style={{
              background: "linear-gradient(90deg, transparent, rgba(232,115,74,0.3), transparent)"
            }} />

            {/* Two-column grid */}
            <div className="two-column">
              {/* Left column — Learning Brief */}
              <div className="min-w-0">
                <LearningBrief
                  tldr={result.tldr}
                  whatHappened={result.what_happened}
                  soWhat={result.so_what}
                  nowWhat={result.now_what}
                  sources={result.sources.map((s) => ({
                    title: s.title,
                    url: s.url,
                    platform: s.platform,
                  }))}
                  animated={true}
                  isBlurred={!isLoggedIn}
                  isPro={isPro}
                  redirectPath={currentPath}
                  keyTakeaways={result.key_takeaways ?? []}
                  readingTimeSeconds={result.reading_time_seconds ?? 0}
                  complexity={result.complexity}
                  sourceCount={result.sources.length}
                />

                {/* Back link */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6, ease: [...customEase] }}
                  className="mt-8"
                >
                  <button
                    onClick={() => router.push(isLoggedIn ? "/feed" : "/")}
                    aria-label="Start a new search"
                    className="btn-ghost flex items-center gap-1.5 text-xs"
                  >
                    <ArrowLeft size={12} />
                    New search
                  </button>
                </motion.div>
              </div>

              {/* Right column — Sidebar */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: [...customEase] }}
                className="min-w-0"
              >
                <SearchSidebar
                  youtubeRecs={mapYouTubeRecs(result.youtube_recs ?? [])}
                  relatedTopics={getRelatedTopics(result.query)}
                  isLoggedIn={isLoggedIn}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Sticky follow-up bar */}
      {!loading && result && (
        <div
          className="sticky bottom-0 z-20 border-t px-4 py-3 relative"
          style={{
            background: "rgba(12,12,14,0.9)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "var(--border)",
          }}
        >
          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{
            background: "linear-gradient(90deg, transparent, rgba(232,115,74,0.2), transparent)"
          }} />
          <form
            onSubmit={handleFollowUp}
            className="max-w-[1280px] mx-auto flex gap-2"
          >
            <div
              className="flex-1 flex items-center gap-2 rounded-xl border px-4 py-2.5"
              style={{
                background: "var(--ts-surface)",
                borderColor: "var(--border)",
                height: "48px",
              }}
            >
              <Search
                size={14}
                style={{ color: "var(--ts-muted)", flexShrink: 0 }}
              />
              <input
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--foreground)" }}
                aria-label="Ask a follow-up question"
              />
            </div>
            <button
              type="submit"
              disabled={!followUp.trim()}
              className="btn-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-30"
              style={{ height: "48px" }}
            >
              Search
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
