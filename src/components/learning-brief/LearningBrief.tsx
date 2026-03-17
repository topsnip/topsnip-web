"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SourceCitation } from "./SourceCitation";
import { NowWhatChecklist } from "./NowWhatChecklist";
import { YouTubeRecs } from "./YouTubeRecs";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LearningBriefSource {
  title: string;
  url: string;
  platform?: string;
}

export interface LearningBriefYouTubeRec {
  title: string;
  videoId: string;
  channelName?: string;
  thumbnail?: string;
}

export interface LearningBriefProps {
  tldr: string;
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
  sources?: LearningBriefSource[];
  youtubeRecs?: LearningBriefYouTubeRec[];
  isBlurred?: boolean;
  onMarkUnderstood?: () => void;
  animated?: boolean;
  /** Redirect path for sign-up CTA when isBlurred (e.g. /topic/my-slug) */
  redirectPath?: string;
}

// ── Markdown-lite renderer (bold only) ─────────────────────────────────────

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

// ── Parse now_what into action items ───────────────────────────────────────

function parseNowWhatItems(nowWhat: string): string[] {
  return nowWhat
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.startsWith("-") || line.startsWith("\u2022")) {
        return line.slice(1).trim();
      }
      return line;
    });
}

// ── Animation variants ─────────────────────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const customEase = [0.16, 1, 0.3, 1] as const;

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

// ── Component ──────────────────────────────────────────────────────────────

export function LearningBrief({
  tldr,
  whatHappened,
  soWhat,
  nowWhat,
  sources = [],
  youtubeRecs = [],
  isBlurred = false,
  onMarkUnderstood,
  animated = false,
  redirectPath,
}: LearningBriefProps) {
  const [understood, setUnderstood] = useState(false);

  const nowWhatItems = parseNowWhatItems(nowWhat);

  function handleMarkUnderstood() {
    setUnderstood(true);
    onMarkUnderstood?.();
  }

  // Wrapper: motion.div when animated, plain div otherwise
  function Section({
    children,
    delay = 0,
    className = "",
    style = {},
  }: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
    style?: React.CSSProperties;
  }) {
    if (animated) {
      return (
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.4, delay, ease: [...customEase] }}
          className={className}
          style={style}
        >
          {children}
        </motion.div>
      );
    }
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: "1.5rem" }}>
      {/* ── TL;DR ─────────────────────────────────────────────────────── */}
      <Section delay={0}>
        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(232,115,74,0.04)",
            borderLeft: "4px solid var(--ts-accent)",
            borderRadius: "0 12px 12px 0",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              color: "var(--ts-accent)",
              fontFamily: headingFont,
              fontVariant: "small-caps",
            }}
          >
            TL;DR
          </p>
          <p
            className="font-medium leading-relaxed text-white"
            style={{ fontSize: "var(--text-lg)" }}
          >
            {tldr}
          </p>
        </div>
      </Section>

      {/* ── Blurred overlay wrapper for remaining sections ─────────── */}
      {isBlurred ? (
        <div className="relative">
          {/* Blurred content */}
          <div
            style={{
              filter: "blur(8px)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            <BlurredSections
              whatHappened={whatHappened}
              soWhat={soWhat}
              nowWhatItems={nowWhatItems}
              sources={sources}
            />
          </div>

          {/* CTA overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 10 }}
          >
            <div
              className="rounded-2xl p-8 text-center flex flex-col items-center gap-4"
              style={{
                background: "rgba(12,12,14,0.9)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                maxWidth: "400px",
              }}
            >
              <h3
                className="text-2xl text-white"
                style={{ fontFamily: headingFont }}
              >
                Sign up to read the full brief
              </h3>
              <p
                className="text-sm"
                style={{ color: "var(--ts-text-2)" }}
              >
                Free account. No credit card.
              </p>
              <Link
                href={redirectPath ? `/auth/login?redirect=${encodeURIComponent(redirectPath)}` : "/auth/login"}
                className="rounded-xl px-8 py-3 text-base font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--ts-accent)" }}
              >
                Sign up — it&apos;s free
              </Link>
              <Link
                href={redirectPath ? `/auth/login?redirect=${encodeURIComponent(redirectPath)}` : "/auth/login"}
                className="text-sm underline transition-opacity hover:opacity-80"
                style={{ color: "var(--ts-text-2)" }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── What Happened ───────────────────────────────────────── */}
          {whatHappened && (
            <Section delay={animated ? 0.1 : 0}>
              <div
                className="rounded-xl"
                style={{
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{
                    color: "var(--ts-muted)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  What Happened
                </p>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--foreground)", lineHeight: 1.7 }}
                >
                  {whatHappened.split("\n\n").map((para, i) => (
                    <p key={i} className={i > 0 ? "mt-3" : ""}>
                      {renderMarkdown(para)}
                    </p>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ── So What? ────────────────────────────────────────────── */}
          {soWhat && (
            <Section delay={animated ? 0.2 : 0}>
              <div
                className="rounded-xl"
                style={{
                  background: "var(--ts-accent-3)",
                  border: "1px solid var(--ts-accent-6)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{
                    color: "var(--ts-accent)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  So What?
                </p>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--foreground)", lineHeight: 1.7 }}
                >
                  {soWhat.split("\n\n").map((para, i) => (
                    <p key={i} className={i > 0 ? "mt-3" : ""}>
                      {renderMarkdown(para)}
                    </p>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ── Now What? ───────────────────────────────────────────── */}
          {nowWhatItems.length > 0 && (
            <Section delay={animated ? 0.3 : 0}>
              <div
                className="rounded-xl"
                style={{
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{
                    color: "var(--ts-muted)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  Now What?
                </p>
                <NowWhatChecklist items={nowWhatItems} />
              </div>
            </Section>
          )}

          {/* ── Sources ─────────────────────────────────────────────── */}
          {sources.length > 0 && (
            <Section delay={animated ? 0.4 : 0}>
              <div
                className="rounded-xl"
                style={{
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{
                    color: "var(--ts-muted)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  Sources
                </p>
                <div className="flex flex-wrap gap-2">
                  {sources
                    .filter((s) => s.url)
                    .map((source, i) => (
                      <SourceCitation
                        key={i}
                        number={i + 1}
                        source={source}
                      />
                    ))}
                </div>
              </div>
            </Section>
          )}

          {/* ── YouTube Recs ────────────────────────────────────────── */}
          {youtubeRecs.length > 0 && (
            <Section delay={animated ? 0.5 : 0}>
              <div
                className="rounded-xl"
                style={{
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{
                    color: "var(--ts-muted)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  Go Deeper
                </p>
                <YouTubeRecs recs={youtubeRecs} />
              </div>
            </Section>
          )}

          {/* ── Mark as Understood ───────────────────────────────────── */}
          {onMarkUnderstood && (
            <Section delay={animated ? 0.6 : 0}>
              <button
                onClick={handleMarkUnderstood}
                disabled={understood}
                className="w-full rounded-xl px-8 py-3.5 text-base font-medium text-white transition-all duration-200 cursor-pointer disabled:cursor-default"
                style={{
                  background: understood
                    ? "var(--success)"
                    : "var(--ts-accent)",
                }}
              >
                {understood ? "Understood!" : "I understand this \u2713"}
              </button>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// ── Blurred placeholder sections (simplified for blur preview) ─────────────

function BlurredSections({
  whatHappened,
  soWhat,
  nowWhatItems,
  sources,
}: {
  whatHappened: string;
  soWhat: string;
  nowWhatItems: string[];
  sources: LearningBriefSource[];
}) {
  return (
    <div className="flex flex-col" style={{ gap: "1.5rem" }}>
      {whatHappened && (
        <div
          className="rounded-xl"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--ts-muted)" }}
          >
            What Happened
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            {whatHappened.split("\n\n").map((para, i) => (
              <p key={i} className={i > 0 ? "mt-3" : ""}>
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {soWhat && (
        <div
          className="rounded-xl"
          style={{
            background: "var(--ts-accent-3)",
            border: "1px solid var(--ts-accent-6)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--ts-accent)" }}>
            So What?
          </p>
          <div className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
            {soWhat.split("\n\n").map((para, i) => (
              <p key={i} className={i > 0 ? "mt-3" : ""}>
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {nowWhatItems.length > 0 && (
        <div
          className="rounded-xl"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--ts-muted)" }}>
            Now What?
          </p>
          <div className="flex flex-col gap-3">
            {nowWhatItems.map((item, i) => (
              <p key={i} className="text-sm" style={{ color: "var(--foreground)" }}>
                {item}
              </p>
            ))}
          </div>
        </div>
      )}

      {sources.length > 0 && (
        <div
          className="rounded-xl"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--ts-muted)" }}>
            Sources
          </p>
          <div className="flex gap-2">
            {sources.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className="rounded px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: "var(--ts-accent-8)",
                  color: "var(--ts-accent)",
                }}
              >
                [{i + 1}]
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
