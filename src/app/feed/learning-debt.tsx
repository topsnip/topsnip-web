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
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--ts-text-2)" }}
        >
          You might want to catch up on:
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--ts-muted)" }}
        >
          Just 3 minutes each
        </span>
      </div>

      {/* Topic pills */}
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.topic_id}
            href={`/topic/${topic.slug}`}
            className="pill-interactive group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--ts-accent-6)",
              border: "1px solid var(--ts-accent-10)",
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            <span className="group-hover:underline">{topic.title}</span>
            {topic.trending_score >= 70 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  background: "var(--ts-accent-8)",
                  color: "var(--ts-accent)",
                }}
              >
                HOT
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
