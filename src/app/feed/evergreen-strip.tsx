"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  Target,
  Link as LinkIcon,
  Zap,
  Shield,
  MessageSquare,
  Brain,
  Layers,
  Network,
  GitBranch,
  Rocket,
  DollarSign,
  Eye,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { headingFont } from "@/lib/constants";

// ── Icon mapping ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  "what-is-rag": BookOpen,
  "ai-agents-101": Bot,
  "fine-tuning-llms": Target,
  "what-is-mcp": LinkIcon,
  "vector-databases": Zap,
  "ai-safety-basics": Shield,
  "prompt-engineering": MessageSquare,
  "how-llms-work": Brain,
  "embeddings-explained": Layers,
  "transformer-architecture": Network,
  "open-vs-closed-models": GitBranch,
  "ai-in-production": Rocket,
  "cost-of-running-llms": DollarSign,
  "multimodal-ai": Eye,
  "agentic-workflows": Workflow,
};

function getEvergreenIcon(slug: string): LucideIcon {
  return ICON_MAP[slug] ?? BookOpen;
}

// ── Types ───────────────────────────────────────────────────────────────────

interface EvergreenStripProps {
  topics: { id: string; slug: string; title: string; subtitle: string }[];
}

// ── Component ───────────────────────────────────────────────────────────────

export function EvergreenStrip({ topics }: EvergreenStripProps) {
  if (topics.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-white"
          style={{
            fontFamily: headingFont,
            fontSize: "var(--text-xl)",
            fontWeight: 400,
          }}
        >
          Learn the Fundamentals
        </h2>
        <Link
          href="/topic"
          className="text-xs font-medium link-interactive"
          style={{ color: "var(--ts-accent)" }}
        >
          Browse all &rarr;
        </Link>
      </div>

      {/* Scroll container */}
      <div
        className="relative"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        }}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
            scrollbarColor: "#2a2a2e transparent",
          }}
        >
          {topics.map((topic) => {
            const Icon = getEvergreenIcon(topic.slug);
            return (
              <Link
                key={topic.id}
                href={`/topic/${topic.slug}`}
                className="group flex-shrink-0 rounded-xl p-4 transition-colors duration-200"
                style={{
                  minWidth: 160,
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                  scrollSnapAlign: "start",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--ts-accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
              >
                <Icon
                  size={20}
                  className="mb-2"
                  style={{ color: "var(--ts-accent)" }}
                />
                <div
                  className="text-sm font-semibold text-white mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {topic.title}
                </div>
                <div
                  className="text-xs whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ color: "var(--ts-text-2)" }}
                >
                  {topic.subtitle}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </motion.section>
  );
}
