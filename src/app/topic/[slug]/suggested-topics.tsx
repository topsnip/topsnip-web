import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { decodeHtml } from "@/lib/utils/decode-html";
import { getCategoryColor } from "@/lib/utils/category-colors";
import { mapTopicToCategory } from "@/lib/utils/category-mapper";
import { headingFont } from "@/lib/constants";
import { Clock } from "lucide-react";
import { SuggestedTopicsCarousel } from "./suggested-topics-carousel";

interface SuggestedTopic {
  id: string;
  slug: string;
  title: string;
  tldr: string | null;
  readTime: number;
  categoryTag: string;
}

interface SuggestedTopicsProps {
  currentTopicId: string;
  currentTopicType: string | null;
}

/**
 * Server component that fetches related topics and renders a carousel.
 * Relation logic: same topic_type, then fallback to recent published topics.
 * Minimum 3 results, maximum 5.
 */
export async function SuggestedTopics({
  currentTopicId,
  currentTopicType,
}: SuggestedTopicsProps) {
  const supabase = await createClient();
  const results: SuggestedTopic[] = [];
  const seenIds = new Set<string>();

  // 1. Try to find topics with the same topic_type
  if (currentTopicType) {
    const { data: sameType } = await supabase
      .from("topics")
      .select("id, slug, title, topic_type, published_at")
      .eq("status", "published")
      .eq("topic_type", currentTopicType)
      .neq("id", currentTopicId)
      .order("published_at", { ascending: false })
      .limit(5);

    if (sameType) {
      for (const t of sameType) {
        if (seenIds.has(t.id)) continue;
        seenIds.add(t.id);

        const { data: tc } = await supabase
          .from("topic_content")
          .select("tldr, what_happened, so_what, now_what")
          .eq("topic_id", t.id)
          .eq("role", "general")
          .single();

        const decodedTitle = decodeHtml(t.title);
        const tldr = tc?.tldr ? decodeHtml(tc.tldr) : null;
        const wordCount = [tc?.tldr, tc?.what_happened, tc?.so_what, tc?.now_what]
          .filter(Boolean)
          .join(" ")
          .split(/\s+/).length;

        results.push({
          id: t.id,
          slug: t.slug,
          title: decodedTitle,
          tldr,
          readTime: Math.max(1, Math.ceil(wordCount / 200)),
          categoryTag: mapTopicToCategory(decodedTitle),
        });
      }
    }
  }

  // 2. Pad with recent published topics if fewer than 3
  if (results.length < 3) {
    const needed = 5 - results.length;
    const excludeIds = [currentTopicId, ...Array.from(seenIds)];

    const { data: recent } = await supabase
      .from("topics")
      .select("id, slug, title, published_at")
      .eq("status", "published")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("published_at", { ascending: false })
      .limit(needed);

    if (recent) {
      for (const t of recent) {
        if (seenIds.has(t.id)) continue;
        seenIds.add(t.id);

        const { data: tc } = await supabase
          .from("topic_content")
          .select("tldr, what_happened, so_what, now_what")
          .eq("topic_id", t.id)
          .eq("role", "general")
          .single();

        const decodedTitle = decodeHtml(t.title);
        const tldr = tc?.tldr ? decodeHtml(tc.tldr) : null;
        const wordCount = [tc?.tldr, tc?.what_happened, tc?.so_what, tc?.now_what]
          .filter(Boolean)
          .join(" ")
          .split(/\s+/).length;

        results.push({
          id: t.id,
          slug: t.slug,
          title: decodedTitle,
          tldr,
          readTime: Math.max(1, Math.ceil(wordCount / 200)),
          categoryTag: mapTopicToCategory(decodedTitle),
        });
      }
    }
  }

  if (results.length === 0) return null;

  return (
    <section className="mt-16 mb-8">
      {/* Section header */}
      <div className="mb-6">
        <h2
          className="text-white inline-block"
          style={{
            fontFamily: headingFont,
            fontSize: "var(--text-xl)",
          }}
        >
          Keep Learning
        </h2>
        <div
          className="h-0.5 mt-2 rounded-full"
          style={{
            width: "80px",
            background: "linear-gradient(90deg, var(--ts-accent), transparent)",
          }}
        />
      </div>

      {/* Client carousel wrapper */}
      <SuggestedTopicsCarousel topics={results} />
    </section>
  );
}
