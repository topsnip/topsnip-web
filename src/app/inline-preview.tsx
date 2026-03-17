"use client";

import { Sparkles, Layers } from "lucide-react";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

export function InlinePreview() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <p
        className="text-sm text-center"
        style={{ color: "var(--ts-muted)" }}
      >
        Here&apos;s what a TopSnip brief looks like
      </p>

      <div
        className="rounded-2xl p-6 flex flex-col gap-4 transition-transform duration-300"
        style={{
          background: "var(--ts-surface)",
          border: "1px solid var(--ts-accent-20)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.03), 0 0 40px -15px var(--ts-glow)",
          cursor: "default",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform =
            "perspective(1000px) rotateY(2deg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform =
            "perspective(1000px) rotateY(0deg)";
        }}
      >
        {/* Label */}
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "var(--ts-accent)" }} />
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--ts-accent)", fontFamily: headingFont }}
          >
            Example Brief
          </span>
        </div>

        {/* Topic title */}
        <p
          className="text-lg font-bold text-white"
          style={{ fontFamily: headingFont }}
        >
          What is Model Context Protocol (MCP)?
        </p>

        {/* TL;DR */}
        <div
          className="rounded-lg p-4 tldr-card"
          style={{
            background: "var(--ts-surface-2)",
            borderTop: "none",
            borderRight: "none",
            borderBottom: "none",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--ts-accent)" }}
          >
            TL;DR
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--foreground)" }}
          >
            MCP is a standard that lets AI assistants connect to external tools
            and data sources. Think of it as USB-C for AI — one universal plug
            instead of custom integrations for every tool.
          </p>
        </div>

        {/* What Happened (truncated) */}
        <div className="relative">
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--ts-text-2)" }}
          >
            Anthropic released MCP in late 2024 as an open protocol that
            standardizes how AI models interact with external systems. Before
            MCP, every AI tool integration required custom code — a different
            connector for Slack, another for GitHub, another for your database...
          </p>
          {/* Fade-out gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--ts-surface))",
            }}
          />
        </div>

        {/* Sign up CTA */}
        <p className="text-sm font-medium" style={{ color: "var(--ts-accent)" }}>
          Sign up to read more &rarr;
        </p>

        {/* Source count */}
        <div className="flex items-center gap-2">
          <Layers size={12} style={{ color: "var(--ts-muted)" }} />
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            Sourced from 8 platforms — official docs, HN, Reddit, GitHub
          </p>
        </div>
      </div>
    </div>
  );
}
