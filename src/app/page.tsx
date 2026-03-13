"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

const SUGGESTED_QUERIES = [
  "build an AI agent with n8n",
  "Claude Code skills and workflows",
  "Make vs Zapier — which one to use",
  "LangChain basics for beginners",
  "n8n vs Make for automation",
  "Cursor AI coding tips",
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const slug = q.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    router.push(`/s/${slug}?q=${encodeURIComponent(q)}`);
  }

  function handleSuggestion(suggestion: string) {
    const slug = suggestion.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    router.push(`/s/${slug}?q=${encodeURIComponent(suggestion)}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(124,106,247,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-10 relative z-10">
        {/* Wordmark */}
        <div className="text-2xl font-extrabold tracking-tight text-white">
          top<span style={{ color: "var(--ts-accent)" }}>snip</span>
        </div>

        {/* Hero */}
        <div className="text-center flex flex-col gap-4">
          <h1
            className="font-extrabold tracking-tight leading-[1.1] text-white"
            style={{ fontSize: "clamp(2rem, 6vw, 3rem)" }}
          >
            Search any topic.
            <br />
            Skip the noise.
          </h1>
          <p
            className="text-base leading-relaxed max-w-md mx-auto"
            style={{ color: "var(--ts-text-2)" }}
          >
            Type an AI or automation topic. We read the best YouTube videos on it
            and give you the signal — no 20-minute promo videos required.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div
            className="flex gap-2 items-center rounded-xl border px-4 py-3 transition-all duration-200"
            style={{
              background: "var(--ts-surface)",
              borderColor: focused ? "rgba(124,106,247,0.6)" : "var(--border)",
              boxShadow: focused ? "0 0 0 3px var(--ts-glow)" : "none",
            }}
          >
            <Search
              size={18}
              style={{ color: "var(--ts-muted)", flexShrink: 0 }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="What do you want to learn today?"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{
                color: "var(--foreground)",
              }}
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
              style={{ background: "var(--ts-accent)" }}
            >
              Topsnip it
              <ArrowRight size={14} />
            </button>
          </div>
        </form>

        {/* Suggested queries */}
        <div className="flex flex-col items-center gap-3 w-full">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--ts-muted)" }}
          >
            Try
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_QUERIES.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="suggestion-chip rounded-full border px-3 py-1.5 text-xs font-medium active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p
        className="absolute bottom-6 text-xs tracking-wide"
        style={{ color: "var(--ts-muted)" }}
      >
        AI &amp; automation · more topics coming soon
      </p>
    </main>
  );
}
