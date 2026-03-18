"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, Newspaper, AlertCircle, ListChecks, ExternalLink } from "lucide-react";
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

// ── Markdown-lite renderer (bold + inline code) ────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  // Split on **bold** (allows internal single *) and `code` patterns
  const parts = text.split(/(\*\*(?:[^*]|\*(?!\*))+\*\*|`[^`]+`)/g);
  return parts
    .filter((p) => p !== "")
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold" style={{ color: "var(--foreground)" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="font-mono text-sm px-1.5 py-0.5 rounded-md"
            style={{
              background: "var(--ts-accent-6)",
              border: "1px solid var(--ts-accent-12)",
              color: "var(--ts-accent-2)",
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
}

// ── Content block renderer (paragraphs, bullets, numbered lists) ────────────

function lineType(line: string): "bullet" | "numbered" | "text" {
  if (/^\s*[-*]\s/.test(line)) return "bullet";
  if (/^\s*\d+\.\s/.test(line)) return "numbered";
  return "text";
}

function renderContentBlock(text: string): React.ReactNode {
  // Split on double newlines into blocks, then split each block into
  // contiguous runs of same-type lines to handle mixed content.
  const blocks = text.split("\n\n");
  let key = 0;
  const elements: React.ReactNode[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n").filter((l) => l.trim());
    // Group consecutive lines of the same type
    let runStart = 0;
    while (runStart < lines.length) {
      const type = lineType(lines[runStart]);
      let runEnd = runStart + 1;
      while (runEnd < lines.length && lineType(lines[runEnd]) === type) runEnd++;
      const run = lines.slice(runStart, runEnd);

      if (type === "bullet") {
        elements.push(
          <ul key={key++} className={`space-y-2 ${elements.length > 0 ? "mt-4" : ""}`}>
            {run.map((line, li) => (
              <li key={li} className="flex items-start gap-3">
                <span
                  className="mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--ts-accent)" }}
                />
                <span>{renderMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</span>
              </li>
            ))}
          </ul>
        );
      } else if (type === "numbered") {
        elements.push(
          <ol key={key++} className={`space-y-2 ${elements.length > 0 ? "mt-4" : ""}`}>
            {run.map((line, li) => {
              const num = line.match(/^\s*(\d+)\./)?.[1] || String(li + 1);
              return (
                <li key={li} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
                    style={{ background: "var(--ts-accent-12)", color: "var(--ts-accent)" }}
                  >
                    {num}
                  </span>
                  <span>{renderMarkdown(line.replace(/^\s*\d+\.\s+/, ""))}</span>
                </li>
              );
            })}
          </ol>
        );
      } else {
        // Text lines — join back into a paragraph
        elements.push(
          <p key={key++} className={elements.length > 0 ? "mt-3" : ""}>
            {renderMarkdown(run.join(" "))}
          </p>
        );
      }
      runStart = runEnd;
    }
  }
  return elements;
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
            className="text-sm font-semibold uppercase tracking-widest mb-4 pb-3 border-b"
            style={{
              color: "var(--ts-accent)",
              borderColor: "var(--border)",
              fontFamily: headingFont,
              fontVariant: "small-caps",
            }}
          >
            <Zap size={12} className="inline mr-1.5" />
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
                className="btn-primary rounded-xl px-8 py-3 text-base font-medium"
              >
                Sign up — it&apos;s free
              </Link>
              <Link
                href={redirectPath ? `/auth/login?redirect=${encodeURIComponent(redirectPath)}` : "/auth/login"}
                className="btn-ghost text-sm underline"
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
                  className="text-sm font-semibold uppercase tracking-widest mb-4 pb-3 border-b"
                  style={{
                    color: "var(--ts-muted)",
                    borderColor: "var(--border)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  <Newspaper size={12} className="inline mr-1.5" />
                  What Happened
                </p>
                <div
                  className="text-base leading-relaxed"
                  style={{ color: "var(--foreground)", lineHeight: 1.7 }}
                >
                  {renderContentBlock(whatHappened)}
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
                  background: "var(--ts-accent-6)",
                  border: "1px solid var(--ts-accent-12)",
                  borderLeft: "3px solid var(--ts-accent)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="text-sm font-semibold uppercase tracking-widest mb-4 pb-3 border-b"
                  style={{
                    color: "var(--ts-accent)",
                    borderColor: "var(--border)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  <AlertCircle size={12} className="inline mr-1.5" />
                  So What?
                </p>
                <div
                  className="text-base leading-relaxed"
                  style={{ color: "var(--foreground)", lineHeight: 1.7 }}
                >
                  {renderContentBlock(soWhat)}
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
                  className="text-sm font-semibold uppercase tracking-widest mb-4 pb-3 border-b"
                  style={{
                    color: "var(--ts-muted)",
                    borderColor: "var(--border)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  <ListChecks size={12} className="inline mr-1.5" />
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
                  className="text-sm font-semibold uppercase tracking-widest mb-4 pb-3 border-b"
                  style={{
                    color: "var(--ts-muted)",
                    borderColor: "var(--border)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  <ExternalLink size={12} className="inline mr-1.5" />
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
                className="btn-primary w-full rounded-xl px-8 py-3.5 text-base font-medium disabled:cursor-default"
                style={{
                  background: understood
                    ? "var(--success)"
                    : undefined,
                  boxShadow: understood ? "none" : undefined,
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
          <div className="text-base leading-relaxed" style={{ color: "var(--foreground)" }}>
            {renderContentBlock(whatHappened)}
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
          <div className="text-base leading-relaxed" style={{ color: "var(--foreground)" }}>
            {renderContentBlock(soWhat)}
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
