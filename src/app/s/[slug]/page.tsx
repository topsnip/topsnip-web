"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ArrowLeft, ExternalLink, ChevronDown } from "lucide-react";
import { SignUpGate } from "@/components/SignUpGate";
import {
  guestLimitReached,
  incrementGuestSearchCount,
} from "@/lib/search-limits";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

interface SourceVideo {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  view_count?: string;
  published_at?: string;
  url: string;
}

interface SearchResult {
  tldr: string;
  key_points: string[];
  key_concepts: string[];
  steps?: string[];
  sources: SourceVideo[];
  query: string;
  synthesized_from: number;
}

// ── Loading stages ─────────────────────────────────────────────────────────

const LOADING_STAGES = [
  "Searching YouTube...",
  "Finding the best videos...",
  "Reading transcripts...",
  "Synthesizing the signal...",
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") ?? "";
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<"guest" | "free" | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [showAllPoints, setShowAllPoints] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const stageInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query) return;

    // Guest limit check — before any API call
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
    createClient().auth.getUser().then(({ data }) => {
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
        if (data.code === "free_limit") {
          setGate("free");
          return;
        }
        throw new Error(data.error ?? "Too many requests");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

      const data: SearchResult = await res.json();
      setResult(data);

      // Increment guest counter on success (only if not logged in)
      if (!isLoggedIn) incrementGuestSearchCount();
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
    const slug = q.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    router.push(`/s/${slug}?q=${encodeURIComponent(q)}`);
  }

  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    const q = followUp.trim();
    if (!q || !result) return;
    setFollowUp("");
    fetchResult(`${result.query} — ${q}`);
  }

  const visiblePoints = showAllPoints
    ? result?.key_points ?? []
    : (result?.key_points ?? []).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
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
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-sm font-extrabold tracking-tight text-white flex-shrink-0 transition-opacity hover:opacity-70"
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </button>

          <form onSubmit={handleNewSearch} className="flex-1 flex items-center gap-2">
            <div
              className="flex-1 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
              style={{ background: "var(--ts-surface)", borderColor: "var(--border)" }}
            >
              <Search size={14} style={{ color: "var(--ts-muted)", flexShrink: 0 }} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--foreground)" }}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "var(--ts-accent)" }}
            >
              Search
            </button>
          </form>

          {isLoggedIn && (
            <button
              onClick={() => router.push("/history")}
              className="text-xs font-medium flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ color: "var(--ts-text-2)" }}
            >
              History
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <div className="flex flex-col items-center gap-4">
              {/* Waveform signal loader — 5 bars at varying heights */}
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
              <p className="text-sm font-medium" style={{ color: "var(--ts-text-2)" }}>
                {LOADING_STAGES[loadingStage]}
              </p>
            </div>
            <p className="text-xs text-center max-w-xs" style={{ color: "var(--ts-muted)" }}>
              Reading multiple YouTube videos on{" "}
              <span style={{ color: "var(--ts-accent)" }}>&ldquo;{query}&rdquo;</span>{" "}
              so you don&apos;t have to.
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && !gate && error && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="text-base font-medium" style={{ color: "var(--error)" }}>
              {error}
            </p>
            <button
              onClick={() => fetchResult(query)}
              className="text-sm underline"
              style={{ color: "var(--ts-accent)" }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div key={result.query} className="flex flex-col gap-8">
            {/* Query heading */}
            <div className="flex flex-col gap-1" style={{ animation: "fadeInUp 0.35s ease both" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ts-muted)" }}>
                Topsnip result
              </p>
              <h1 className="text-xl font-bold text-white leading-snug">{result.query}</h1>
              <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                Synthesized from {result.synthesized_from} YouTube videos
              </p>
            </div>

            {/* TL;DR */}
            <section
              className="rounded-xl border p-5"
              style={{ background: "var(--ts-surface)", borderColor: "var(--border)", animation: "fadeInUp 0.35s ease 0.06s both" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--ts-accent)" }}>
                TL;DR
              </p>
              <p className="text-base leading-relaxed text-white font-medium">{result.tldr}</p>
            </section>

            {/* Key points */}
            {result.key_points.length > 0 && (
              <section className="flex flex-col gap-4" style={{ animation: "fadeInUp 0.35s ease 0.12s both" }}>
                <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--ts-muted)" }}>
                  What you need to know
                </h2>
                <div className="flex flex-col gap-3">
                  {visiblePoints.map((point, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-lg border p-4"
                      style={{ background: "var(--ts-surface)", borderColor: "var(--border)" }}
                    >
                      <span
                        className="text-xs font-bold mt-0.5 flex-shrink-0"
                        style={{ color: "var(--ts-accent)" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                        {point}
                      </p>
                    </div>
                  ))}
                </div>
                {result.key_points.length > 4 && (
                  <button
                    onClick={() => setShowAllPoints(!showAllPoints)}
                    className="flex items-center gap-1.5 text-sm font-medium self-start transition-opacity hover:opacity-80"
                    style={{ color: "var(--ts-accent)" }}
                  >
                    {showAllPoints ? "Show less" : `Show ${result.key_points.length - 4} more`}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showAllPoints ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </section>
            )}

            {/* Key concepts */}
            {result.key_concepts.length > 0 && (
              <section className="flex flex-col gap-3" style={{ animation: "fadeInUp 0.35s ease 0.18s both" }}>
                <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--ts-muted)" }}>
                  Key concepts
                </h2>
                <div className="flex flex-wrap gap-2">
                  {result.key_concepts.map((concept) => (
                    <span
                      key={concept}
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        borderColor: "rgba(124,106,247,0.3)",
                        color: "var(--ts-accent-2)",
                        background: "rgba(124,106,247,0.07)",
                      }}
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Steps */}
            {result.steps && result.steps.length > 0 && (
              <section className="flex flex-col gap-3" style={{ animation: "fadeInUp 0.35s ease 0.24s both" }}>
                <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--ts-muted)" }}>
                  Step by step
                </h2>
                <ol className="flex flex-col gap-2">
                  {result.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 items-start text-sm leading-relaxed">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: "var(--ts-surface)", color: "var(--ts-accent)", border: "1px solid var(--border)" }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ color: "var(--foreground)" }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Source videos */}
            {result.sources.length > 0 && (
              <section className="flex flex-col gap-3" style={{ animation: "fadeInUp 0.35s ease 0.30s both" }}>
                <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--ts-muted)" }}>
                  Synthesized from
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.sources.map((src) => (
                    <a
                      key={src.video_id}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 rounded-xl border p-3 transition-all hover:border-[var(--ts-accent)] group"
                      style={{ background: "var(--ts-surface)", borderColor: "var(--border)" }}
                    >
                      <div className="w-24 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--ts-surface-2)]" style={{ aspectRatio: "16/9" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src.thumbnail}
                          alt={src.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug text-white line-clamp-2 group-hover:text-[var(--ts-accent-2)] transition-colors">
                          {src.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--ts-muted)" }}>{src.channel}</p>
                        {src.duration && (
                          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>{src.duration}</p>
                        )}
                      </div>
                      <ExternalLink size={12} className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: "var(--ts-text-2)" }} />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Follow-up */}
            <section
              className="rounded-xl border p-4"
              style={{ background: "var(--ts-surface)", borderColor: "var(--border)", animation: "fadeInUp 0.35s ease 0.36s both" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--ts-muted)" }}>
                Ask a follow-up
              </p>
              <form onSubmit={handleFollowUp} className="flex gap-2">
                <input
                  type="text"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder={`Ask something about "${result.query}"...`}
                  className="flex-1 bg-[var(--ts-surface-2)] border rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <button
                  type="submit"
                  disabled={!followUp.trim()}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-30 hover:opacity-90"
                  style={{ background: "var(--ts-accent)" }}
                >
                  Ask
                </button>
              </form>
            </section>

            {/* Back link */}
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs self-start transition-opacity hover:opacity-80"
              style={{ color: "var(--ts-text-2)", animation: "fadeInUp 0.35s ease 0.42s both" }}
            >
              <ArrowLeft size={12} />
              New search
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
