"use client";

import { Clock, FileText } from "lucide-react";

interface ReadingMetaProps {
  readingTimeSeconds?: number;
  complexity?: "beginner" | "intermediate" | "advanced";
  sourceCount?: number;
}

const COMPLEXITY_COLORS: Record<string, string> = {
  beginner: "#27ca40",
  intermediate: "#eab308",
  advanced: "#ef4444",
};

export function ReadingMeta({ readingTimeSeconds, complexity, sourceCount }: ReadingMetaProps) {
  const minutes = readingTimeSeconds ? Math.ceil(readingTimeSeconds / 60) : 0;

  const showTime = readingTimeSeconds && readingTimeSeconds > 0;
  const showComplexity = !!complexity;
  const showSources = sourceCount && sourceCount > 0;

  if (!showTime && !showComplexity && !showSources) return null;

  return (
    <div className="flex flex-row gap-3 items-center">
      {showTime && (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--ts-muted)" }}>
          <Clock size={12} />
          {minutes} min read
        </span>
      )}
      {showComplexity && (
        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ts-muted)" }}>
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: COMPLEXITY_COLORS[complexity] }}
          />
          {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
        </span>
      )}
      {showSources && (
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--ts-muted)" }}>
          <FileText size={12} />
          {sourceCount} sources
        </span>
      )}
    </div>
  );
}
