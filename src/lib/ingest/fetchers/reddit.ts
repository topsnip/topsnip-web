import type { FetchResult, RawSourceItem } from "../types";

interface RedditPost {
  id: string;
  title: string;
  url: string;
  permalink: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

interface RedditListing {
  data: {
    children: Array<{ data: RedditPost }>;
  };
}

export function getSubredditFromSourceUrl(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const match = parsed.pathname.match(/\/r\/([^/]+)/i);
    return match?.[1] || "MachineLearning";
  } catch {
    return "MachineLearning";
  }
}

/**
 * Fetch hot posts from a configured subreddit using the public JSON API.
 * No auth required; uses .json suffix on subreddit URLs.
 * Rate: ~60 req/min without OAuth.
 */
export async function fetchReddit(
  sourceId: string,
  sourceUrl: string,
  minScore: number = 50
): Promise<FetchResult> {
  const sub = getSubredditFromSourceUrl(sourceUrl);

  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "TopSnip/1.0 (AI Intelligence Dashboard)",
      },
    });

    if (!res.ok) {
      return {
        sourceId,
        items: [],
        health: res.status === 429 ? "degraded" : "down",
        error: `Reddit r/${sub} returned ${res.status}`,
      };
    }

    const listing: RedditListing = await res.json();
    const items: RawSourceItem[] = [];

    for (const child of listing.data.children) {
      const post = child.data;
      if (post.score < minScore) continue;

      items.push({
        externalId: post.id,
        sourceId,
        title: post.title,
        url: post.url.startsWith("http")
          ? post.url
          : `https://www.reddit.com${post.permalink}`,
        contentSnippet: post.selftext?.slice(0, 500) || post.title,
        engagementScore: post.score + post.num_comments,
        publishedAt: new Date(post.created_utc * 1000).toISOString(),
      });
    }

    return {
      sourceId,
      items,
      health: items.length > 0 ? "healthy" : "degraded",
      error: items.length === 0 ? `No qualifying Reddit posts for r/${sub}` : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sourceId,
      items: [],
      health: "down",
      error: `Reddit fetch failed for r/${sub}: ${msg}`,
    };
  }
}
