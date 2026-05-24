import type { FetchResult, RawSourceItem } from "../types";
import { isSafeUrl, safeText } from "../safe-fetch";

const ARXIV_API_URL = "https://export.arxiv.org/api/query";

export function buildArxivFetchUrl(sourceUrl: string, maxResults: number = 20): string {
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.hostname !== "export.arxiv.org") {
      throw new Error("not arxiv export host");
    }
    parsed.searchParams.set("max_results", String(maxResults));
    return parsed.toString();
  } catch {
    const params = new URLSearchParams({
      search_query: "cat:cs.AI",
      start: "0",
      max_results: String(maxResults),
      sortBy: "submittedDate",
      sortOrder: "descending",
    });
    return `${ARXIV_API_URL}?${params}`;
  }
}

/**
 * Fetch recent papers from a configured arXiv API source URL.
 * Free, no auth. Returns Atom XML.
 * Rate: max 1 request every 3 seconds.
 */
export async function fetchArxiv(
  sourceId: string,
  sourceUrl: string,
  maxResults: number = 20
): Promise<FetchResult> {
  try {
    const fetchUrl = buildArxivFetchUrl(sourceUrl, maxResults);
    if (!isSafeUrl(fetchUrl)) {
      return { sourceId, items: [], health: "down", error: "arXiv URL blocked by SSRF policy" };
    }

    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`arXiv API returned ${res.status}`);
    }

    const xml = await safeText(res, 2_000_000);
    const items: RawSourceItem[] = [];
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

    for (const entry of entries) {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\s+/g, " ") || "";
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim().replace(/\s+/g, " ") || "";
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || "";
      const arxivId = id.replace("http://arxiv.org/abs/", "").replace(/v\d+$/, "");

      if (title && id) {
        items.push({
          externalId: arxivId,
          sourceId,
          title,
          url: id,
          contentSnippet: summary.slice(0, 500),
          engagementScore: 0,
          publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
        });
      }
    }

    return { sourceId, items, health: items.length > 0 ? "healthy" : "degraded" };
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
