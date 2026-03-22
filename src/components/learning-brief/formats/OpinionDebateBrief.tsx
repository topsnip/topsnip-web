"use client";

import { useState } from "react";
import { Zap, MessageSquare, ThumbsUp, ThumbsDown, Scale, ExternalLink } from "lucide-react";
import { headingFont } from "@/lib/constants";
import { SourceCitation } from "../SourceCitation";
import { YouTubeRecs } from "../YouTubeRecs";
import {
  Section,
  CollapsibleContent,
  renderContentBlock,
  getString,
  type FormatRendererProps,
} from "./shared";

export function OpinionDebateBrief({
  content,
  sources = [],
  youtubeRecs = [],
  onMarkUnderstood,
  animated = false,
}: FormatRendererProps) {
  const [understood, setUnderstood] = useState(false);

  const tldr = getString(content, "tldr");
  const theDebate = getString(content, "the_debate");
  const sideA = getString(content, "side_a");
  const sideB = getString(content, "side_b");
  const theNuance = getString(content, "the_nuance");

  function handleMarkUnderstood() {
    setUnderstood(true);
    onMarkUnderstood?.();
  }

  return (
    <div className="flex flex-col" style={{ gap: "2rem" }}>
      {/* TL;DR */}
      {tldr && (
        <Section delay={0} animated={animated}>
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
            <p className="font-medium leading-relaxed text-white" style={{ fontSize: "var(--text-lg)" }}>
              {tldr}
            </p>
          </div>
        </Section>
      )}

      {/* The Debate */}
      {theDebate && (
        <Section delay={animated ? 0.1 : 0} animated={animated}>
          <div
            className="rounded-xl"
            style={{
              background: "var(--ts-surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "2rem",
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
              <MessageSquare size={12} className="inline mr-1.5" />
              The Debate
            </p>
            <CollapsibleContent maxHeight={400}>
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(theDebate)}
              </div>
            </CollapsibleContent>
          </div>
        </Section>
      )}

      {/* Side A & Side B */}
      {(sideA || sideB) && (
        <Section delay={animated ? 0.2 : 0} animated={animated}>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Side A */}
            {sideA && (
              <div
                className="rounded-xl"
                style={{
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderTop: "3px solid rgba(34,197,94,0.5)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="text-sm font-semibold uppercase tracking-widest mb-4 pb-3 border-b"
                  style={{
                    color: "rgba(34,197,94,0.8)",
                    borderColor: "rgba(34,197,94,0.15)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  <ThumbsUp size={12} className="inline mr-1.5" />
                  Side A
                </p>
                <CollapsibleContent maxHeight={300} bgColor="rgba(34,197,94,0.06)">
                  <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                    {renderContentBlock(sideA)}
                  </div>
                </CollapsibleContent>
              </div>
            )}

            {/* Side B */}
            {sideB && (
              <div
                className="rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderTop: "3px solid rgba(239,68,68,0.5)",
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                <p
                  className="text-sm font-semibold uppercase tracking-widest mb-4 pb-3 border-b"
                  style={{
                    color: "rgba(239,68,68,0.8)",
                    borderColor: "rgba(239,68,68,0.15)",
                    fontFamily: headingFont,
                    fontVariant: "small-caps",
                  }}
                >
                  <ThumbsDown size={12} className="inline mr-1.5" />
                  Side B
                </p>
                <CollapsibleContent maxHeight={300} bgColor="rgba(239,68,68,0.06)">
                  <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                    {renderContentBlock(sideB)}
                  </div>
                </CollapsibleContent>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* The Nuance */}
      {theNuance && (
        <Section delay={animated ? 0.3 : 0} animated={animated}>
          <div
            className="rounded-xl"
            style={{
              background: "var(--ts-accent-6)",
              border: "1px solid var(--ts-accent-12)",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
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
              <Scale size={12} className="inline mr-1.5" />
              The Nuance
            </p>
            <div
              className="text-base leading-relaxed mx-auto"
              style={{
                color: "var(--foreground)",
                lineHeight: 1.7,
                maxWidth: "600px",
                textAlign: "left",
              }}
            >
              {renderContentBlock(theNuance)}
            </div>
          </div>
        </Section>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <Section delay={animated ? 0.4 : 0} animated={animated}>
          <div
            className="rounded-xl"
            style={{
              background: "var(--ts-surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "2rem",
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
              {sources.filter((s) => s.url).map((source, i) => (
                <SourceCitation key={i} number={i + 1} source={source} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* YouTube Recs */}
      {youtubeRecs.length > 0 && (
        <Section delay={animated ? 0.45 : 0} animated={animated}>
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
              style={{ color: "var(--ts-muted)", fontFamily: headingFont, fontVariant: "small-caps" }}
            >
              Go Deeper
            </p>
            <YouTubeRecs recs={youtubeRecs} />
          </div>
        </Section>
      )}

      {/* Mark as Understood */}
      {onMarkUnderstood && (
        <Section delay={animated ? 0.5 : 0} animated={animated}>
          <button
            onClick={handleMarkUnderstood}
            disabled={understood}
            className="btn-primary w-full rounded-xl px-8 py-3.5 text-base font-medium disabled:cursor-default"
            style={{
              background: understood ? "var(--success)" : undefined,
              boxShadow: understood ? "none" : undefined,
            }}
          >
            {understood ? "Understood!" : "I understand this \u2713"}
          </button>
        </Section>
      )}
    </div>
  );
}
