// Source enrichment — searches the web for additional context on a topic,
// fetches article content, and enriches the source material before generation.

import { isSafeUrl, safeText } from "../ingest/safe-fetch";
import type { TopicSourceMaterial } from "./types";

// ── Config ──────────────────────────────────────────────────────────────────

const SERPER_URL = "https://google.serper.dev/search";
const MAX_SEARCH_RESULTS = 5;
const MAX_CHARS_PER_SOURCE = 3000;
const FETCH_TIMEOUT_MS = 10_000;
const FETCH_MAX_BYTES = 1_000_000; // 1MB

// Domains to skip — social media, video platforms, paywalls
const SKIP_DOMAINS = new Set([
  "youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "reddit.com",
  "linkedin.com",
]);

// ── Types ───────────────────────────────────────────────────────────────────

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  organic?: SerperResult[];
}

interface EnrichedSource {
  title: string;
  url: string;
  content: string;
  platform: string;
}

// ── Search via Serper ───────────────────────────────────────────────────────

async function searchWeb(query: string): Promise<SerperResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn("SERPER_API_KEY not set — skipping web enrichment");
    return [];
  }

  try {
    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: MAX_SEARCH_RESULTS + 3, // fetch extra to account for filtered domains
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`Serper search failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data: SerperResponse = await res.json();
    return data.organic ?? [];
  } catch (err) {
    console.warn(`Serper search error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// ── Filter results ──────────────────────────────────────────────────────────

function shouldSkipUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return SKIP_DOMAINS.has(hostname);
  } catch {
    return true;
  }
}

// ── Extract readable text from HTML ─────────────────────────────────────────

function extractText(html: string): string {
  // Remove script, style, nav, header, footer, aside tags and their content
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "");

  // Try to extract article body first
  const articleMatch = text.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) {
    text = articleMatch[0];
  } else {
    // Fall back to main content
    const mainMatch = text.match(/<main[\s\S]*?<\/main>/i);
    if (mainMatch) {
      text = mainMatch[0];
    }
  }

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text.slice(0, MAX_CHARS_PER_SOURCE);
}

// ── Fetch and extract article content ───────────────────────────────────────

async function fetchArticle(url: string): Promise<string | null> {
  if (!isSafeUrl(url)) return null;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TopSnip/1.0 (AI Learning Platform; content aggregation)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    const html = await safeText(res, FETCH_MAX_BYTES);
    const text = extractText(html);

    // Skip if extracted text is too short to be useful
    if (text.length < 200) return null;

    return text;
  } catch {
    return null;
  }
}

// ── Enrichment result tracking ───────────────────────────────────────────────

export interface EnrichmentResult {
  material: TopicSourceMaterial;
  status: "enriched" | "thin" | "failed";
  sourcesAdded: number;
}

// ── Main enrichment function ────────────────────────────────────────────────

// Total time budget for enrichment — leave room for Claude calls
const ENRICHMENT_TIMEOUT_MS = 25_000;

export async function enrichSourceMaterial(
  material: TopicSourceMaterial
): Promise<EnrichmentResult> {
  const deadline = Date.now() + ENRICHMENT_TIMEOUT_MS;

  let searchResults: SerperResult[];
  try {
    searchResults = await searchWeb(material.topicTitle);
  } catch (err) {
    console.warn(`Enrichment search failed: ${err instanceof Error ? err.message : String(err)}`);
    return { material, status: "failed", sourcesAdded: 0 };
  }

  if (Date.now() > deadline) {
    return { material, status: "failed", sourcesAdded: 0 };
  }

  if (searchResults.length === 0) {
    return { material, status: "failed", sourcesAdded: 0 };
  }

  // Filter out social/video domains and limit to MAX_SEARCH_RESULTS
  const validResults = searchResults
    .filter((r) => !shouldSkipUrl(r.link))
    .slice(0, MAX_SEARCH_RESULTS);

  if (validResults.length === 0) {
    return { material, status: "thin", sourcesAdded: 0 };
  }

  // Fetch articles in parallel
  const fetchPromises = validResults.map(async (result): Promise<EnrichedSource | null> => {
    const content = await fetchArticle(result.link);
    if (!content) {
      // Still use the search snippet if we can't fetch the full article
      if (result.snippet && result.snippet.length > 50) {
        return {
          title: result.title,
          url: result.link,
          content: result.snippet,
          platform: "web",
        };
      }
      return null;
    }

    return {
      title: result.title,
      url: result.link,
      content,
      platform: "web",
    };
  });

  const enrichedSources = (await Promise.all(fetchPromises)).filter(
    (s): s is EnrichedSource => s !== null
  );

  if (enrichedSources.length === 0) {
    return { material, status: "thin", sourcesAdded: 0 };
  }

  // Append enriched sources to existing items
  const enrichedItems = enrichedSources.map((source) => ({
    id: `enriched-${Buffer.from(source.url).toString("base64url").slice(0, 16)}`,
    title: source.title,
    url: source.url,
    contentSnippet: source.content,
    platform: source.platform,
    engagementScore: 0,
    publishedAt: "",
  }));

  const enrichedMaterial = {
    ...material,
    items: [...material.items, ...enrichedItems],
  };

  return {
    material: enrichedMaterial,
    status: "enriched",
    sourcesAdded: enrichedItems.length,
  };
}

// ── Content quality filter ──────────────────────────────────────────────────

const REJECTION_PHRASES = [
  "don't have enough",
  "don\u2019t have enough",
  "do not have enough",
  "insufficient source",
  "can't create",
  "can\u2019t create",
  "cannot create",
  "can't explain",
  "can\u2019t explain",
  "cannot explain",
  "no actual content",
  "not enough information",
  "unable to create",
  "unable to write",
  "need transcripts",
  "need more source",
  "i need source material",
];

export function isGarbageContent(tldr: string, whatHappened: string): boolean {
  const combined = `${tldr} ${whatHappened}`.toLowerCase();
  return REJECTION_PHRASES.some((phrase) => combined.includes(phrase));
}
