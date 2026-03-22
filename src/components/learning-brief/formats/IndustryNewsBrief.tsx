"use client";

import { useState } from "react";
import { Zap, Newspaper, TrendingUp, ArrowRight, ExternalLink } from "lucide-react";
import { headingFont } from "@/lib/constants";
import { SourceCitation } from "../SourceCitation";
import { YouTubeRecs } from "../YouTubeRecs";
import {
  Section,
  CollapsibleContent,
  renderMarkdown,
  renderContentBlock,
  getString,
  type FormatRendererProps,
} from "./shared";

export function IndustryNewsBrief({
  content,
  sources = [],
  youtubeRecs = [],
  onMarkUnderstood,
  animated = false,
}: FormatRendererProps) {
  const [understood, setUnderstood] = useState(false);

  const tldr = getString(content, "tldr");
  const whatHappened = getString(content, "what_happened");
  const whoWinsLoses = getString(content, "who_wins_who_loses");
  const whatHappensNext = getString(content, "what_happens_next");

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

      {/* What Happened */}
      {whatHappened && (
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
              <Newspaper size={12} className="inline mr-1.5" />
              What Happened
            </p>
            <CollapsibleContent maxHeight={400}>
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(whatHappened)}
              </div>
            </CollapsibleContent>
          </div>
        </Section>
      )}

      {/* Who Wins / Loses */}
      {whoWinsLoses && (
        <Section delay={animated ? 0.2 : 0} animated={animated}>
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
              <TrendingUp size={12} className="inline mr-1.5" />
              Who Wins / Loses
            </p>
            <div
              className="rounded-lg p-4"
              style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(239,68,68,0.06) 100%)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(whoWinsLoses)}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* What Happens Next */}
      {whatHappensNext && (
        <Section delay={animated ? 0.3 : 0} animated={animated}>
          <div
            className="rounded-xl"
            style={{
              background: "var(--ts-accent-6)",
              border: "1px solid var(--ts-accent-12)",
              borderLeft: "3px solid var(--ts-accent)",
              borderRadius: "0 12px 12px 0",
              padding: "2rem",
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
              <ArrowRight size={12} className="inline mr-1.5" />
              What Happens Next
            </p>
            <CollapsibleContent maxHeight={350} bgColor="var(--ts-accent-6)">
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(whatHappensNext)}
              </div>
            </CollapsibleContent>
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
