"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="relative z-10"
      style={{
        borderTop: "1px solid var(--border)",
        padding: "16px 24px",
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
          &copy; 2026 topsnip
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-xs transition-colors hover:underline"
            style={{ color: "var(--ts-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ts-text-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ts-muted)")}
          >
            About
          </Link>
          <Link
            href="/privacy"
            className="text-xs transition-colors hover:underline"
            style={{ color: "var(--ts-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ts-text-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ts-muted)")}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-xs transition-colors hover:underline"
            style={{ color: "var(--ts-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ts-text-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ts-muted)")}
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
