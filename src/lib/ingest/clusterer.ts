/**
 * Story clustering engine — groups source items about the same story.
 *
 * Two-pass algorithm:
 * 1. SimHash near-duplicate detection (Hamming distance ≤ 3)
 * 2. Entity-based Jaccard similarity merge (threshold ≥ 0.4)
 */

import type { Platform } from "./types";
import { computeSimHash, isDuplicate } from "./simhash";
import { extractEntities } from "./ai-entities";

/** A source item with its platform info attached */
export interface SourceItemWithPlatform {
  id: string;
  title: string;
  content_snippet: string;
  engagement_score: number;
  published_at: string | null;
  ingested_at: string;
  source_id: string;
  platform: Platform;
  engagement_history?: Array<{ score: number; timestamp: string }>;
}

/** A cluster of source items covering the same story */
export interface StoryCluster {
  items: SourceItemWithPlatform[];
  platforms: Set<string>;
  entities: Set<string>;
  totalEngagement: number;
  bestTitle: string;
  earliestDate: Date;
}

interface ItemMeta {
  item: SourceItemWithPlatform;
  simhash: bigint;
  entities: Set<string>;
}

/**
 * Compute Jaccard similarity between two sets.
 * Returns 0-1 where 1 means identical sets.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Cluster source items by content similarity.
 *
 * Pass 1: Group by SimHash (Hamming distance ≤ 3) — catches near-exact duplicates.
 * Pass 2: Merge groups by Jaccard similarity on entity sets (≥ 0.4) — catches related stories.
 */
export function clusterItems(items: SourceItemWithPlatform[]): StoryCluster[] {
  if (items.length === 0) return [];

  // Precompute SimHash and entities for each item
  const metas: ItemMeta[] = items.map((item) => {
    const text = `${item.title} ${item.content_snippet || ""}`;
    return {
      item,
      simhash: computeSimHash(text),
      entities: new Set(extractEntities(text)),
    };
  });

  // ── Pass 1: SimHash grouping ────────────────────────────────────────────
  const simGroups: ItemMeta[][] = [];

  for (const meta of metas) {
    let matched = false;

    for (const group of simGroups) {
      // Compare against the first item in the group as representative
      if (isDuplicate(meta.simhash, group[0].simhash)) {
        group.push(meta);
        matched = true;
        break;
      }
    }

    if (!matched) {
      simGroups.push([meta]);
    }
  }

  // Build intermediate clusters from SimHash groups
  interface IntermediateCluster {
    metas: ItemMeta[];
    mergedEntities: Set<string>;
  }

  let clusters: IntermediateCluster[] = simGroups.map((group) => {
    const merged = new Set<string>();
    for (const m of group) {
      for (const e of m.entities) merged.add(e);
    }
    return { metas: group, mergedEntities: merged };
  });

  // ── Pass 2: Entity-based Jaccard merge ──────────────────────────────────
  const JACCARD_THRESHOLD = 0.4;
  let merged = true;

  while (merged) {
    merged = false;
    const newClusters: IntermediateCluster[] = [];
    const consumed = new Set<number>();

    for (let i = 0; i < clusters.length; i++) {
      if (consumed.has(i)) continue;

      const current = clusters[i];

      for (let j = i + 1; j < clusters.length; j++) {
        if (consumed.has(j)) continue;

        // Only merge if both clusters have entities to compare
        if (current.mergedEntities.size === 0 || clusters[j].mergedEntities.size === 0) {
          continue;
        }

        if (jaccardSimilarity(current.mergedEntities, clusters[j].mergedEntities) >= JACCARD_THRESHOLD) {
          // Merge j into current
          current.metas.push(...clusters[j].metas);
          for (const e of clusters[j].mergedEntities) {
            current.mergedEntities.add(e);
          }
          consumed.add(j);
          merged = true;
        }
      }

      newClusters.push(current);
    }

    clusters = newClusters;
  }

  // ── Build final StoryCluster objects ────────────────────────────────────
  return clusters.map((cluster) => {
    const platforms = new Set<string>();
    let totalEngagement = 0;
    let bestTitle = "";
    let bestEngagement = -1;
    let earliestDate = new Date();

    for (const meta of cluster.metas) {
      const { item } = meta;
      platforms.add(item.platform);
      totalEngagement += item.engagement_score || 0;

      if ((item.engagement_score || 0) > bestEngagement) {
        bestEngagement = item.engagement_score || 0;
        bestTitle = item.title;
      }

      const itemDate = new Date(item.published_at || item.ingested_at);
      if (itemDate < earliestDate) {
        earliestDate = itemDate;
      }
    }

    return {
      items: cluster.metas.map((m) => m.item),
      platforms,
      entities: cluster.mergedEntities,
      totalEngagement,
      bestTitle,
      earliestDate,
    };
  });
}
