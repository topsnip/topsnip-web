/**
 * SSRF-safe URL validation and size-limited fetch utilities.
 * Used by all ingestion fetchers to prevent:
 * - SSRF attacks via internal/private IPs
 * - Memory exhaustion from oversized responses
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254", // Cloud metadata (AWS, GCP, Azure)
  "metadata.google.internal",
]);

const PRIVATE_IP_PREFIXES = [
  "10.",
  "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.",
  "172.24.", "172.25.", "172.26.", "172.27.",
  "172.28.", "172.29.", "172.30.", "172.31.",
  "192.168.",
  "fc00:", "fd00:", // IPv6 private
  "fe80:", // IPv6 link-local
];

/**
 * Validate that a URL is safe to fetch (not pointing to internal resources).
 * Returns true if safe, false if blocked.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block known dangerous hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) return false;

    // Block private IP ranges
    if (PRIVATE_IP_PREFIXES.some((prefix) => hostname.startsWith(prefix))) {
      return false;
    }

    // Block .local and .internal domains
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Read a Response body as text with a size limit.
 * Prevents memory exhaustion from oversized responses.
 *
 * @param res - Fetch Response object
 * @param maxBytes - Maximum allowed body size (default 5MB)
 */
export async function safeText(res: Response, maxBytes = 5_000_000): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalSize += value.length;
    if (totalSize > maxBytes) {
      reader.cancel();
      throw new Error(`Response exceeded ${maxBytes} byte limit`);
    }
    chunks.push(value);
  }

  // Concatenate chunks
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(combined);
}

/**
 * Decode HTML entities that may already be in source data (YouTube API,
 * RSS feeds, etc. often return pre-encoded strings).
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

/**
 * Sanitize text content before storing in database.
 * Decodes any pre-existing HTML entities first (from APIs/RSS), then
 * re-encodes to prevent stored XSS. This prevents double-encoding.
 */
export function sanitizeText(text: string): string {
  // Decode first to normalize — source APIs often return pre-encoded text
  const decoded = decodeHtmlEntities(text);
  return decoded
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Validate and sanitize a URL for storage.
 * Returns the URL if valid http/https, empty string otherwise.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
    return "";
  } catch {
    return "";
  }
}
