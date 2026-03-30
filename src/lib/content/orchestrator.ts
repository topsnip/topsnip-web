// Content generation orchestrator
// Picks up detected topics -> generates content for all roles -> finds YouTube recs -> builds daily digest.
// Called by the /api/content/generate route.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentGenerationRunResult, TopicGenerationResult } from "./types";
import { generateForTopic } from "./generator";
import { findAndSaveYouTubeRecs } from "./youtube-recs";
import { buildDailyDigests } from "./quiet-day";
import { sleep } from "./retry";

/** Max topics to process per run — now supports parallel generation */
const MAX_TOPICS_PER_RUN = 3;

/** Stagger delay between topic starts to avoid rate limit spikes */
const STAGGER_DELAY_MS = 5_000;

/** Per-topic timeout */
const PER_TOPIC_TIMEOUT_MS = 90_000;

/** Run-level timeout — 110s to leave 10s buffer before Vercel's 120s maxDuration kills it */
const RUN_TIMEOUT_MS = 110_000;

/** Max Claude API calls per day (each topic = ~4 role calls + 1 quality check = ~5) */
const MAX_DAILY_API_CALLS = 200;

/** Approximate calls per topic (4 roles + 1 quality check) */
const CALLS_PER_TOPIC = 5;

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

/** Check daily API call budget — count topic_content rows generated in last 24h × CALLS_PER_TOPIC */
async function checkDailyBudget(supabase: SupabaseClient): Promise<{ allowed: boolean; used: number }> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("topic_content")
      .select("id", { count: "exact", head: true })
      .gte("generated_at", twentyFourHoursAgo);

    if (error) {
      console.warn(`Failed to check daily budget: ${error.message}`);
      // Allow generation on budget check failure — don't block on non-critical errors
      return { allowed: true, used: 0 };
    }

    // Each topic_content row represents ~1 role generation call
    // Approximate total API calls = rows (role calls) + rows/4 (quality checks, 1 per topic)
    const rowCount = count ?? 0;
    const estimatedCalls = rowCount + Math.ceil(rowCount / 4);
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
 * Full content generation pipeline:
 * 1. Check daily API budget
 * 2. Find topics with status "detected"
 * 3. Generate content for all roles (up to 3 topics in parallel with staggered starts)
 * 4. Find YouTube recommendations
 * 5. Build daily digests
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
  // Skip evergreen topics — they have hardcoded content and no source items
  const { data: pendingTopics, error: fetchErr } = await supabase
    .from("topics")
    .select("id, title, trending_score")
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
    // No topics to process — still run digests
    const today = new Date().toISOString().split("T")[0];
    const digestResult = await buildDailyDigests(supabase, today);
    if (digestResult.error) {
      errors.push(`Digest: ${digestResult.error}`);
    }

    return {
      topicsProcessed: 0,
      contentGenerated: 0,
      topicsPublished: 0,
      isQuietDay: digestResult.isQuietDay,
      errors,
      durationMs: Date.now() - start,
    };
  }

  // 2. Generate content for topics in parallel with staggered starts
  const topicPromises: Promise<{ topic: typeof topics[0]; result: TopicGenerationResult } | null>[] = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const delay = i * STAGGER_DELAY_MS;

    const promise = (async () => {
      if (delay > 0) await sleep(delay);

      // Check if we've exceeded the run timeout before starting
      if (Date.now() - start > RUN_TIMEOUT_MS - PER_TOPIC_TIMEOUT_MS) {
        errors.push(`Skipping topic "${topic.title}" — insufficient time remaining in run`);
        return null;
      }

      try {
        const result = await withTimeout(
          generateForTopic(supabase, topic.id),
          PER_TOPIC_TIMEOUT_MS,
          `topic "${topic.title}"`
        );
        return { topic, result };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Topic "${topic.title}": ${errMsg}`);

        // On rate limit (429), warn but don't retry — the per-call retry in generator handles it
        if (errMsg.includes("429") || errMsg.includes("rate")) {
          console.warn(`Rate limit hit processing "${topic.title}" — degrading`);
        }
        return null;
      }
    })();

    topicPromises.push(promise);
  }

  // Wait for all topics with run-level timeout
  const remainingTime = Math.max(0, RUN_TIMEOUT_MS - (Date.now() - start));
  let topicResults: ({ topic: typeof topics[0]; result: TopicGenerationResult } | null)[];

  try {
    topicResults = await withTimeout(
      Promise.all(topicPromises),
      remainingTime,
      "all topics"
    );
  } catch {
    // Run-level timeout — collect whatever finished
    console.warn("Run-level timeout reached, collecting partial results");
    topicResults = await Promise.all(
      topicPromises.map((p) => p.catch(() => null))
    );
  }

  // 3. Process results and find YouTube recs for published topics
  for (const entry of topicResults) {
    if (!entry) continue;

    const { topic, result } = entry;
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

      // Find YouTube recommendations for published topics
      const { error: ytErr } = await findAndSaveYouTubeRecs(
        supabase,
        topic.id,
        topic.title
      );
      if (ytErr) {
        errors.push(`YouTube recs for "${topic.title}": ${ytErr}`);
      }
    }
  }

  // 4. Build daily digests
  const today = new Date().toISOString().split("T")[0];
  const digestResult = await buildDailyDigests(supabase, today);
  if (digestResult.error) {
    errors.push(`Digest: ${digestResult.error}`);
  }

  return {
    topicsProcessed: topicResults.filter((r) => r !== null).length,
    contentGenerated,
    topicsPublished,
    isQuietDay: digestResult.isQuietDay,
    errors,
    durationMs: Date.now() - start,
  };
}
