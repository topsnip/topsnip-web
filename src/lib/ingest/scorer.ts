import type { SupabaseClient } from "@supabase/supabase-js";
import type { TopicCandidate, Platform } from "./types";
import { clusterItems, type SourceItemWithPlatform } from "./clusterer";


/**
 * Slugify a title for URL-friendly topic identifiers.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/-$/, "");
}

/**
 * Compute engagement velocity from an item's engagement_history snapshots.
 *
 * velocity = engagement_delta / hours_between_snapshots
 *
 * Falls back to raw engagement score when fewer than 2 snapshots exist.
 */
function computeVelocity(
  engagementHistory: Array<{ score: number; timestamp: string }> | undefined,
  currentEngagement: number
): number {
  if (!engagementHistory || engagementHistory.length < 2) {
    // No velocity data yet — fall back to engagement volume (log-scaled)
    return Math.log10(Math.max(currentEngagement, 1) + 1);
  }

  // Use the last two snapshots
  const latest = engagementHistory[engagementHistory.length - 1];
  const previous = engagementHistory[engagementHistory.length - 2];

  const delta = latest.score - previous.score;
  const hoursBetween =
    (new Date(latest.timestamp).getTime() - new Date(previous.timestamp).getTime()) /
    (1000 * 60 * 60);

  // Avoid division by zero or near-zero
  if (hoursBetween < 0.01) {
    return Math.log10(Math.max(currentEngagement, 1) + 1);
  }

  // Velocity can be negative (declining interest) — clamp to 0
  return Math.max(delta / hoursBetween, 0);
}

/**
 * Velocity-based trending score.
 *
 * trending_score = velocity × source_diversity × recency
 *
 * where:
 *   velocity = engagement_delta / hours_between_snapshots
 *   source_diversity = 1 + log2(distinct_platform_count)
 *   recency = exp(-age_hours / 12)  // 12-hour half-life
 */
function computeTrendingScore(
  velocity: number,
  platformCount: number,
  earliestDate: Date
): number {
  const hoursAge = (Date.now() - earliestDate.getTime()) / (1000 * 60 * 60);
  const recency = Math.exp(-hoursAge / 12);
  const sourceDiversity = 1 + Math.log2(Math.max(platformCount, 1));

  return velocity * sourceDiversity * recency;
}


/**
 * Score and deduplicate source items into topic candidates.
 *
 * Pipeline:
 * 1. Fetch recent source_items (last 48 hours) with platform info
 * 2. Compute engagement velocity from snapshots
 * 3. Cluster items via SimHash + entity Jaccard
 * 4. Score each cluster using velocity x source_diversity x recency
 * 5. Return TopicCandidate[] sorted by trending_score descending
 */
export async function scoreAndDedup(
  supabase: SupabaseClient,
  minPlatforms: number = 1,
  similarityThreshold: number = 0.4
): Promise<TopicCandidate[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: items, error } = await supabase
    .from("source_items")
    .select(
      "id, title, content_snippet, engagement_score, engagement_history, published_at, ingested_at, source_id, sources!inner(platform)"
    )
    .gte("ingested_at", cutoff)
    .order("ingested_at", { ascending: false })
    .limit(500);

  if (error || !items || items.length === 0) {
    return [];
  }

  // Exclude source_items that already belong to a topic — otherwise the same
  // items re-cluster every ingestion run and produce duplicate topic candidates.
  const itemIds = items.map((i: Record<string, any>) => i.id as string);
  const { data: linkedRows } = await supabase
    .from("topic_sources")
    .select("source_item_id")
    .in("source_item_id", itemIds);

  const linkedIds = new Set((linkedRows ?? []).map((r: { source_item_id: string }) => r.source_item_id));
  const unlinkedItems = items.filter((item: Record<string, any>) => !linkedIds.has(item.id));

  if (unlinkedItems.length === 0) {
    return [];
  }

  // Map DB rows to SourceItemWithPlatform
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase .rpc() returns untyped rows
  const mapped: SourceItemWithPlatform[] = unlinkedItems.map((item: Record<string, any>) => ({
    id: item.id,
    title: item.title,
    content_snippet: item.content_snippet || "",
    engagement_score: item.engagement_score || 0,
    published_at: item.published_at,
    ingested_at: item.ingested_at,
    source_id: item.source_id,
    platform: (item.sources?.platform as Platform) || "rss",
    engagement_history: item.engagement_history || undefined,
  }));

  // Cluster items via SimHash + entity Jaccard
  const clusters = clusterItems(mapped);

  // Score each cluster and convert to TopicCandidate
  const candidates: TopicCandidate[] = clusters
    .filter((c) => c.platforms.size >= minPlatforms)
    .map((cluster) => {
      // Velocity-based scoring
      let totalVelocity = 0;
      for (const item of cluster.items) {
        totalVelocity += computeVelocity(
          item.engagement_history,
          item.engagement_score
        );
      }
      const trendingScore = computeTrendingScore(
        totalVelocity,
        cluster.platforms.size,
        cluster.earliestDate
      );

      return {
        title: cluster.bestTitle,
        slug: slugify(cluster.bestTitle),
        sourceItemIds: cluster.items.map((i) => i.id),
        platforms: Array.from(cluster.platforms) as Platform[],
        trendingScore,
        platformCount: cluster.platforms.size,
        sourceCount: cluster.items.length,
        firstDetectedAt: cluster.earliestDate.toISOString(),
      };
    })
    .sort((a, b) => b.trendingScore - a.trendingScore);

  return candidates;
}
