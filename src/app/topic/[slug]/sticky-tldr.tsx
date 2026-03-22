"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { headingFont } from "@/lib/constants";

interface StickyTldrProps {
  title: string;
  tldr: string;
}

/**
 * Compact sticky bar that appears when the TLDR section scrolls out of view.
 * Fixed below the floating nav (~top: 60px to clear it).
 * Uses Intersection Observer for efficient visibility tracking.
 */
export function StickyTldr({ title, tldr }: StickyTldrProps) {
  const [visible, setVisible] = useState(false);

  // Extract first sentence of TLDR
  const firstSentence = tldr.split(/(?<=[.!?])\s/)[0] || tldr;
  const truncatedTldr =
    firstSentence.length > 120
      ? firstSentence.slice(0, 117) + "..."
      : firstSentence;

  const truncatedTitle =
    title.length > 50 ? title.slice(0, 47) + "..." : title;

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    // When the TLDR section is NOT intersecting (scrolled past), show the bar
    const entry = entries[0];
    if (entry) {
      setVisible(!entry.isIntersecting);
    }
  }, []);

  useEffect(() => {
    // Look for the TLDR section by its data attribute
    const tldrElement = document.querySelector("[data-section-tldr]");
    if (!tldrElement) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0,
      rootMargin: "-60px 0px 0px 0px", // Account for nav height
    });

    observer.observe(tldrElement);
    return () => observer.disconnect();
  }, [handleObserver]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div
      className="fixed left-0 right-0"
      style={{
        top: "60px",
        zIndex: 45,
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 300ms var(--ease-out-expo), opacity 200ms ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className="w-full"
        style={{
          background: "rgba(12, 12, 14, 0.8)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          className="max-w-[1120px] mx-auto px-[var(--space-page-x)] flex items-center gap-3"
          style={{ height: "48px" }}
        >
          {/* Title */}
          <span
            className="text-sm font-semibold text-white shrink-0"
            style={{ fontFamily: headingFont }}
          >
            {truncatedTitle}
          </span>

          {/* Separator */}
          <span
            className="hidden sm:block w-px h-4 shrink-0"
            style={{ background: "var(--border)" }}
          />

          {/* TLDR summary */}
          <span
            className="hidden sm:block text-xs truncate"
            style={{ color: "var(--ts-text-2)" }}
          >
            {truncatedTldr}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Back to top */}
          <button
            onClick={scrollToTop}
            className="btn-ghost flex items-center gap-1 text-xs shrink-0 rounded-full px-2.5 py-1"
            aria-label="Back to top"
          >
            <ArrowUp size={12} />
            <span className="hidden sm:inline">Top</span>
          </button>
        </div>
      </div>
    </div>
  );
}
