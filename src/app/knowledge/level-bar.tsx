"use client";

import { useEffect, useState } from "react";

// ── Level thresholds ────────────────────────────────────────────────────────

const LEVELS = [
  { key: "curious", label: "Curious", min: 0 },
  { key: "informed", label: "Informed", min: 200 },
  { key: "knowledgeable", label: "Knowledgeable", min: 1000 },
  { key: "expert", label: "Expert", min: 5000 },
  { key: "authority", label: "Authority", min: 15000 },
] as const;

function getLevelInfo(level: string, xp: number) {
  const idx = LEVELS.findIndex((l) => l.key === level);
  const current = LEVELS[idx] ?? LEVELS[0];
  const next = LEVELS[idx + 1] ?? null;

  const levelMin = current.min;
  const levelMax = next ? next.min : current.min;
  const progress = next ? ((xp - levelMin) / (levelMax - levelMin)) * 100 : 100;

  return {
    currentLabel: current.label,
    levelNumber: idx + 1,
    nextLabel: next?.label ?? null,
    progress: Math.min(100, Math.max(0, progress)),
    xpDisplay: xp.toLocaleString(),
    xpMax: next ? next.min.toLocaleString() : current.min.toLocaleString(),
  };
}

// ── Level Bar Component ─────────────────────────────────────────────────────

interface LevelBarProps {
  level: string;
  xp: number;
}

import { headingFont } from "@/lib/constants";

export default function LevelBar({ level, xp }: LevelBarProps) {
  const [mounted, setMounted] = useState(false);
  const info = getLevelInfo(level, xp);

  useEffect(() => {
    // Trigger CSS transition on mount
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--ts-surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        animation: "fadeInUp 0.35s ease 0.1s both",
      }}
    >
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="text-sm font-bold"
          style={{ color: "var(--text-primary, #EDEDEF)", fontFamily: headingFont }}
        >
          {info.currentLabel}{" "}
          <span style={{ color: "var(--ts-muted)", fontWeight: 400 }}>
            (Level {info.levelNumber})
          </span>
        </span>
        <span className="text-xs font-medium" style={{ color: "var(--ts-muted)" }}>
          {info.xpDisplay} / {info.xpMax} XP
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full overflow-hidden"
        style={{
          background: "var(--ts-surface-hover, rgba(255,255,255,0.06))",
          borderRadius: "9999px",
          height: "8px",
        }}
      >
        <div
          style={{
            width: mounted ? `${info.progress}%` : "0%",
            height: "100%",
            borderRadius: "9999px",
            background: "var(--ts-accent, #E8734A)",
            transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>

      {/* Next level label */}
      {info.nextLabel && (
        <div className="flex justify-end mt-2">
          <span className="text-xs" style={{ color: "var(--ts-muted)" }}>
            → {info.nextLabel}
          </span>
        </div>
      )}
    </div>
  );
}
