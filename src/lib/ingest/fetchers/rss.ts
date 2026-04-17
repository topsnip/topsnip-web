import type { FetchResult, RawSourceItem } from "../types";
import { isSafeUrl, safeText } from "../safe-fetch";

/**
 * Minimal RSS/Atom parser — no external dependency.
 * Extracts title, link, description, pubDate from XML feed items.
 */
interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA sections
  const cdataPattern = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular content
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(pattern);
  return match ? match[1].trim() : "";
}

function extractLink(itemXml: string): string {
  // Atom: collect all <link> tags, prefer rel="alternate" (the article URL)
  // over rel="self" (the feed's own URL). Support both single and double quotes.
  const linkPattern = /<link\b([^>]*?)\/?\s*>/gi;
  type AtomLink = { href: string; rel: string };
  const atomLinks: AtomLink[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkPattern.exec(itemXml)) !== null) {
    const attrs = m[1];
    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const relMatch = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i);
    atomLinks.push({ href: hrefMatch[1], rel: relMatch?.[1] ?? "" });
  }
  if (atomLinks.length > 0) {
    const alternate = atomLinks.find((l) => l.rel === "alternate" || l.rel === "");
    return (alternate ?? atomLinks[0]).href;
  }

  // RSS: <link>...</link>
  return extractTag(itemXml, "link");
}

function toISODateSafe(raw: string): string {
  // Return a valid ISO date string, or fall back to now() if input is garbage.
  // Prevents a single malformed pubDate from taking down the whole feed.
  if (!raw) return new Date().toISOString();
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return new Date().toISOString();
  return new Date(ms).toISOString();
}

function parseItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];

  // RSS 2.0: <item>...</item>
  const rssItems = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  // Atom: <entry>...</entry>
  const atomEntries = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];

  const allEntries = [...rssItems, ...atomEntries];

  for (const entry of allEntries) {
    const title = extractTag(entry, "title");
    const link = extractLink(entry);
    const description =
      extractTag(entry, "description") ||
      extractTag(entry, "summary") ||
      extractTag(entry, "content");
    const pubDate =
      extractTag(entry, "pubDate") ||
      extractTag(entry, "published") ||
      extractTag(entry, "updated");
    const guid = extractTag(entry, "guid") || extractTag(entry, "id") || link;

    if (title && link) {
      items.push({
        title,
        link,
        description: description.replace(/<[^>]+>/g, "").slice(0, 500),
        pubDate,
        guid,
      });
    }
  }

  return items;
}

/**
 * Fetch items from an RSS or Atom feed.
 * No external dependencies — uses built-in fetch + regex parsing.
 */
export async function fetchRSS(
  sourceId: string,
  feedUrl: string
): Promise<FetchResult> {
  try {
    // SSRF protection: validate feed URL before fetching
    if (!isSafeUrl(feedUrl)) {
      return { sourceId, items: [], health: "down", error: "Feed URL blocked by SSRF policy" };
    }

    const res = await fetch(feedUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent": "TopSnip/1.0 (AI Learning Platform)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    if (!res.ok) {
      throw new Error(`RSS feed returned ${res.status}`);
    }

    // Size-limited read (2MB max for XML feeds)
    const xml = await safeText(res, 2_000_000);
    const feedItems = parseItems(xml);

    const items: RawSourceItem[] = feedItems.map((item, idx) => ({
      externalId: item.guid || `${sourceId}-${idx}`,
      sourceId,
      title: item.title,
      url: item.link,
      contentSnippet: item.description,
      engagementScore: 0, // RSS items don't have engagement metrics
      publishedAt: toISODateSafe(item.pubDate),
    }));

    // Zero items usually means the regex parser silently failed on a new feed
    // format (not that the feed is legitimately empty). Flag as degraded.
    const health = items.length === 0 ? "degraded" : "healthy";
    return { sourceId, items, health };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sourceId, items: [], health: "down", error: `RSS fetch failed: ${msg}` };
  }
}
