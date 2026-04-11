// Content generation orchestrator — v3
// Picks up detected topics -> generates cards + learn briefs -> finds YouTube recs.
// Called by the /api/content/generate route.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentGenerationRunResult } from "./types";
import type { TopicType } from "./types";
import { generateCard } from "./card-generator";
import { findAndSaveYouTubeRecs } from "./youtube-recs";
import { isAIRelevant } from "./relevance-filter";
import { sleep } from "./retry";

/** Max topics to process per run */
const MAX_TOPICS_PER_RUN = 3;

/** Stagger delay between topic starts to avoid rate limit spikes */
const STAGGER_DELAY_MS = 5_000;

/** Per-topic timeout */
const PER_TOPIC_TIMEOUT_MS = 90_000;

/** Run-level timeout — 110s to leave 10s buffer before Vercel's 120s maxDuration kills it */
const RUN_TIMEOUT_MS = 110_000;

/** Max Claude API calls per day (v3: each topic = ~1 card gen call + 1 quality check = ~2) */
const MAX_DAILY_API_CALLS = 200;

/** Approximate calls per topic (1 card gen + 1 quality check) */
const CALLS_PER_TOPIC = 2;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Wrap a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout after ${ms}ms: ${label}`)),
      ms
    );
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/** Check daily API call budget — count topic_cards rows generated in last 24h */
async function checkDailyBudget(supabase: SupabaseClient): Promise<{ allowed: boolean; used: number }> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("topic_cards")
      .select("id", { count: "exact", head: true })
      .gte("generated_at", twentyFourHoursAgo);

    if (error) {
      console.warn(`Failed to check daily budget: ${error.message}`);
      return { allowed: true, used: 0 };
    }

    const rowCount = count ?? 0;
    const estimatedCalls = rowCount * CALLS_PER_TOPIC;
    const allowed = estimatedCalls < MAX_DAILY_API_CALLS;

    if (!allowed) {
      console.warn(`Daily API budget exceeded: ~${estimatedCalls} calls in last 24h (limit: ${MAX_DAILY_API_CALLS})`);
    }

    return { allowed, used: estimatedCalls };
  } catch (err) {
    console.warn(`Daily budget check error: ${err instanceof Error ? err.message : String(err)}`);
    return { allowed: true, used: 0 };
  }
}

/**
 * Full content generation pipeline (v3):
 * 1. Check daily API budget
 * 2. Find topics with status "detected"
 * 3. Generate card + learn brief for each topic
 * 4. Find YouTube recommendations
 * 5. Publish topics
 */
export async function runContentGeneration(
  supabase: SupabaseClient
): Promise<ContentGenerationRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let contentGenerated = 0;
  let topicsPublished = 0;

  // 0. Check daily API budget
  const budget = await checkDailyBudget(supabase);
  if (!budget.allowed) {
    return {
      topicsProcessed: 0,
      contentGenerated: 0,
      topicsPublished: 0,
      isQuietDay: false,
      errors: [`Daily API budget exceeded (~${budget.used} calls). Skipping generation.`],
      durationMs: Date.now() - start,
    };
  }

  // 1. Find detected topics, ordered by trending score (most important first)
  const { data: pendingTopics, error: fetchErr } = await supabase
    .from("topics")
    .select("id, slug, title, trending_score, topic_type")
    .eq("status", "detected")
    .eq("is_evergreen", false)
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

  if (topics.length === 0) {
    return {
      topicsProcessed: 0,
      contentGenerated: 0,
      topicsPublished: 0,
      isQuietDay: true,
      errors,
      durationMs: Date.now() - start,
    };
  }

  // 2. Generate cards for topics in parallel with staggered starts
  const topicPromises = topics.map((topic, i) => {
    const delay = i * STAGGER_DELAY_MS;

    return (async () => {
      if (delay > 0) await sleep(delay);

      // Check if we've exceeded the run timeout before starting
      if (Date.now() - start > RUN_TIMEOUT_MS - PER_TOPIC_TIMEOUT_MS) {
        errors.push(`Skipping topic "${topic.title}" — insufficient time remaining in run`);
        return null;
      }

      try {
        // Fetch source snippets for this topic
        const { data: topicSources } = await supabase
          .from("topic_sources")
          .select("source_items(title, content_snippet, url)")
          .eq("topic_id", topic.id);

        const sourceSnippets = (topicSources ?? []).map((ts: any) => {
          const item = ts.source_items;
          return `${item?.title ?? ""}: ${item?.content_snippet ?? ""} (${item?.url ?? ""})`;
        }).filter(Boolean);

        // AI relevance check — reject non-AI content before wasting Claude API calls
        if (!isAIRelevant(topic.title, sourceSnippets)) {
          await supabase
            .from("topics")
            .update({ status: "rejected" })
            .eq("id", topic.id);
          return null;
        }

        const result = await withTimeout(
          generateCard(
            supabase,
            topic.id,
            topic.slug,
            topic.title,
            sourceSnippets,
            (topic.topic_type as TopicType) || "industry_news"
          ),
          PER_TOPIC_TIMEOUT_MS,
          `topic "${topic.title}"`
        );

        return { topic, result };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Topic "${topic.title}": ${errMsg}`);
        if (errMsg.includes("429") || errMsg.includes("rate")) {
          console.warn(`Rate limit hit processing "${topic.title}" — degrading`);
        }
        return null;
      }
    })();
  });

  // Wait for all topics with run-level timeout
  const remainingTime = Math.max(0, RUN_TIMEOUT_MS - (Date.now() - start));
  let topicResults: (typeof topicPromises extends Promise<infer T>[] ? T : never)[];

  try {
    topicResults = await withTimeout(
      Promise.all(topicPromises),
      remainingTime,
      "all topics"
    );
  } catch {
    console.warn("Run-level timeout reached, collecting partial results");
    topicResults = await Promise.all(
      topicPromises.map((p) => p.catch(() => null))
    );
  }

  // 3. Process results — publish topics and find YouTube recs
  for (const entry of topicResults) {
    if (!entry?.result) continue;

    const { topic, result } = entry;
    contentGenerated++;

    // Publish the topic
    const { error: publishErr } = await supabase
      .from("topics")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", topic.id);

    if (publishErr) {
      errors.push(`Failed to publish "${topic.title}": ${publishErr.message}`);
      continue;
    }

    topicsPublished++;

    // Find YouTube recommendations
    const { error: ytErr } = await findAndSaveYouTubeRecs(
      supabase,
      topic.id,
      topic.title
    );
    if (ytErr) {
      errors.push(`YouTube recs for "${topic.title}": ${ytErr}`);
    }
  }

  return {
    topicsProcessed: topicResults.filter((r) => r !== null).length,
    contentGenerated,
    topicsPublished,
    isQuietDay: topicsPublished === 0,
    errors,
    durationMs: Date.now() - start,
  };
}
