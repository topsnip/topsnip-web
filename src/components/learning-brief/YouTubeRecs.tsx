"use client";

import { ExternalLink } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface YouTubeRecsRec {
  title: string;
  videoId: string;
  channelName?: string;
  thumbnail?: string;
}

export interface YouTubeRecsProps {
  recs: YouTubeRecsRec[];
}

// ── Component ──────────────────────────────────────────────────────────────

export function YouTubeRecs({ recs }: YouTubeRecsProps) {
  if (recs.length === 0) return null;

  return (
    <>
      {/* Desktop: grid layout */}
      <div className="yt-recs-grid hidden md:grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {recs.map((rec) => (
          <YouTubeRecCard key={rec.videoId} rec={rec} />
        ))}
      </div>

      {/* Mobile: horizontal scroll */}
      <div
        className="yt-recs-scroll md:hidden flex gap-3 overflow-x-auto pb-2"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {recs.map((rec) => (
          <div
            key={rec.videoId}
            style={{ minWidth: "240px", scrollSnapAlign: "start" }}
          >
            <YouTubeRecCard rec={rec} />
          </div>
        ))}
      </div>

      <style jsx>{`
        .yt-recs-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

function YouTubeRecCard({ rec }: { rec: YouTubeRecsRec }) {
  const thumbnailUrl =
    rec.thumbnail || `https://img.youtube.com/vi/${rec.videoId}/mqdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${rec.videoId}`;

  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="yt-rec-card flex flex-col rounded-xl overflow-hidden cursor-pointer group"
      style={{
        background: "var(--ts-surface)",
        border: "1px solid var(--border)",
        transition:
          "transform 200ms var(--ease-out-expo), border-color 200ms ease, box-shadow 200ms ease",
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "16/9",
          background: "var(--ts-surface-2)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={rec.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3">
        <p
          className="text-xs font-medium leading-snug text-white group-hover:text-[var(--ts-accent-2)] transition-colors"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {rec.title}
        </p>

        {rec.channelName && (
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            {rec.channelName}
          </p>
        )}

        <span
          className="flex items-center gap-1 text-[11px] font-medium mt-1"
          style={{ color: "var(--ts-accent)" }}
        >
          Watch on YouTube
          <ExternalLink size={10} />
        </span>
      </div>

      <style jsx>{`
        .yt-rec-card:hover {
          transform: translateY(-2px);
          border-color: rgba(232, 115, 74, 0.2) !important;
          box-shadow: 0 4px 16px rgba(232, 115, 74, 0.08);
        }
      `}</style>
    </a>
  );
}
