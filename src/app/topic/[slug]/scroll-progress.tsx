"use client";

import { useEffect, useState } from "react";

/**
 * Thin coral progress bar at the very top of the viewport.
 * Width = scroll percentage through the page content.
 * Only appears after scrolling past the hero area (200px).
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;

      if (docHeight <= 0) return;

      const pct = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      setProgress(pct);
      setVisible(scrollTop > 200);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0"
      style={{
        zIndex: 60,
        height: "3px",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--ts-accent)",
          transition: "width 50ms linear",
          transformOrigin: "left",
        }}
      />
    </div>
  );
}
