/**
 * Decode HTML entities for display. Handles both single and double-encoded
 * entities from API sources (YouTube, RSS, etc.).
 *
 * Used at render time to fix data that was double-encoded before the
 * sanitizeText fix. Safe to call on already-decoded text (idempotent
 * after first pass).
 */
export function decodeHtml(text: string): string {
  if (!text) return text;
  return text
    .replace(/&amp;amp;/g, "&amp;") // fix triple-encoding first
    .replace(/&amp;#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}
