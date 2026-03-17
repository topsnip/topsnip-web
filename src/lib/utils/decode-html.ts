/**
 * Decode HTML entities for display. Handles single, double, and triple-encoded
 * entities from API sources (YouTube, RSS, etc.).
 *
 * Loops up to 3 passes, stopping when output stabilizes.
 * Safe to call on already-decoded text (idempotent).
 */
export function decodeHtml(text: string): string {
  if (!text) return text;

  const MAX_PASSES = 3;
  let result = text;

  for (let i = 0; i < MAX_PASSES; i++) {
    const decoded = result
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/&#(\d+);/g, (_, dec) =>
        String.fromCharCode(Number(dec))
      );

    if (decoded === result) break; // stable — no more entities to decode
    result = decoded;
  }

  return result;
}
