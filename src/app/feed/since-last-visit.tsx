"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

interface SinceLastVisitTopic {
  topic_id: string;
  topic_title: string;
  topic_slug: string;
  tldr: string;
  published_at: string;
  trending_score: number;
}

function decodeHtml(text: string): string {
  if (typeof window === "undefined") return text;
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

interface SinceLastVisitProps {
  topics: SinceLastVisitTopic[];
}

export function SinceLastVisit({ topics }: SinceLastVisitProps) {
  // Default: open if <= 3, closed if > 3
  const [isOpen, setIsOpen] = useState(topics.length <= 3);

  if (topics.length === 0) return null;

  return (
    <section className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full cursor-pointer mb-3 select-none group"
        style={{ background: "none", border: "none", padding: 0 }}
        aria-expanded={isOpen}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)", fontFamily: headingFont }}
        >
          Since you were last here
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
          style={{
            background: "var(--ts-accent-8)",
            color: "var(--ts-accent)",
            border: "1px solid var(--ts-accent-20)",
          }}
        >
          {topics.length} topic{topics.length === 1 ? "" : "s"}
        </span>
        <motion.span
          className="ml-auto"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDown size={14} style={{ color: "var(--ts-muted)" }} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{
                background: "var(--ts-accent-3)",
                border: "1px solid var(--ts-accent-6)",
              }}
            >
              {topics.map((topic, i) => (
                <motion.div
                  key={topic.topic_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: i * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={`/topic/${topic.topic_slug}`}
                    className="flex flex-col gap-1 rounded-lg px-3 py-2.5 transition-colors hover:brightness-110"
                    style={{
                      background: "var(--ts-surface)",
                      border: "1px solid var(--border)",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      className="text-sm font-medium text-white"
                      style={{ fontFamily: headingFont }}
                    >
                      {decodeHtml(topic.topic_title)}
                    </span>
                    {topic.tldr && (
                      <span
                        className="text-xs line-clamp-1"
                        style={{ color: "var(--ts-text-2)" }}
                      >
                        {decodeHtml(topic.tldr)}
                      </span>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
