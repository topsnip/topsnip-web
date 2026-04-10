/**
 * Enforce a maximum word count on text.
 * Truncates at word boundary and appends "..." if exceeded.
 */
export function enforceWordLimit(text: string, maxWords: number): string {
  if (!text) return '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  if (maxWords <= 0) return '...';
  return words.slice(0, maxWords).join(' ') + '...';
}
