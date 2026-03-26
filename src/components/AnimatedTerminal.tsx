"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface SearchTopic {
  query: string;
  videos: number;
  sources: string[];
  extra: string;
  tldr: string[];
  slug: string;
}

interface TerminalLine {
  text: string;
  color: string;
  indent?: number;
  bold?: boolean;
}

// ── Data ────────────────────────────────────────────────────────────────────

const SEARCH_TOPICS: SearchTopic[] = [
  {
    query: "latest AI news 2026",
    videos: 8,
    sources: [
      'The AI Advantage — "AI News This Week"',
      'Matt Wolfe — "Top AI Tools June 2026"',
      'Two Minute Papers — "New Breakthroughs"',
    ],
    extra: "+5 more transcripts extracted",
    tldr: [
      "Google unveiled Gemini 3 Ultra with",
      "native tool-use. OpenAI shipped GPT-5",
      "Turbo. Claude 4 dominates coding.",
    ],
    slug: "latest-ai-news-2026",
  },
  {
    query: "What is MCP?",
    videos: 8,
    sources: [
      'Fireship — "MCP in 100 Seconds"',
      'AI Jason — "MCP: USB-C for AI"',
      'Anthropic — "Introducing MCP"',
    ],
    extra: "+5 more transcripts extracted",
    tldr: [
      "MCP (Model Context Protocol) is an",
      "open standard by Anthropic connecting",
      "AI to tools — like USB-C for models.",
    ],
    slug: "what-is-mcp",
  },
  {
    query: "Claude Code tips",
    videos: 6,
    sources: [
      'Cursor Team — "Claude in Cursor"',
      'Theo — "Claude Code Is Insane"',
      'Primeagen — "Coding with Claude"',
    ],
    extra: "+3 more transcripts extracted",
    tldr: [
      "Use /compact to save context. Let",
      "Claude plan before coding. Break tasks",
      "into small diffs for best results.",
    ],
    slug: "claude-code-tips",
  },
  {
    query: "RAG vs fine-tuning",
    videos: 7,
    sources: [
      'IBM Technology — "RAG Explained"',
      'Sam Witteveen — "When to Fine-Tune"',
      'Weights & Biases — "RAG at Scale"',
    ],
    extra: "+4 more transcripts extracted",
    tldr: [
      "Use RAG for dynamic knowledge that",
      "changes often. Fine-tune for style and",
      "domain-specific behavior patterns.",
    ],
    slug: "rag-vs-fine-tuning",
  },
];

// ── Colors ──────────────────────────────────────────────────────────────────

const C = {
  accent: "var(--ts-accent, #e8734a)",
  accent2: "var(--ts-accent-2, #f59e6c)",
  muted: "var(--ts-muted, #6b7280)",
  green: "var(--ts-green, #27ca40)",
  blue: "var(--ts-blue, #3b82f6)",
  yellow: "#eab308",
  command: "#c0c0c0",
  white: "#e4e4e7",
  surface: "var(--ts-surface, #161618)",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildLines(topic: SearchTopic): TerminalLine[] {
  const lines: TerminalLine[] = [];

  // Search line
  lines.push({ text: `\u{1F50D} Searching YouTube for top results...`, color: C.muted });
  // Found line
  lines.push({ text: `\u2713 Found ${topic.videos} relevant videos`, color: C.green, bold: true });
  // Extracting
  lines.push({ text: `\u{1F4C4} Extracting transcripts...`, color: C.yellow });
  // Sources
  for (const src of topic.sources) {
    lines.push({ text: `   \u2192 ${src}`, color: C.white, indent: 1 });
  }
  // Extra
  lines.push({ text: `   ${topic.extra}`, color: C.muted, indent: 1 });
  // Synthesizing
  lines.push({ text: `\u{1F9E0} Claude AI is synthesizing...`, color: C.accent2 });
  // TL;DR separator
  lines.push({ text: `\u2500\u2500\u2500 TL;DR \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`, color: C.accent });
  // TL;DR lines
  for (const line of topic.tldr) {
    lines.push({ text: `  ${line}`, color: C.white });
  }
  // Bottom separator
  lines.push({ text: `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`, color: C.accent });
  // Link
  lines.push({
    text: `\u{1F517} topsnip.app/brief/${topic.slug}`,
    color: C.blue,
  });

  return lines;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AnimatedTerminal() {
  const [typedCommand, setTypedCommand] = useState("");
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const topicIndexRef = useRef(0);
  const mountedRef = useRef(true);

  // Schedule a timeout that gets cleaned up on unmount
  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (mountedRef.current) fn();
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = [];
  }, []);

  // Run the full animation for one topic
  const animateTopic = useCallback(() => {
    if (!mountedRef.current) return;

    const topic = SEARCH_TOPICS[topicIndexRef.current];
    const command = `topsnip search "${topic.query}"`;
    const lines = buildLines(topic);

    // Reset state
    setTypedCommand("");
    setVisibleLines([]);
    setFadeOut(false);
    setShowCursor(true);

    let delay = 0;

    // Phase 1: Type the command character by character
    for (let i = 0; i <= command.length; i++) {
      const charDelay = delay + i * 45;
      schedule(() => {
        setTypedCommand(command.slice(0, i));
      }, charDelay);
    }
    delay += command.length * 45 + 300;

    // Hide cursor after typing
    schedule(() => setShowCursor(false), delay);

    // Phase 2: Reveal lines one by one
    for (let i = 0; i < lines.length; i++) {
      const lineDelay =
        delay +
        i * 350 + // base per-line delay
        (i >= 3 && i < 3 + topic.sources.length ? 150 : 0); // extra pause for sources

      schedule(() => {
        setVisibleLines((prev) => [...prev, lines[i]]);
      }, lineDelay);

      delay = lineDelay;
    }

    // Phase 3: Wait, then fade out
    delay += 3000;
    schedule(() => setFadeOut(true), delay);

    // Phase 4: After fade, start next topic
    delay += 800;
    schedule(() => {
      topicIndexRef.current =
        (topicIndexRef.current + 1) % SEARCH_TOPICS.length;
      animateTopic();
    }, delay);
  }, [schedule]);

  // Boot animation on mount
  useEffect(() => {
    mountedRef.current = true;
    animateTopic();

    return () => {
      mountedRef.current = false;
      clearAllTimeouts();
    };
  }, [animateTopic, clearAllTimeouts]);

  // Blinking cursor interval
  const [cursorVisible, setCursorVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={styles.wrapper}>
      {/* Terminal chrome */}
      <div style={styles.frame}>
        {/* Title bar */}
        <div style={styles.titleBar}>
          <div style={styles.dots}>
            <span style={{ ...styles.dot, background: "#ff5f57" }} />
            <span style={{ ...styles.dot, background: "#febc2e" }} />
            <span style={{ ...styles.dot, background: "#28c840" }} />
          </div>
          <div style={styles.titleText}>
            <span>topsnip</span>
            <span style={styles.titleSep}> — </span>
            <span style={styles.liveLabel}>
              <span style={styles.liveDot} />
              live
            </span>
          </div>
          <div style={styles.dots}>
            {/* Spacer for centering */}
            <span style={{ ...styles.dot, background: "transparent" }} />
            <span style={{ ...styles.dot, background: "transparent" }} />
            <span style={{ ...styles.dot, background: "transparent" }} />
          </div>
        </div>

        {/* Terminal body */}
        <div
          style={{
            ...styles.body,
            opacity: fadeOut ? 0 : 1,
            transition: "opacity 0.6s ease",
          }}
        >
          {/* Prompt + typed command */}
          <div style={styles.promptLine}>
            <span style={{ color: C.accent, fontWeight: 700 }}>$ </span>
            <span style={{ color: C.command }}>{typedCommand}</span>
            {showCursor && (
              <span
                style={{
                  ...styles.cursor,
                  opacity: cursorVisible ? 1 : 0,
                }}
              />
            )}
          </div>

          {/* Output lines */}
          {visibleLines.map((line, i) => (
            <div
              key={i}
              style={{
                color: line.color,
                fontWeight: line.bold ? 700 : 400,
                lineHeight: 1.7,
                whiteSpace: "pre",
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: "100%",
    maxWidth: 640,
    margin: "0 auto",
  },
  frame: {
    borderRadius: 16,
    border: "1px solid var(--border, rgba(255,255,255,0.08))",
    background: C.surface,
    overflow: "hidden",
    boxShadow:
      "0 20px 80px rgba(0,0,0,0.5), 0 0 60px rgba(232,115,74,0.1)",
  },
  titleBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "rgba(0,0,0,0.3)",
    borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
  },
  dots: {
    display: "flex",
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    display: "inline-block",
  },
  titleText: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  titleSep: {
    color: C.muted,
  },
  liveLabel: {
    color: C.green,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: C.green,
    display: "inline-block",
    boxShadow: "0 0 6px rgba(39,202,64,0.6)",
  },
  body: {
    padding: "20px 24px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    lineHeight: 1.7,
    minHeight: 320,
  },
  promptLine: {
    display: "flex",
    alignItems: "center",
    lineHeight: 1.7,
    marginBottom: 4,
  },
  cursor: {
    display: "inline-block",
    width: 7,
    height: 14,
    background: C.accent,
    marginLeft: 1,
    verticalAlign: "middle",
    transition: "opacity 0.1s",
  },
};
