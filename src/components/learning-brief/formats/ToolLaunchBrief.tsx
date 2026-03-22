"use client";

import { useState } from "react";
import { Zap, Rocket, DollarSign, GitCompare, AlertTriangle, ExternalLink } from "lucide-react";
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

export function ToolLaunchBrief({
  content,
  sources = [],
  youtubeRecs = [],
  onMarkUnderstood,
  animated = false,
}: FormatRendererProps) {
  const [understood, setUnderstood] = useState(false);

  const tldr = getString(content, "tldr");
  const whatItDoes = getString(content, "what_it_does");
  const gettingStarted = getString(content, "getting_started");
  const pricing = getString(content, "pricing");
  const comparedTo = getString(content, "compared_to");
  const watchOutFor = getString(content, "watch_out_for");

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

      {/* What It Does */}
      {whatItDoes && (
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
              <Rocket size={12} className="inline mr-1.5" />
              What It Does
            </p>
            <CollapsibleContent maxHeight={400}>
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(whatItDoes)}
              </div>
            </CollapsibleContent>
          </div>
        </Section>
      )}

      {/* Getting Started */}
      {gettingStarted && (
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
              Getting Started
            </p>
            <div
              className="rounded-lg p-4 font-mono text-sm leading-relaxed"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                lineHeight: 1.8,
              }}
            >
              {renderContentBlock(gettingStarted)}
            </div>
          </div>
        </Section>
      )}

      {/* Pricing */}
      {pricing && (
        <Section delay={animated ? 0.3 : 0} animated={animated}>
          <div
            className="rounded-xl"
            style={{
              background: "var(--ts-accent-6)",
              border: "1px solid var(--ts-accent-12)",
              borderRadius: "12px",
              padding: "1.5rem",
            }}
          >
            <p
              className="text-sm font-semibold uppercase tracking-widest mb-3 pb-3 border-b"
              style={{
                color: "var(--ts-accent)",
                borderColor: "var(--border)",
                fontFamily: headingFont,
                fontVariant: "small-caps",
              }}
            >
              <DollarSign size={12} className="inline mr-1.5" />
              Pricing
            </p>
            <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
              {renderContentBlock(pricing)}
            </div>
          </div>
        </Section>
      )}

      {/* Compared To */}
      {comparedTo && (
        <Section delay={animated ? 0.35 : 0} animated={animated}>
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
              <GitCompare size={12} className="inline mr-1.5" />
              Compared To
            </p>
            <CollapsibleContent maxHeight={350}>
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(comparedTo)}
              </div>
            </CollapsibleContent>
          </div>
        </Section>
      )}

      {/* Watch Out For */}
      {watchOutFor && (
        <Section delay={animated ? 0.4 : 0} animated={animated}>
          <div
            className="rounded-xl"
            style={{
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderLeft: "3px solid rgba(239,68,68,0.5)",
              borderRadius: "0 12px 12px 0",
              padding: "2rem",
            }}
          >
            <p
              className="text-sm font-semibold uppercase tracking-widest mb-4 pb-3 border-b"
              style={{
                color: "rgba(239,68,68,0.8)",
                borderColor: "var(--border)",
                fontFamily: headingFont,
                fontVariant: "small-caps",
              }}
            >
              <AlertTriangle size={12} className="inline mr-1.5" />
              Watch Out For
            </p>
            <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
              {renderContentBlock(watchOutFor)}
            </div>
          </div>
        </Section>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <Section delay={animated ? 0.45 : 0} animated={animated}>
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
        <Section delay={animated ? 0.5 : 0} animated={animated}>
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
        <Section delay={animated ? 0.55 : 0} animated={animated}>
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
