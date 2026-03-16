import type { FetchResult, RawSourceItem } from "../types";

const HN_ALGOLIA_URL = "https://hn.algolia.com/api/v1";

// AI-related keywords to filter HN stories
const AI_KEYWORDS = [
  "ai", "artificial intelligence", "llm", "gpt", "claude", "gemini",
  "machine learning", "deep learning", "neural network", "transformer",
  "diffusion", "stable diffusion", "midjourney", "openai", "anthropic",
  "google deepmind", "meta ai", "mistral", "llama", "embedding",
  "rag", "fine-tuning", "fine tuning", "agent", "mcp", "tool use",
  "computer vision", "nlp", "natural language", "hugging face",
  "open source ai", "foundation model", "multimodal", "reasoning",
];

interface HNHit {
  objectID: string;
  title: string;
  url: string | null;
  story_text: string | null;
  points: number;
  created_at: string;
  num_comments: number;
}

function isAIRelated(title: string): boolean {
  const lower = title.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Fetch trending AI stories from Hacker News via Algolia API.
 * Free, no auth required. Filters by points > minPoints and AI keywords.
 */
export async function fetchHN(
  sourceId: string,
  minPoints: number = 50
): Promise<FetchResult> {
  try {
    // Search for recent AI-related stories sorted by date
    const queries = ["artificial intelligence", "LLM", "AI agent", "machine learning"];
    const allItems: RawSourceItem[] = [];
    const seen = new Set<string>();

    for (const query of queries) {
      const params = new URLSearchParams({
        query,
        tags: "story",
        numericFilters: `points>${minPoints}`,
        hitsPerPage: "30",
      });

      const res = await fetch(
        `${HN_ALGOLIA_URL}/search_by_date?${params}`,
        { signal: AbortSignal.timeout(10_000) }
      );

      if (!res.ok) {
        throw new Error(`HN Algolia returned ${res.status}`);
      }

      const data = await res.json();
      const hits: HNHit[] = data.hits ?? [];

      for (const hit of hits) {
        if (seen.has(hit.objectID)) continue;
        if (!isAIRelated(hit.title)) continue;
        seen.add(hit.objectID);

        allItems.push({
          externalId: hit.objectID,
          sourceId,
          title: hit.title,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          contentSnippet: hit.story_text?.slice(0, 500) || hit.title,
          engagementScore: hit.points + hit.num_comments,
          publishedAt: hit.created_at,
        });
      }
    }

    return { sourceId, items: allItems, health: "healthy" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sourceId, items: [], health: "down", error: `HN fetch failed: ${msg}` };
  }
}
