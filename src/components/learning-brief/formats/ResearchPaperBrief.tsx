"use client";

import { useState } from "react";
import { Zap, FlaskConical, Lightbulb, Code2, HelpCircle, ExternalLink } from "lucide-react";
import { headingFont } from "@/lib/constants";
import { SourceCitation } from "../SourceCitation";
import { YouTubeRecs } from "../YouTubeRecs";
import {
  Section,
  CollapsibleContent,
  renderContentBlock,
  getString,
  getStringArray,
  renderMarkdown,
  type FormatRendererProps,
} from "./shared";

export function ResearchPaperBrief({
  content,
  sources = [],
  youtubeRecs = [],
  onMarkUnderstood,
  animated = false,
}: FormatRendererProps) {
  const [understood, setUnderstood] = useState(false);
  const [techDetailOpen, setTechDetailOpen] = useState(false);

  const tldr = getString(content, "tldr");
  const theFinding = getString(content, "the_finding");
  const whyItMatters = getString(content, "why_it_matters");
  const technicalDetail = getString(content, "technical_detail");
  const openQuestions = getStringArray(content, "open_questions");

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

      {/* The Finding */}
      {theFinding && (
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
              <FlaskConical size={12} className="inline mr-1.5" />
              The Finding
            </p>
            <CollapsibleContent maxHeight={400}>
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(theFinding)}
              </div>
            </CollapsibleContent>
          </div>
        </Section>
      )}

      {/* Why It Matters */}
      {whyItMatters && (
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
              <Lightbulb size={12} className="inline mr-1.5" />
              Why It Matters
            </p>
            <CollapsibleContent maxHeight={350} bgColor="var(--ts-accent-6)">
              <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                {renderContentBlock(whyItMatters)}
              </div>
            </CollapsibleContent>
          </div>
        </Section>
      )}

      {/* Technical Detail (collapsible, default collapsed) */}
      {technicalDetail && (
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
            <button
              onClick={() => setTechDetailOpen(!techDetailOpen)}
              className="w-full flex items-center justify-between text-left"
            >
              <p
                className="text-sm font-semibold uppercase tracking-widest"
                style={{
                  color: "var(--ts-muted)",
                  fontFamily: headingFont,
                  fontVariant: "small-caps",
                }}
              >
                <Code2 size={12} className="inline mr-1.5" />
                Technical Detail
              </p>
              <span
                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                style={{
                  color: "var(--ts-accent)",
                  background: "var(--ts-accent-6)",
                  border: "1px solid var(--ts-accent-12)",
                }}
              >
                {techDetailOpen ? "Collapse" : "Expand"}
              </span>
            </button>
            {techDetailOpen && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="text-base leading-relaxed" style={{ color: "var(--foreground)", lineHeight: 1.7 }}>
                  {renderContentBlock(technicalDetail)}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Open Questions */}
      {openQuestions.length > 0 && (
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
              <HelpCircle size={12} className="inline mr-1.5" />
              Open Questions
            </p>
            <ul className="space-y-3">
              {openQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1 w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
                    style={{
                      background: "var(--ts-accent-6)",
                      color: "var(--ts-accent)",
                      border: "1px solid var(--ts-accent-12)",
                    }}
                  >
                    ?
                  </span>
                  <span className="text-base leading-relaxed" style={{ color: "var(--foreground)" }}>
                    {renderMarkdown(q)}
                  </span>
                </li>
              ))}
            </ul>
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
