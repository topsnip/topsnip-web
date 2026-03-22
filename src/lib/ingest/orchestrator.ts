import type { SupabaseClient } from "@supabase/supabase-js";
import type { Source, FetchResult, IngestRunResult } from "./types";
import { fetchHN, fetchRSS, fetchReddit, fetchYouTube, fetchArxiv, fetchGitHub } from "./fetchers";
import { scoreAndDedup } from "./scorer";
import { sanitizeText, sanitizeUrl } from "./safe-fetch";
import { classifyTopicSmart } from "../content/topic-classifier";

/** Max items to store per source per run */
const MAX_ITEMS_PER_SOURCE = 100;

/** Max engagement history entries to keep per item */
const MAX_ENGAGEMENT_SNAPSHOTS = 20;

/**
 * Run a single fetch for one source based on its platform type.
 */
async function fetchSource(source: Source): Promise<FetchResult> {
  switch (source.platform) {
    case "hn":
      return fetchHN(source.id);
    case "reddit":
      return fetchReddit(source.id);
    case "rss":
      return fetchRSS(source.id, source.url);
    case "youtube":
      return fetchYouTube(source.id);
    case "arxiv":
      return fetchArxiv(source.id);
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

  // Update each item with new snapshot
  for (const item of items) {
    const history: Array<{ score: number; timestamp: string }> =
      Array.isArray(item.engagement_history) ? item.engagement_history : [];

    // Add new snapshot
    history.push({ score: item.engagement_score || 0, timestamp: now });

    // Prune to last N entries
    const pruned = history.slice(-MAX_ENGAGEMENT_SNAPSHOTS);

    const { error: updateErr } = await supabase
      .from("source_items")
      .update({ engagement_history: pruned })
      .eq("id", item.id);

    if (updateErr) {
      errors.push(`Engagement snapshot update failed for ${item.id}: ${updateErr.message}`);
    }
  }
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

  // 1. Load active sources
  const { data: sources, error: srcErr } = await supabase
    .from("sources")
    .select("*")
    .eq("is_active", true);

  if (srcErr || !sources) {
    return {
      fetchedSources: 0,
      newItems: 0,
      newTopics: 0,
      errors: [`Failed to load sources: ${srcErr?.message}`],
      durationMs: Date.now() - start,
    };
  }

  // 2. Fetch from all sources in parallel
  const fetchResults = await Promise.allSettled(
    sources.map((source) => fetchSource(source as Source))
  );

  // 3. Process results
  const allUpsertedIds: string[] = [];

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
      const rows = cappedItems.map((item) => ({
        source_id: item.sourceId,
        external_id: item.externalId,
        title: sanitizeText(item.title),
        url: sanitizeUrl(item.url),
        content_snippet: sanitizeText(item.contentSnippet),
        engagement_score: item.engagementScore,
        published_at: item.publishedAt,
        ingested_at: new Date().toISOString(),
      }));

      const { data: upserted, error: upsertErr } = await supabase
        .from("source_items")
        .upsert(rows, { onConflict: "source_id,external_id", ignoreDuplicates: true })
        .select("id");

      if (upsertErr) {
        errors.push(`Upsert failed for ${source.name}: ${upsertErr.message}`);
      } else {
        const ids = (upserted || []).map((r: { id: string }) => r.id);
        allUpsertedIds.push(...ids);
        newItems += ids.length;
      }
    }
  }

  // 4. Snapshot engagement scores for velocity tracking
  await snapshotEngagement(supabase, allUpsertedIds, errors);

  // 5. Score and detect new topics (velocity-based with clustering)
  const candidates = await scoreAndDedup(supabase, 1);

  // 6. Insert new topics with topic_type and enrichment fields
  for (const candidate of candidates.slice(0, 10)) {
    // Check if topic already exists — append date suffix on collision instead of dropping
    let slug = candidate.slug;
    const { data: existing } = await supabase
      .from("topics")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      slug = `${slug}-${new Date().toISOString().split("T")[0]}`;
      // If even the date-suffixed slug exists, skip this topic
      const { data: existingWithDate } = await supabase
        .from("topics")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existingWithDate) continue;
    }

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
        slug: slug,
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
