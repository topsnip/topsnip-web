"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { LearningBriefSource, LearningBriefYouTubeRec } from "../LearningBrief";

// ── Shared types for format renderers ────────────────────────────────────────

export interface FormatRendererProps {
  content: Record<string, unknown>;
  sources?: LearningBriefSource[];
  youtubeRecs?: LearningBriefYouTubeRec[];
  isBlurred?: boolean;
  onMarkUnderstood?: () => void;
  animated?: boolean;
  redirectPath?: string;
}

// ── Markdown-lite renderer (bold + inline code) ────────────────────────────

export function renderMarkdown(text: string): React.ReactNode[] {
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

export function renderContentBlock(text: string): React.ReactNode {
  const blocks = text.split("\n\n");
  let key = 0;
  const elements: React.ReactNode[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n").filter((l) => l.trim());
    let runStart = 0;
    while (runStart < lines.length) {
      const type = lineType(lines[runStart]);
      let runEnd = runStart + 1;
      while (runEnd < lines.length && lineType(lines[runEnd]) === type) runEnd++;
      const run = lines.slice(runStart, runEnd);

      if (type === "bullet") {
        elements.push(
          <ul key={key++} className={`space-y-3 ${elements.length > 0 ? "mt-4" : ""}`}>
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
        elements.push(
          <p key={key++} className={elements.length > 0 ? "mt-4" : ""}>
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

export function parseNowWhatItems(text: string): string[] {
  return text
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

// ── Section wrapper (animated or static) ────────────────────────────────────

export function Section({
  children,
  delay = 0,
  className = "",
  style = {},
  animated = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  animated?: boolean;
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

// ── Collapsible content wrapper ─────────────────────────────────────────────

export function CollapsibleContent({
  children,
  maxHeight = 400,
  bgColor = "var(--ts-surface)",
}: {
  children: React.ReactNode;
  maxHeight?: number;
  bgColor?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  useEffect(() => {
    if (contentRef.current && contentRef.current.scrollHeight > maxHeight) {
      setNeedsCollapse(true);
    }
  }, [maxHeight]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        style={{
          maxHeight: !expanded && needsCollapse ? `${maxHeight}px` : undefined,
          overflow: !expanded && needsCollapse ? "hidden" : undefined,
        }}
      >
        {children}
      </div>
      {needsCollapse && !expanded && (
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-24" style={{ background: `linear-gradient(transparent, ${bgColor})` }} />
          <div className="flex justify-center pb-2" style={{ background: bgColor }}>
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-medium px-4 py-1.5 rounded-full transition-colors"
              style={{
                color: "var(--ts-accent)",
                background: "var(--ts-accent-6)",
                border: "1px solid var(--ts-accent-12)",
              }}
            >
              Read more ↓
            </button>
          </div>
        </div>
      )}
      {needsCollapse && expanded && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setExpanded(false)}
            className="text-xs font-medium px-4 py-1.5 rounded-full transition-colors"
            style={{
              color: "var(--ts-text-2)",
              background: "var(--ts-accent-3)",
              border: "1px solid var(--border)",
            }}
          >
            Show less ↑
          </button>
        </div>
      )}
    </div>
  );
}

// ── Helper to safely extract string from content ────────────────────────────

export function getString(content: Record<string, unknown>, key: string): string | undefined {
  const val = content[key];
  if (typeof val === "string" && val.trim()) return val;
  return undefined;
}

export function getStringArray(content: Record<string, unknown>, key: string): string[] {
  const val = content[key];
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string");
  if (typeof val === "string" && val.trim()) return parseNowWhatItems(val);
  return [];
}

/** Structured step object from tutorial format */
export interface TutorialStep {
  step: number;
  title: string;
  content: string;
  codeSnippet?: string;
}

/** Extract tutorial steps — handles both structured objects and plain string arrays */
export function getStepsArray(content: Record<string, unknown>): TutorialStep[] {
  const val = content["steps"];
  if (!Array.isArray(val)) {
    // If it's a string, split into lines and treat each as a step
    if (typeof val === "string" && val.trim()) {
      return parseNowWhatItems(val).map((line, i) => ({
        step: i + 1,
        title: "",
        content: line,
      }));
    }
    return [];
  }

  return val.map((item, i) => {
    if (typeof item === "string") {
      return { step: i + 1, title: "", content: item };
    }
    if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        step: typeof obj.step === "number" ? obj.step : i + 1,
        title: typeof obj.title === "string" ? obj.title : "",
        content: typeof obj.content === "string" ? obj.content : "",
        codeSnippet: typeof obj.code_snippet === "string" ? obj.code_snippet : undefined,
      };
    }
    return { step: i + 1, title: "", content: "" };
  }).filter((s) => s.content || s.title);
}
