"use client";

import { useState } from "react";
import { Share2, Check, Bookmark, History } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { YouTubeRecs } from "@/components/learning-brief";
import type { LearningBriefYouTubeRec } from "@/components/learning-brief";
import { getCategoryColor } from "@/lib/utils/category-colors";

// ── Types ──────────────────────────────────────────────────────────────────

interface SearchSidebarProps {
  youtubeRecs: LearningBriefYouTubeRec[];
  relatedTopics: string[];
  isLoggedIn: boolean;
}

// ── Related topic generator ────────────────────────────────────────────────

const TOPIC_MAP: Record<string, string[]> = {
  rag: ["Vector databases", "Embeddings", "LangChain", "Retrieval systems", "Semantic search"],
  llm: ["Fine-tuning", "Prompt engineering", "Transformer architecture", "Token limits", "RLHF"],
  gpt: ["OpenAI API", "Claude", "Gemini", "LLM comparison", "AI safety"],
  agent: ["AutoGPT", "LangChain agents", "Tool use", "ReAct pattern", "Multi-agent systems"],
  transformer: ["Attention mechanism", "BERT", "GPT architecture", "Positional encoding", "Self-attention"],
  diffusion: ["Stable Diffusion", "DALL-E", "Image generation", "ControlNet", "LoRA training"],
  openai: ["GPT-4", "ChatGPT API", "Whisper", "DALL-E 3", "OpenAI pricing"],
  claude: ["Anthropic", "Constitutional AI", "Claude API", "System prompts", "Long context"],
  embedding: ["Vector search", "Cosine similarity", "Text chunking", "RAG pipelines", "Sentence transformers"],
  default: ["AI safety", "Open-source models", "LLM benchmarks", "AI regulation", "Multi-modal AI"],
};

export function getRelatedTopics(query: string): string[] {
  const q = query.toLowerCase();
  for (const [key, topics] of Object.entries(TOPIC_MAP)) {
    if (key === "default") continue;
    if (q.includes(key)) return topics.slice(0, 5);
  }
  return TOPIC_MAP.default;
}

import { headingFont } from "@/lib/constants";

// ── Component ──────────────────────────────────────────────────────────────

export function SearchSidebar({
  youtubeRecs,
  relatedTopics,
  isLoggedIn,
}: SearchSidebarProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleTopicClick(topic: string) {
    const slug = topic
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    router.push(`/s/${slug}?q=${encodeURIComponent(topic)}`);
  }

  return (
    <div
      className="flex flex-col gap-6 lg:sticky lg:top-[80px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto"
      style={{ scrollbarWidth: "none" }}
    >
      {/* YouTube Recs */}
      {youtubeRecs.length > 0 && (
        <div
          className="rounded-xl"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{
              color: "var(--ts-muted)",
              fontFamily: headingFont,
              fontVariant: "small-caps",
            }}
          >
            Go Deeper
          </p>
          <YouTubeRecs recs={youtubeRecs} />
        </div>
      )}

      {/* Related Topics */}
      {relatedTopics.length > 0 && (
        <div
          className="rounded-xl"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{
              color: "var(--ts-muted)",
              fontFamily: headingFont,
              fontVariant: "small-caps",
            }}
          >
            Related Topics
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedTopics.map((topic) => {
              // Derive a color from the topic text for visual variety
              const topicLower = topic.toLowerCase();
              let color = "var(--ts-accent)";
              if (topicLower.includes("model") || topicLower.includes("gpt") || topicLower.includes("claude") || topicLower.includes("llm")) color = getCategoryColor("models");
              else if (topicLower.includes("tool") || topicLower.includes("api") || topicLower.includes("sdk") || topicLower.includes("chain")) color = getCategoryColor("tools");
              else if (topicLower.includes("research") || topicLower.includes("paper") || topicLower.includes("benchmark")) color = getCategoryColor("research");
              else if (topicLower.includes("safe") || topicLower.includes("ethic") || topicLower.includes("regul")) color = getCategoryColor("ethics");
              else if (topicLower.includes("open") || topicLower.includes("source")) color = getCategoryColor("open-source");

              return (
                <button
                  key={topic}
                  onClick={() => handleTopicClick(topic)}
                  className="pill-interactive rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: `${color}15`,
                    border: `1px solid ${color}25`,
                    color: color,
                  }}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        className="rounded-xl"
        style={{
          background: "var(--ts-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.25rem",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <div className="flex flex-col gap-2">
          {/* Share button */}
          <button
            onClick={handleShare}
            className="btn-secondary flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-xs font-medium"
            style={{
              background: copied
                ? "rgba(52,211,153,0.08)"
                : "transparent",
              color: copied
                ? "var(--success, #34d399)"
                : "var(--ts-text-2)",
            }}
          >
            {copied ? (
              <>
                <Check size={14} />
                Copied!
              </>
            ) : (
              <>
                <Share2 size={14} />
                Share this brief
              </>
            )}
          </button>

          {/* Save to knowledge — logged-in only */}
          {isLoggedIn && (
            <button
              className="btn-secondary flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-xs font-medium"
              style={{
                background: "transparent",
                color: "var(--ts-text-2)",
              }}
            >
              <Bookmark size={14} />
              Save to knowledge
            </button>
          )}

          {/* Search history link — logged-in only */}
          {isLoggedIn && (
            <Link
              href="/history"
              className="btn-secondary flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-xs font-medium"
              style={{
                background: "transparent",
                color: "var(--ts-text-2)",
              }}
            >
              <History size={14} />
              Search history
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
