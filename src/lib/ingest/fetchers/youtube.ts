import type { FetchResult, RawSourceItem } from "../types";
import { incrementYoutubeQuota } from "../../ratelimit";

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

// Rotate search queries to cover the AI landscape
// Mix of generic news + channel-specific quality content
const SEARCH_QUERIES = [
  "AI news today",
  "new AI model release",
  "LLM breakthrough",
  "AI agent tutorial",
  "machine learning update",
  "Two Minute Papers AI",
  "AI Explained new",
  "Matt Wolfe AI news",
  "Yannic Kilcher paper",
  "Fireship AI",
  "AI coding tools 2026",
  "RAG tutorial LLM",
  "Claude Anthropic update",
];

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeVideoStats {
  id: string;
  statistics: {
    viewCount: string;
    likeCount?: string;
  };
}

/**
 * Fetch trending AI videos from YouTube Data API v3.
 * Uses 100 quota units per search.list call — be conservative.
 * Default quota: 10,000 units/day = max 100 searches/day.
 *
 * Strategy: 1-2 queries per ingestion run (every 2 hours = ~24/day = ~2,400 units).
 */
export async function fetchYouTube(
  sourceId: string,
  maxQueries: number = 2
): Promise<FetchResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      sourceId,
      items: [],
      health: "degraded",
      error: "YouTube source not configured",
    };
  }

  try {
    const allItems: RawSourceItem[] = [];
    const seen = new Set<string>();

    // Pick queries based on current hour to rotate
    const hour = new Date().getUTCHours();
    const startIdx = hour % SEARCH_QUERIES.length;
    const queries = SEARCH_QUERIES.slice(startIdx, startIdx + maxQueries);

    const cost = queries.length * 101; // 100 for search, 1 for stats
    const allowed = await incrementYoutubeQuota(cost);
    if (!allowed) {
      return {
        sourceId,
        items: [],
        health: "degraded",
        error: "YouTube API daily quota exhausted (tracked via Redis)",
      };
    }

    for (const query of queries) {
      const params = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "video",
        order: "date",
        publishedAfter: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        maxResults: "10",
        key: apiKey,
      });

      const res = await fetch(`${YOUTUBE_API_URL}/search?${params}`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        if (res.status === 403) {
          return {
            sourceId,
            items: allItems,
            health: "degraded",
            error: "YouTube API quota likely exhausted",
          };
        }
        throw new Error(`YouTube API returned ${res.status}`);
      }

      const data: YouTubeSearchResponse = await res.json();

      // Get view counts for engagement scoring
      const videoIds = data.items.map((i) => i.id.videoId).join(",");
      const statsMap = new Map<string, number>();

      if (videoIds) {
        const statsRes = await fetch(
          `${YOUTUBE_API_URL}/videos?part=statistics&id=${videoIds}&key=${apiKey}`,
          { signal: AbortSignal.timeout(10_000) }
        );
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          for (const v of statsData.items as YouTubeVideoStats[]) {
            statsMap.set(v.id, parseInt(v.statistics.viewCount || "0", 10));
          }
        }
      }

      for (const item of data.items) {
        const vid = item.id.videoId;
        if (seen.has(vid)) continue;
        seen.add(vid);

        allItems.push({
          externalId: vid,
          sourceId,
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${vid}`,
          contentSnippet: item.snippet.description?.slice(0, 500) || item.snippet.title,
          engagementScore: statsMap.get(vid) || 0,
          publishedAt: item.snippet.publishedAt,
        });
      }
    }

    return { sourceId, items: allItems, health: "healthy" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sourceId,
      items: [],
      health: "down",
      error: `YouTube fetch failed: ${msg}`,
    };
  }
}
