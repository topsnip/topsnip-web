// ── Category color mapping ──────────────────────────────────────────────────
// Shared across feed cards, feed page, and topic detail page.

export const CATEGORY_COLORS: Record<string, string> = {
  models: "#7C6AF7",        // purple
  tools: "#f59e0b",         // amber
  research: "#06b6d4",      // cyan
  industry: "#e8734a",      // coral
  "open-source": "#4ade80", // green
  ethics: "#f472b6",        // pink
  other: "#a1a1aa",         // gray (uncategorized)
  default: "#7C6AF7",       // fallback to purple
};

export function getCategoryColor(tag?: string): string {
  if (!tag) return CATEGORY_COLORS.default;
  const normalized = tag.toLowerCase().replace(/\s+/g, "-");
  return CATEGORY_COLORS[normalized] || CATEGORY_COLORS.default;
}
