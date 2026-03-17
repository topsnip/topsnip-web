"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface UnreadTopic {
  topic_id: string;
  title: string;
  slug: string;
  trending_score: number;
}

interface KnowledgeSummary {
  unread_important: UnreadTopic[];
  topics_read: number;
  total_time_sec: number;
}

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

export function LearningDebt({
  userId,
  isPro,
}: {
  userId: string;
  isPro: boolean;
}) {
  const [topics, setTopics] = useState<UnreadTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPro) {
      setLoading(false);
      return;
    }

    async function fetchDebt() {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_knowledge_summary", {
        p_user_id: userId,
      });

      if (!error && data) {
        const summary = data as KnowledgeSummary;
        // Take max 3 unread important topics
        setTopics((summary.unread_important ?? []).slice(0, 3));
      }
      setLoading(false);
    }

    fetchDebt();
  }, [userId, isPro]);

  if (!isPro || loading || topics.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-10"
      style={{ animation: "fadeInUp 0.35s ease 0.3s both" }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{
            background: "var(--ts-accent-8)",
            border: "1px solid var(--ts-accent-20)",
            color: "var(--ts-accent)",
          }}
        >
          !
        </div>
        <h2
          className="text-base font-semibold text-white"
          style={{ fontFamily: headingFont }}
        >
          You might have missed
        </h2>
      </div>

      {/* Topic list */}
      <div className="flex flex-col gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.topic_id}
            href={`/topic/${topic.slug}`}
            className="group flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-colors"
            style={{
              background: "var(--ts-surface)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            <span
              className="text-sm font-medium text-white truncate group-hover:underline"
              style={{ fontFamily: headingFont }}
            >
              {topic.title}
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
              style={{
                background:
                  topic.trending_score >= 70
                    ? "var(--ts-accent-8)"
                    : "var(--ts-surface)",
                color:
                  topic.trending_score >= 70
                    ? "var(--ts-accent)"
                    : "var(--ts-muted)",
                border: `1px solid ${topic.trending_score >= 70 ? "var(--ts-accent-20)" : "var(--border)"}`,
              }}
            >
              {Math.round(topic.trending_score)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
