import type { SupabaseClient } from "@supabase/supabase-js";
import type { Source, FetchResult, IngestRunResult } from "./types";
import { fetchHN, fetchRSS, fetchReddit, fetchYouTube, fetchArxiv, fetchGitHub } from "./fetchers";
import { scoreAndDedup } from "./scorer";
import { sanitizeText, sanitizeUrl, isSafeUrl } from "./safe-fetch";
import { classifyTopicSmart } from "../content/topic-classifier";
import { computeSimHash, isDuplicate } from "./simhash";
import { extractEntities } from "./ai-entities";
import { jaccardSimilarity } from "./clusterer";

/** Max items to store per source per run */
const MAX_ITEMS_PER_SOURCE = 100;

/** Max engagement history entries to keep per item */
const MAX_ENGAGEMENT_SNAPSHOTS = 20;

/** Max parallel source fetches — protects remote rate limits and Vercel runtime */
const FETCH_CONCURRENCY = 5;

/** Run N async tasks with a concurrency cap. Preserves input ordering. */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function runLane() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      try {
        const value = await worker(items[i]);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const lanes = Array.from({ length: Math.min(limit, items.length) }, () => runLane());
  await Promise.all(lanes);
  return results;
}

async function runLimited<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  async function lane() {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}

export function mergeTopicAggregates(
  existing: {
    trending_score: number | null;
    source_count: number | null;
    platforms: string[] | null;
  },
  candidate: {
    trendingScore: number;
    sourceCount: number;
    platforms: string[];
  }
) {
  const platforms = Array.from(new Set([...(existing.platforms ?? []), ...candidate.platforms]));
  return {
    trending_score: Math.max(existing.trending_score ?? 0, candidate.trendingScore),
    source_count: Math.max(existing.source_count ?? 0, 0) + candidate.sourceCount,
    platform_count: platforms.length,
    platforms,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Run a single fetch for one source based on its platform type.
 */
async function fetchSource(source: Source): Promise<FetchResult> {
  switch (source.platform) {
    case "hn":
      return fetchHN(source.id);
    case "reddit":
      return fetchReddit(source.id, source.url);
    case "rss":
      return fetchRSS(source.id, source.url);
    case "youtube":
      return fetchYouTube(source.id);
    case "arxiv":
      return fetchArxiv(source.id, source.url);
    case "github":
      return fetchGitHub(source.id);
    default:
      return { sourceId: source.id, items: [], health: "degraded", error: `Unknown platform: ${source.platform}` };
  }
}

/**
 * Snapshot engagement scores into engagement_history jsonb for velocity tracking.
 * Appends a new snapshot and prunes to the last MAX_ENGAGEMENT_SNAPSHOTS entries.
 */
async function snapshotEngagement(
  supabase: SupabaseClient,
  upsertedIds: string[],
  errors: string[]
): Promise<void> {
  if (upsertedIds.length === 0) return;

  const now = new Date().toISOString();

  // Fetch current engagement scores and history for upserted items
  const { data: items, error: fetchErr } = await supabase
    .from("source_items")
    .select("id, engagement_score, engagement_history")
    .in("id", upsertedIds);

  if (fetchErr || !items) {
    errors.push(`Engagement snapshot fetch failed: ${fetchErr?.message}`);
    return;
  }

  const updateErrors: string[] = [];

  await runLimited(items, 10, async (item) => {
    const history: Array<{ score: number; timestamp: string }> =
      Array.isArray(item.engagement_history) ? item.engagement_history : [];

    history.push({ score: item.engagement_score || 0, timestamp: now });
    const pruned = history.slice(-MAX_ENGAGEMENT_SNAPSHOTS);

    const { error: updateErr } = await supabase
      .from("source_items")
      .update({ engagement_history: pruned })
      .eq("id", item.id);

    if (updateErr) {
      updateErrors.push(`Engagement snapshot update failed for ${item.id}: ${updateErr.message}`);
    }
  });

  errors.push(...updateErrors);
}

/**
 * Main ingestion orchestrator.
 *
 * 1. Load active sources from DB
 * 2. Fetch items from each source (in parallel, grouped by platform)
 * 3. Upsert new items into source_items
 * 4. Snapshot engagement scores for velocity tracking
 * 5. Update source health + last_checked_at
 * 6. Run topic scoring/dedup (velocity-based with clustering)
 * 7. Insert new topics with topic_type classification
 */
export async function runIngestion(supabase: SupabaseClient): Promise<IngestRunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let newItems = 0;
  let newTopics = 0;

  // 1. Load active sources, filtered to those whose check_interval_min has elapsed
  //    since last_checked_at. last_checked_at NULL means "never fetched", always due.
  const { data: allSources, error: srcErr } = await supabase
    .from("sources")
    .select("*")
    .eq("is_active", true);

  if (srcErr || !allSources) {
    return {
      fetchedSources: 0,
      newItems: 0,
      newTopics: 0,
      errors: [`Failed to load sources: ${srcErr?.message}`],
      durationMs: Date.now() - start,
    };
  }

  const now = Date.now();
  const sources = (allSources as Source[]).filter((s) => {
    if (!s.last_checked_at) return true;
    const intervalMs = (s.check_interval_min ?? 120) * 60_000;
    return now - new Date(s.last_checked_at).getTime() >= intervalMs;
  });

  if (sources.length === 0) {
    return {
      fetchedSources: 0,
      newItems: 0,
      newTopics: 0,
      errors: [],
      durationMs: Date.now() - start,
    };
  }

  // 2. Fetch from sources with a concurrency cap
  const fetchResults = await runWithConcurrency(
    sources as Source[],
    FETCH_CONCURRENCY,
    (source) => fetchSource(source),
  );

  // 3. Process results
  const touchedSourceItemIds: string[] = [];

  for (let i = 0; i < fetchResults.length; i++) {
    const source = sources[i];
    const result = fetchResults[i];

    if (result.status === "rejected") {
      errors.push(`Source ${source.name}: ${result.reason}`);
      await supabase
        .from("sources")
        .update({ health_status: "down", last_checked_at: new Date().toISOString() })
        .eq("id", source.id);
      continue;
    }

    const fetchResult = result.value;

    // Update source health
    await supabase
      .from("sources")
      .update({
        health_status: fetchResult.health,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    if (fetchResult.error) {
      errors.push(`Source ${source.name}: ${fetchResult.error}`);
    }

    // Upsert items (skip duplicates via unique constraint)
    // Cap per source to prevent memory/DB pressure
    const cappedItems = fetchResult.items.slice(0, MAX_ITEMS_PER_SOURCE);

    if (cappedItems.length > 0) {
      const rows = cappedItems.map((item) => {
        // Defense-in-depth: validate stored URLs against SSRF
        const safeUrl = isSafeUrl(item.url) ? item.url : "";
        return {
          source_id: item.sourceId,
          external_id: item.externalId,
          title: sanitizeText(item.title),
          url: sanitizeUrl(safeUrl),
          content_snippet: sanitizeText(item.contentSnippet),
          engagement_score: item.engagementScore,
          published_at: item.publishedAt,
          ingested_at: new Date().toISOString(),
        };
      });

      const { data: upserted, error: upsertErr } = await supabase
        .from("source_items")
        .upsert(rows, { onConflict: "source_id,external_id" })
        .select("id");

      if (upsertErr) {
        errors.push(`Upsert failed for ${source.name}: ${upsertErr.message}`);
      } else {
        const ids = (upserted || []).map((r: { id: string }) => r.id);
        touchedSourceItemIds.push(...ids);
        newItems += ids.length;
      }
    }
  }

  // 4. Snapshot engagement scores for velocity tracking
  await snapshotEngagement(supabase, touchedSourceItemIds, errors);

  // 5. Score and detect new topics (velocity-based with clustering)
  const candidates = await scoreAndDedup(supabase, 1);

  // 6. Fetch recent topics once for cross-run duplicate detection
  const dedupLookback = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentTopicRows } = await supabase
    .from("topics")
    .select("id, title")
    .gte("first_detected_at", dedupLookback)
    .in("status", ["detected", "generating", "published"]);

  const recentTopics = (recentTopicRows ?? []).map((t: { id: string; title: string }) => ({
    id: t.id,
    title: t.title,
    simhash: computeSimHash(t.title),
    entities: new Set(extractEntities(t.title)),
  }));

  const TITLE_JACCARD_THRESHOLD = 0.6;

  // 7. Insert new topics with topic_type and enrichment fields
  for (const candidate of candidates.slice(0, 10)) {
    // Cross-run dedup: check if this candidate matches an existing recent topic.
    // If so, link source items to the existing topic instead of creating a duplicate.
    const candSimhash = computeSimHash(candidate.title);
    const candEntities = new Set(extractEntities(candidate.title));

    let mergeTargetId: string | null = null;
    for (const existing of recentTopics) {
      if (isDuplicate(candSimhash, existing.simhash)) {
        mergeTargetId = existing.id;
        break;
      }
      if (
        existing.entities.size > 0 &&
        candEntities.size > 0 &&
        jaccardSimilarity(candEntities, existing.entities) >= TITLE_JACCARD_THRESHOLD
      ) {
        mergeTargetId = existing.id;
        break;
      }
    }

    if (mergeTargetId) {
      console.log(`[Ingest] Merging "${candidate.title}" into existing topic ${mergeTargetId}`);
      if (candidate.sourceItemIds.length > 0) {
        const links = candidate.sourceItemIds.map((siId) => ({
          topic_id: mergeTargetId,
          source_item_id: siId,
        }));
        await supabase
          .from("topic_sources")
          .upsert(links, { onConflict: "topic_id,source_item_id", ignoreDuplicates: true });
      }

      const { data: existingTopic } = await supabase
        .from("topics")
        .select("trending_score, source_count, platforms")
        .eq("id", mergeTargetId)
        .maybeSingle();

      if (existingTopic) {
        await supabase
          .from("topics")
          .update(mergeTopicAggregates(existingTopic, candidate))
          .eq("id", mergeTargetId);
      }
      continue;
    }

    // Find unique slug with counter fallback
    const slug = candidate.slug;
    let finalSlug = slug;
    let suffix = 2;
    while (true) {
      const { data: existing } = await supabase
        .from("topics")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (!existing) break;
      finalSlug = `${slug}-${suffix}`;
      suffix++;
      if (suffix > 10) {
        console.warn(`[Ingest] Slug collision limit reached for "${slug}", skipping`);
        break; // Safety valve
      }
    }
    if (suffix > 10) continue; // Skip this topic

    // Classify topic type using smart classifier (keyword-first, LLM fallback)
    const topicType = await classifyTopicSmart(
      candidate.title,
      [], // No content snippets at this stage — title-only classification
      candidate.platforms
    );

    // Insert new topic
    const { data: topic, error: topicErr } = await supabase
      .from("topics")
      .insert({
        slug: finalSlug,
        title: sanitizeText(candidate.title),
        status: "detected",
        trending_score: candidate.trendingScore,
        platform_count: candidate.platformCount,
        source_count: candidate.sourceCount,
        platforms: candidate.platforms,
        topic_type: topicType,
        enrichment_status: "pending",
        first_detected_at: candidate.firstDetectedAt,
        is_breaking: candidate.trendingScore > 5,
      })
      .select("id")
      .single();

    if (topicErr) {
      errors.push(`Topic insert failed for "${candidate.title}": ${topicErr.message}`);
      continue;
    }

    // Link topic to source items
    if (topic && candidate.sourceItemIds.length > 0) {
      const links = candidate.sourceItemIds.map((siId) => ({
        topic_id: topic.id,
        source_item_id: siId,
      }));

      await supabase
        .from("topic_sources")
        .upsert(links, { onConflict: "topic_id,source_item_id", ignoreDuplicates: true });
    }

    // Append to in-memory dedup set so later candidates in this run merge into this topic
    if (topic) {
      recentTopics.push({
        id: topic.id,
        title: candidate.title,
        simhash: candSimhash,
        entities: candEntities,
      });
    }

    newTopics++;
  }

  return {
    fetchedSources: sources.length,
    newItems,
    newTopics,
    errors,
    durationMs: Date.now() - start,
  };
}
