// Content generation orchestrator
// Picks up detected topics → generates content for all roles → finds YouTube recs → builds daily digest.
// Called by the /api/content/generate route.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentGenerationRunResult } from "./types";
import { generateForTopic } from "./generator";
import { findAndSaveYouTubeRecs } from "./youtube-recs";
import { buildDailyDigests } from "./quiet-day";

/** Max topics to process per run (budget guard — each topic = ~5 Claude calls)
 * Vercel Hobby has 60s function limit. Each topic ~10-15s. Keep at 2 for safety. */
const MAX_TOPICS_PER_RUN = 2;

/**
 * Full content generation pipeline:
 * 1. Find topics with status "detected"
 * 2. Generate content for all roles
 * 3. Find YouTube recommendations
 * 4. Build daily digests
 */
export async function runContentGeneration(
  supabase: SupabaseClient
): Promise<ContentGenerationRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let contentGenerated = 0;
  let topicsPublished = 0;

  // 1. Find detected topics, ordered by trending score (most important first)
  const { data: pendingTopics, error: fetchErr } = await supabase
    .from("topics")
    .select("id, title, trending_score")
    .eq("status", "detected")
    .order("trending_score", { ascending: false })
    .limit(MAX_TOPICS_PER_RUN);

  if (fetchErr) {
    return {
      topicsProcessed: 0,
      contentGenerated: 0,
      topicsPublished: 0,
      isQuietDay: false,
      errors: [`Failed to fetch topics: ${fetchErr.message}`],
      durationMs: Date.now() - start,
    };
  }

  const topics = pendingTopics ?? [];

  // 2. Generate content for each topic (sequentially to respect API rate limits)
  for (const topic of topics) {
    try {
      const result = await generateForTopic(supabase, topic.id);
      const rolesGenerated = Object.keys(result.contentByRole).length;
      contentGenerated += rolesGenerated;

      if (result.errors.length > 0) {
        errors.push(...result.errors.map((e) => `${topic.title}: ${e}`));
      }

      // Check if topic was published (status updated by generator)
      const { data: updated } = await supabase
        .from("topics")
        .select("status")
        .eq("id", topic.id)
        .single();

      if (updated?.status === "published") {
        topicsPublished++;

        // 3. Find YouTube recommendations for published topics
        const { error: ytErr } = await findAndSaveYouTubeRecs(
          supabase,
          topic.id,
          topic.title
        );
        if (ytErr) {
          errors.push(`YouTube recs for "${topic.title}": ${ytErr}`);
        }
      }
    } catch (err) {
      errors.push(
        `Topic "${topic.title}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // 4. Build daily digests
  const today = new Date().toISOString().split("T")[0];
  const digestResult = await buildDailyDigests(supabase, today);
  if (digestResult.error) {
    errors.push(`Digest: ${digestResult.error}`);
  }

  return {
    topicsProcessed: topics.length,
    contentGenerated,
    topicsPublished,
    isQuietDay: digestResult.isQuietDay,
    errors,
    durationMs: Date.now() - start,
  };
}
