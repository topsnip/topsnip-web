"use client";

import { useEffect, useState } from "react";

// ── ScrollProgress ──────────────────────────────────────────────────────────
// Thin progress bar fixed to the top of the viewport that fills as the user
// scrolls down the page. Uses CSS variables --ts-accent and --ts-accent-2.

export default function ScrollProgress() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setWidth(progress);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // set initial value

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: 3,
        zIndex: 200,
        background:
          "linear-gradient(90deg, var(--ts-accent), var(--ts-accent-2))",
        width: `${width}%`,
        transition: "width 0.05s linear",
        pointerEvents: "none",
      }}
    />
  );
}
