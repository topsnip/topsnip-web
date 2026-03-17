"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────────────

interface StatsBarProps {
  streak: number;
  xp: number;
  level: string;
  topicsRead: number;
  totalTimeSec: number;
}

// ── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo approximation
    });
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue, rounded]);

  return <>{display}</>;
}

// ── Flame with flicker ──────────────────────────────────────────────────────

function FlameIcon({ active }: { active: boolean }) {
  return (
    <span
      className={active ? "flame-flicker" : ""}
      style={{
        fontSize: "1.5rem",
        display: "inline-block",
        filter: active ? "none" : "grayscale(1)",
        opacity: active ? 1 : 0.4,
      }}
      aria-hidden="true"
    >
      🔥
    </span>
  );
}

// ── Stats Bar ───────────────────────────────────────────────────────────────

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

const LEVEL_LABELS: Record<string, string> = {
  curious: "Curious",
  informed: "Informed",
  knowledgeable: "Knowledgeable",
  expert: "Expert",
  authority: "Authority",
};

export default function StatsBar({ streak, xp, level, topicsRead, totalTimeSec }: StatsBarProps) {
  const timeSaved = ((topicsRead * 15) / 60).toFixed(1);
  const levelLabel = LEVEL_LABELS[level] ?? "Curious";

  const cards = [
    {
      emoji: <FlameIcon active={streak > 0} />,
      value: streak,
      label: streak === 0 ? "Start your streak" : "day streak",
    },
    {
      emoji: <span style={{ fontSize: "1.5rem" }} aria-hidden="true">⚡</span>,
      value: xp,
      label: levelLabel,
      animated: true,
      accent: true,
    },
    {
      emoji: <span style={{ fontSize: "1.5rem" }} aria-hidden="true">📚</span>,
      value: topicsRead,
      label: "topics read",
    },
    {
      emoji: <span style={{ fontSize: "1.5rem" }} aria-hidden="true">⏱</span>,
      value: null,
      display: `${timeSaved}h`,
      label: "time saved",
    },
  ];

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
      style={{ animation: "fadeInUp 0.35s ease 0.06s both" }}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          className="rounded-xl p-4 flex flex-col gap-2"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          }}
        >
          <div className="flex items-center gap-2">
            {card.emoji}
            <span
              className="text-2xl font-bold tracking-tight"
              style={{
                fontFamily: headingFont,
                color: card.accent ? "var(--ts-accent)" : "var(--text-primary, #EDEDEF)",
              }}
            >
              {card.display
                ? card.display
                : card.animated
                  ? <AnimatedNumber value={card.value!} />
                  : (card.value ?? 0).toLocaleString()}
            </span>
          </div>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--ts-muted)" }}
          >
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
}
