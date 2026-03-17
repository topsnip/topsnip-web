"use client";

import { useState, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SourceCitationSource {
  title: string;
  url: string;
  platform?: string;
}

export interface SourceCitationProps {
  number: number;
  source: SourceCitationSource;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SourceCitation({ number, source }: SourceCitationProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  function handleClick() {
    window.open(source.url, "_blank", "noopener,noreferrer");
  }

  return (
    <span
      ref={containerRef}
      className="source-citation"
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <button
        onClick={handleClick}
        className="source-citation-badge"
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--ts-accent)",
          background: "rgba(232,115,74,0.1)",
          borderRadius: "4px",
          padding: "1px 5px",
          cursor: "pointer",
          verticalAlign: "super",
          border: "none",
          lineHeight: 1,
          transition: "background 150ms ease, transform 150ms ease",
        }}
        aria-label={`Source ${number}: ${source.title}`}
      >
        [{number}]
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <span
          className="source-citation-tooltip"
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%) translateY(-8px)",
            maxWidth: "320px",
            minWidth: "200px",
            background: "var(--ts-surface)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 50,
            pointerEvents: "none",
            animation: "sourceTooltipIn 150ms var(--ease-out-expo) both",
          }}
        >
          {/* Platform badge */}
          {source.platform && (
            <span
              className="block text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: "var(--ts-muted)" }}
            >
              {source.platform}
            </span>
          )}

          {/* Title */}
          <span
            className="block text-xs font-medium leading-snug mb-2"
            style={{
              color: "var(--foreground)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {source.title}
          </span>

          {/* CTA hint */}
          <span
            className="block text-[10px]"
            style={{ color: "var(--ts-accent)" }}
          >
            Click to visit &rarr;
          </span>
        </span>
      )}

      {/* Tooltip animation keyframes injected via style tag (once) */}
      <style jsx>{`
        @keyframes sourceTooltipIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(-8px);
          }
        }
        .source-citation-badge:hover {
          background: rgba(232, 115, 74, 0.18) !important;
          transform: scale(1.05);
        }
      `}</style>
    </span>
  );
}
