"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
  label: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function AnimatedCounter({
  target,
  suffix = "",
  duration = 2000,
  label,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const triggered = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const start = performance.now();

          function animate(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutExpo(progress);
            setCount(Math.round(eased * target));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          }

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-2">
      <span
        className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
        style={{
          fontFamily: "var(--font-heading), 'Instrument Serif', serif",
        }}
      >
        {formatNumber(count)}
        {suffix}
      </span>
      <span
        className="text-sm"
        style={{ color: "var(--ts-text-2)" }}
      >
        {label}
      </span>
    </div>
  );
}
