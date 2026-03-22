"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Enhanced scroll progress bar with:
 * - Glow effect at the leading edge
 * - Completion pulse animation at 100%
 * - Section marker dots (TLDR, main content, implications, action items, sources)
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sectionPositions, setSectionPositions] = useState<number[]>([]);

  const computeSectionPositions = useCallback(() => {
    const docHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    if (docHeight <= 0) return;

    // Find section elements by data attribute
    const selectors = [
      "[data-section-tldr]",
      "[data-section-what-happened]",
      "[data-section-so-what]",
      "[data-section-now-what]",
      "[data-section-sources]",
    ];

    const positions: number[] = [];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        positions.push((absoluteTop / (docHeight + window.innerHeight)) * 100);
      }
    }
    setSectionPositions(positions);
  }, []);

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

      // Trigger completion state
      if (pct >= 99 && !completed) {
        setCompleted(true);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // Compute section positions after DOM settles
    const timer = setTimeout(computeSectionPositions, 500);
    window.addEventListener("resize", computeSectionPositions);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", computeSectionPositions);
      clearTimeout(timer);
    };
  }, [completed, computeSectionPositions]);

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
      {/* Progress bar with glow */}
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--ts-accent)",
          transition: "width 50ms linear",
          transformOrigin: "left",
          position: "relative",
          animation: completed ? "progressPulse 600ms ease-out" : undefined,
        }}
      >
        {/* Leading edge glow */}
        <div
          style={{
            position: "absolute",
            right: "-2px",
            top: "-4px",
            width: "20px",
            height: "11px",
            background:
              "radial-gradient(ellipse at right center, var(--ts-accent-50), transparent)",
            borderRadius: "50%",
            opacity: progress > 0 && progress < 100 ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        />
      </div>

      {/* Section marker dots */}
      {sectionPositions.map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${pos}%`,
            top: "0",
            width: "5px",
            height: "3px",
            background:
              progress >= pos
                ? "rgba(255,255,255,0.5)"
                : "rgba(255,255,255,0.15)",
            borderRadius: "1px",
            transition: "background 200ms ease",
          }}
        />
      ))}

      {/* Inline animation for completion pulse */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes progressPulse {
              0% { box-shadow: none; opacity: 1; }
              40% { box-shadow: 0 0 12px 2px var(--ts-accent); opacity: 1; }
              70% { box-shadow: 0 0 20px 4px var(--ts-accent-50); opacity: 0.8; }
              100% { box-shadow: 0 0 8px 1px var(--ts-accent-30); opacity: 1; }
            }
          `,
        }}
      />
    </div>
  );
}
