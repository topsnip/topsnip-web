import type { SupabaseClient } from "@supabase/supabase-js";
import type { TopicCandidate, Platform } from "./types";

/**
 * Slugify a title for URL-friendly topic identifiers.
 */
function slugify(title: string): string {
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
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^(show hn|ask hn|launch hn|tell hn):\s*/i, "")
    .replace(/[\[\](){}'"]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple similarity check — do two titles share enough meaningful words?
 * Returns a score 0-1.
 */
function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(normalizeTitle(b).split(" ").filter((w) => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }

  const minSize = Math.min(wordsA.size, wordsB.size);
  // Short titles (< 2 meaningful words) require exact overlap to avoid false matches
  if (minSize < 2) {
    return overlap === minSize ? 1 : 0;
  }
  return overlap / minSize;
}

/**
 * Compute a trending score for a topic candidate.
 *
 * Formula: engagement × platformMultiplier × recencyDecay
 * - engagement: sum of engagement scores from all source items
 * - platformMultiplier: 1.5x per additional platform (2 platforms = 1.5, 3 = 2.25)
 * - recencyDecay: exponential decay over 48 hours
 */
function computeTrendingScore(
  totalEngagement: number,
  platformCount: number,
  firstDetectedAt: Date
): number {
  const hoursAge = (Date.now() - firstDetectedAt.getTime()) / (1000 * 60 * 60);
  const recencyDecay = Math.exp(-hoursAge / 24); // Half-life ~24 hours
  const platformMultiplier = Math.pow(1.5, platformCount - 1);

  // Log-scale engagement to prevent viral items from dominating
  const engagementScore = Math.log10(Math.max(totalEngagement, 1) + 1);

  return engagementScore * platformMultiplier * recencyDecay;
}

/**
 * Score and deduplicate source items into topic candidates.
 *
 * Steps:
 * 1. Fetch all recent source_items (last 48 hours) with their platform info
 * 2. Group by similarity (fuzzy title matching)
 * 3. Score each group by cross-platform signal + engagement + recency
 * 4. Return topics that meet the threshold
 */
export async function scoreAndDedup(
  supabase: SupabaseClient,
  minPlatforms: number = 1,
  similarityThreshold: number = 0.5
): Promise<TopicCandidate[]> {
  // Fetch recent source items with their source platform
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: items, error } = await supabase
    .from("source_items")
    .select("id, title, engagement_score, published_at, ingested_at, source_id, sources!inner(platform)")
    .gte("ingested_at", cutoff)
    .order("ingested_at", { ascending: false })
    .limit(500);

  if (error || !items || items.length === 0) {
    return [];
  }

  // Group items by similarity
  const groups: Array<{
    items: typeof items;
    platforms: Set<Platform>;
    totalEngagement: number;
    bestEngagement: number;
    earliestDate: Date;
    bestTitle: string;
  }> = [];

  for (const item of items) {
    let matched = false;

    for (const group of groups) {
      if (titleSimilarity(item.title, group.bestTitle) >= similarityThreshold) {
        group.items.push(item);
        const platform = (item as any).sources?.platform as Platform;
        if (platform) group.platforms.add(platform);
        group.totalEngagement += item.engagement_score || 0;
        const itemDate = new Date(item.published_at || item.ingested_at);
        if (itemDate < group.earliestDate) {
          group.earliestDate = itemDate;
        }
        // Keep the highest-engagement title as the best
        if ((item.engagement_score || 0) > group.bestEngagement) {
          group.bestEngagement = item.engagement_score || 0;
          group.bestTitle = item.title;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      const platform = (item as any).sources?.platform as Platform;
      groups.push({
        items: [item],
        platforms: new Set(platform ? [platform] : []),
        totalEngagement: item.engagement_score || 0,
        bestEngagement: item.engagement_score || 0,
        earliestDate: new Date(item.published_at || item.ingested_at),
        bestTitle: item.title,
      });
    }
  }

  // Convert groups to topic candidates and score them
  const candidates: TopicCandidate[] = groups
    .filter((g) => g.platforms.size >= minPlatforms)
    .map((g) => ({
      title: g.bestTitle,
      slug: slugify(g.bestTitle),
      sourceItemIds: g.items.map((i) => i.id),
      platforms: Array.from(g.platforms),
      trendingScore: computeTrendingScore(
        g.totalEngagement,
        g.platforms.size,
        g.earliestDate
      ),
      platformCount: g.platforms.size,
      firstDetectedAt: g.earliestDate.toISOString(),
    }))
    .sort((a, b) => b.trendingScore - a.trendingScore);

  return candidates;
}
