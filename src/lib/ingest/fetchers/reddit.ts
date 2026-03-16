import type { FetchResult, RawSourceItem } from "../types";

const SUBREDDITS = [
  "MachineLearning",
  "LocalLLaMA",
  "artificial",
  "ChatGPT",
  "singularity",
];

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

/**
 * Fetch hot AI posts from Reddit using the public JSON API.
 * No auth required — uses .json suffix on subreddit URLs.
 * Rate: ~60 req/min without OAuth.
 */
export async function fetchReddit(
  sourceId: string,
  minScore: number = 50
): Promise<FetchResult> {
  try {
    const allItems: RawSourceItem[] = [];
    const seen = new Set<string>();

    for (const sub of SUBREDDITS) {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=25`,
        {
          signal: AbortSignal.timeout(10_000),
          headers: {
            "User-Agent": "TopSnip/1.0 (AI Learning Platform)",
          },
        }
      );

      if (!res.ok) {
        // Reddit may rate-limit; skip this sub but don't fail entirely
        console.warn(`Reddit r/${sub} returned ${res.status}, skipping`);
        continue;
      }

      const listing: RedditListing = await res.json();

      for (const child of listing.data.children) {
        const post = child.data;
        if (seen.has(post.id)) continue;
        if (post.score < minScore) continue;
        seen.add(post.id);

        allItems.push({
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

      // Small delay between subreddit fetches to be respectful
      await new Promise((r) => setTimeout(r, 500));
    }

    return { sourceId, items: allItems, health: "healthy" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sourceId,
      items: [],
      health: "down",
      error: `Reddit fetch failed: ${msg}`,
    };
  }
}
