"use client";

import { useState } from "react";
import { Zap, Scale, Users, Clock, ListChecks, ExternalLink } from "lucide-react";
import { headingFont } from "@/lib/constants";
import { SourceCitation } from "../SourceCitation";
import { NowWhatChecklist } from "../NowWhatChecklist";
import { YouTubeRecs } from "../YouTubeRecs";
import {
  Section,
  CollapsibleContent,
  renderMarkdown,
  renderContentBlock,
  getString,
  getStringArray,
  parseNowWhatItems,
  type FormatRendererProps,
} from "./shared";

export function RegulatoryBrief({
  content,
  sources = [],
  youtubeRecs = [],
  onMarkUnderstood,
  animated = false,
}: FormatRendererProps) {
  const [understood, setUnderstood] = useState(false);

  const tldr = getString(content, "tldr");
  const theChange = getString(content, "the_change");
  const whoItAffects = getString(content, "who_it_affects");
  const timeline = getString(content, "timeline");
  const whatToDo = getString(content, "what_to_do");
  const whatToDoItems = whatToDo ? parseNowWhatItems(whatToDo) : [];

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

      {/* The Change */}
      {theChange && (
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
              <Scale size={12} className="inline mr-1.5" />
              The Change
            </p>
            <CollapsibleContent maxHeight={400}>
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(theChange)}
              </div>
            </CollapsibleContent>
          </div>
        </Section>
      )}

      {/* Who It Affects */}
      {whoItAffects && (
        <Section delay={animated ? 0.2 : 0} animated={animated}>
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
              <Users size={12} className="inline mr-1.5" />
              Who It Affects
            </p>
            <CollapsibleContent maxHeight={350} bgColor="var(--ts-accent-6)">
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(whoItAffects)}
              </div>
            </CollapsibleContent>
          </div>
        </Section>
      )}

      {/* Timeline */}
      {timeline && (
        <Section delay={animated ? 0.3 : 0} animated={animated}>
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
              <Clock size={12} className="inline mr-1.5" />
              Timeline
            </p>
            <div className="relative pl-6">
              {/* Vertical line */}
              <div
                className="absolute left-2 top-1 bottom-1 w-0.5"
                style={{ background: "var(--ts-accent-12)" }}
              />
              <div className="space-y-4">
                {timeline.split("\n").filter((l) => l.trim()).map((line, i) => {
                  const cleaned = line.replace(/^\s*[-*\d.]+\s*/, "").trim();
                  if (!cleaned) return null;
                  return (
                    <div key={i} className="relative flex items-start gap-3">
                      {/* Dot on the timeline */}
                      <span
                        className="absolute -left-4 mt-2 w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: "var(--ts-accent)",
                          border: "2px solid var(--ts-surface)",
                        }}
                      />
                      <span className="text-base leading-relaxed" style={{ color: "var(--foreground)" }}>
                        {renderMarkdown(cleaned)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* What To Do */}
      {whatToDoItems.length > 0 && (
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
              <ListChecks size={12} className="inline mr-1.5" />
              What To Do
            </p>
            <NowWhatChecklist items={whatToDoItems} />
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
