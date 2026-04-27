import type { FetchResult, RawSourceItem } from "../types";
import { safeText } from "../safe-fetch";

const ARXIV_API_URL = "https://export.arxiv.org/api/query";

// arXiv categories for AI/ML papers
const CATEGORIES = ["cs.AI", "cs.CL", "cs.LG", "cs.CV", "cs.IR", "cs.MA"];

/**
 * Fetch recent AI papers from arXiv API.
 * Free, no auth. Returns Atom XML.
 * Rate: max 1 request every 3 seconds.
 */
export async function fetchArxiv(
  sourceId: string,
  maxResults: number = 20
): Promise<FetchResult> {
  try {
    const catQuery = CATEGORIES.map((c) => `cat:${c}`).join("+OR+");
    const params = new URLSearchParams({
      search_query: catQuery,
      start: "0",
      max_results: String(maxResults),
      sortBy: "submittedDate",
      sortOrder: "descending",
    });

    const res = await fetch(`${ARXIV_API_URL}?${params}`, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`arXiv API returned ${res.status}`);
    }

    const xml = await safeText(res, 2_000_000);
    const items: RawSourceItem[] = [];

    // Parse Atom entries
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

    for (const entry of entries) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\s+/g, " ") || "";
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim().replace(/\s+/g, " ") || "";
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || "";

      // Extract arXiv ID from the full URL
      const arxivId = id.replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");

      if (title && id) {
        items.push({
          externalId: arxivId,
          sourceId,
          title,
          url: id,
          contentSnippet: summary.slice(0, 500),
          engagementScore: 0, // arXiv doesn't have engagement metrics
          publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
        });
      }
    }

    return { sourceId, items, health: "healthy" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sourceId,
      items: [],
      health: "down",
      error: `arXiv fetch failed: ${msg}`,
    };
  }
}
