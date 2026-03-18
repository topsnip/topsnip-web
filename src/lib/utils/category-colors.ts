// ── Category color mapping ──────────────────────────────────────────────────
// Shared across feed cards, feed page, and topic detail page.

export const CATEGORY_COLORS: Record<string, string> = {
  models: "#e8734a",        // coral (accent)
  tools: "#7c6af7",         // purple
  research: "#3b82f6",      // blue
  industry: "#10b981",      // emerald
  "open-source": "#f59e0b", // amber
  ethics: "#ec4899",        // pink
  default: "#e8734a",       // fallback to accent
};

export function getCategoryColor(tag?: string): string {
  if (!tag) return CATEGORY_COLORS.default;
  const normalized = tag.toLowerCase().replace(/\s+/g, "-");
  return CATEGORY_COLORS[normalized] || CATEGORY_COLORS.default;
}
