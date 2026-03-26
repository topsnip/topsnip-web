import type { SupabaseClient } from "@supabase/supabase-js";
import type { TopicCandidate, Platform } from "./types";
import { clusterItems, type SourceItemWithPlatform } from "./clusterer";
import { featureFlags } from "../feature-flags";

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
 * Normalize a title for fuzzy matching.
 * Strips common prefixes, lowercases, removes punctuation.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^(show hn|ask hn|launch hn|tell hn):\s*/i, "")
    .replace(/[\[\](){}'"]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
 * Legacy title-similarity clustering fallback.
 * Groups items whose normalized titles share >= 60% of words.
 * Used when USE_CLUSTERING feature flag is disabled.
 */
function clusterByTitleSimilarity(
  items: SourceItemWithPlatform[]
): Array<{
  items: SourceItemWithPlatform[];
  platforms: Set<string>;
  bestTitle: string;
  earliestDate: Date;
}> {
  const clusters: Array<{
    items: SourceItemWithPlatform[];
    platforms: Set<string>;
    bestTitle: string;
    earliestDate: Date;
    words: Set<string>;
  }> = [];

  for (const item of items) {
    const normalized = normalizeTitle(item.title);
    const words = new Set(normalized.split(" ").filter((w) => w.length > 2));

    let matched = false;
    for (const cluster of clusters) {
      // Check word overlap
      let overlap = 0;
      for (const w of words) {
        if (cluster.words.has(w)) overlap++;
      }
      const similarity =
        words.size === 0 ? 0 : overlap / Math.max(words.size, cluster.words.size);

      if (similarity >= 0.6) {
        cluster.items.push(item);
        cluster.platforms.add(item.platform);
        for (const w of words) cluster.words.add(w);
        // Pick best title by engagement
        if (item.engagement_score > (cluster.items[0]?.engagement_score ?? 0)) {
          cluster.bestTitle = item.title;
        }
        const itemDate = new Date(item.published_at ?? item.ingested_at);
        if (itemDate < cluster.earliestDate) cluster.earliestDate = itemDate;
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({
        items: [item],
        platforms: new Set([item.platform]),
        bestTitle: item.title,
        earliestDate: new Date(item.published_at ?? item.ingested_at),
        words,
      });
    }
  }

  return clusters;
}

/**
 * Legacy volume-based trending score (no velocity).
 * trending_score = log(total_engagement) × platform_diversity × recency
 */
function computeVolumeTrendingScore(
  totalEngagement: number,
  platformCount: number,
  earliestDate: Date
): number {
  const hoursAge = (Date.now() - earliestDate.getTime()) / (1000 * 60 * 60);
  const recency = Math.exp(-hoursAge / 12);
  const sourceDiversity = 1 + Math.log2(Math.max(platformCount, 1));
  const volume = Math.log10(Math.max(totalEngagement, 1) + 1);

  return volume * sourceDiversity * recency;
}

/**
 * Score and deduplicate source items into topic candidates.
 *
 * Three-tier system:
 * 1. Fetch recent source_items (last 48 hours) with platform info
 * 2. Compute engagement velocity from snapshots (or volume if flag off)
 * 3. Cluster items via SimHash + entity Jaccard (or title similarity if flag off)
 * 4. Score each cluster using velocity × source_diversity × recency
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

  // Map DB rows to SourceItemWithPlatform
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase .rpc() returns untyped rows
  const mapped: SourceItemWithPlatform[] = items.map((item: Record<string, any>) => ({
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

  // Cluster items — use SimHash+entity Jaccard or legacy title similarity
  const clusters = featureFlags.USE_CLUSTERING
    ? clusterItems(mapped)
    : clusterByTitleSimilarity(mapped);

  // Score each cluster and convert to TopicCandidate
  const candidates: TopicCandidate[] = clusters
    .filter((c) => c.platforms.size >= minPlatforms)
    .map((cluster) => {
      let trendingScore: number;

      if (featureFlags.USE_VELOCITY_SCORING) {
        // Velocity-based scoring
        let totalVelocity = 0;
        for (const item of cluster.items) {
          totalVelocity += computeVelocity(
            item.engagement_history,
            item.engagement_score
          );
        }
        trendingScore = computeTrendingScore(
          totalVelocity,
          cluster.platforms.size,
          cluster.earliestDate
        );
      } else {
        // Legacy volume-based scoring
        const totalEngagement = cluster.items.reduce(
          (sum, item) => sum + item.engagement_score,
          0
        );
        trendingScore = computeVolumeTrendingScore(
          totalEngagement,
          cluster.platforms.size,
          cluster.earliestDate
        );
      }

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
