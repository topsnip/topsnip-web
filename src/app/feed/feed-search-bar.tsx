"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export function FeedSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    // [M6 fix] Guard against empty slug (e.g., query of only special chars)
    if (!slug) return;
    router.push(`/s/${slug}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div
        className={`flex gap-2 items-center rounded-2xl border px-4 py-3 transition-all duration-200 ${
          focused ? "accent-glow" : ""
        }`}
        style={{
          background: focused ? "rgba(6,6,10,0.6)" : "var(--ts-surface)",
          backdropFilter: "blur(16px)",
          borderColor: focused ? "var(--ts-accent-50)" : "var(--border)",
          boxShadow: focused
            ? "0 0 0 3px var(--ts-glow), 0 8px 40px -8px var(--ts-glow)"
            : "inset 0 1px 0 0 rgba(255,255,255,0.03)",
        }}
      >
        <Search size={16} style={{ color: "var(--ts-muted)", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search any AI topic..."
          className="flex-1 bg-transparent text-sm outline-none tracking-wide"
          style={{ color: "var(--foreground)" }}
          autoComplete="off"
          aria-label="Search any AI topic"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 cursor-pointer shadow-[0_0_12px_var(--ts-accent-30)]"
          style={{
            background:
              "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
          }}
        >
          Search
          <ArrowRight size={12} />
        </button>
      </div>
    </form>
  );
}
