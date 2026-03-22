"use client";

import { useState } from "react";
import { Zap, CheckSquare, ListOrdered, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";
import { headingFont } from "@/lib/constants";
import { SourceCitation } from "../SourceCitation";
import { YouTubeRecs } from "../YouTubeRecs";
import {
  Section,
  CollapsibleContent,
  renderMarkdown,
  renderContentBlock,
  getString,
  getStringArray,
  getStepsArray,
  type FormatRendererProps,
} from "./shared";

export function TutorialBrief({
  content,
  sources = [],
  youtubeRecs = [],
  onMarkUnderstood,
  animated = false,
}: FormatRendererProps) {
  const [understood, setUnderstood] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const tldr = getString(content, "tldr");
  const prerequisites = getStringArray(content, "prerequisites");
  const steps = getStepsArray(content);
  const commonIssues = getStringArray(content, "common_issues");
  const nextSteps = getString(content, "next_steps");

  function handleMarkUnderstood() {
    setUnderstood(true);
    onMarkUnderstood?.();
  }

  function toggleIssue(index: number) {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
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

      {/* Prerequisites */}
      {prerequisites.length > 0 && (
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
              <CheckSquare size={12} className="inline mr-1.5" />
              Prerequisites
            </p>
            <ul className="space-y-3">
              {prerequisites.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1 w-4 h-4 rounded shrink-0 flex items-center justify-center"
                    style={{
                      border: "2px solid var(--ts-accent-12)",
                    }}
                  />
                  <span className="text-base leading-relaxed" style={{ color: "var(--foreground)" }}>
                    {renderMarkdown(item)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* Steps */}
      {steps.length > 0 && (
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
              <ListOrdered size={12} className="inline mr-1.5" />
              Steps
            </p>
            <div className="space-y-4">
              {steps.map((step) => (
                  <div
                    key={step.step}
                    className="rounded-lg p-4"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{
                          background: "var(--ts-accent)",
                          color: "white",
                        }}
                      >
                        {step.step}
                      </span>
                      <div className="flex-1">
                        {step.title && (
                          <p className="font-semibold text-base mb-2" style={{ color: "var(--foreground)" }}>
                            {renderMarkdown(step.title)}
                          </p>
                        )}
                        <div className="text-base leading-relaxed" style={{ color: "var(--foreground)" }}>
                          {renderMarkdown(step.content)}
                        </div>
                        {step.codeSnippet && (
                          <pre
                            className="mt-3 rounded-lg p-4 font-mono text-sm overflow-x-auto"
                            style={{
                              background: "rgba(0,0,0,0.3)",
                              border: "1px solid var(--ts-accent-12)",
                              color: "var(--ts-accent-2)",
                            }}
                          >
                            <code>{step.codeSnippet}</code>
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Common Issues (expandable FAQ) */}
      {commonIssues.length > 0 && (
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
              <AlertCircle size={12} className="inline mr-1.5" />
              Common Issues
            </p>
            <div className="space-y-2">
              {commonIssues.map((issue, i) => {
                const isOpen = expandedIssues.has(i);
                // Try to split on " - " or ": " for question/answer format
                const separatorIndex = issue.indexOf(" - ");
                const colonIndex = issue.indexOf(": ");
                const splitAt = separatorIndex > 0 ? separatorIndex : colonIndex > 0 ? colonIndex : -1;
                const sepLen = separatorIndex > 0 ? 3 : 2;
                const question = splitAt > 0 ? issue.slice(0, splitAt) : issue;
                const answer = splitAt > 0 ? issue.slice(splitAt + sepLen) : null;

                return (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden"
                    style={{
                      border: "1px solid var(--border)",
                      background: isOpen ? "rgba(0,0,0,0.2)" : "transparent",
                    }}
                  >
                    <button
                      onClick={() => toggleIssue(i)}
                      className="w-full flex items-center justify-between p-3 text-left"
                      style={{ background: "none", border: "none" }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        {renderMarkdown(question)}
                      </span>
                      <span
                        className="text-xs shrink-0 ml-2"
                        style={{ color: "var(--ts-muted)" }}
                      >
                        {isOpen ? "\u25B2" : "\u25BC"}
                      </span>
                    </button>
                    {isOpen && answer && (
                      <div
                        className="px-3 pb-3 text-sm leading-relaxed"
                        style={{ color: "var(--ts-text-2)" }}
                      >
                        {renderMarkdown(answer)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* Next Steps */}
      {nextSteps && (
        <Section delay={animated ? 0.35 : 0} animated={animated}>
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
              Next Steps
            </p>
            <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
              {renderContentBlock(nextSteps)}
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
