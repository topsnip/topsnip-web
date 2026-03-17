"use client";

import { useEffect, useState } from "react";
import Confetti from "@/components/Confetti";

// ── Level-Up Detector ───────────────────────────────────────────────────────
// Compares current level with localStorage to detect level-ups.
// Shows confetti + toast on level change.

const LEVEL_LABELS: Record<string, string> = {
  curious: "Curious",
  informed: "Informed",
  knowledgeable: "Knowledgeable",
  expert: "Expert",
  authority: "Authority",
};

const STORAGE_KEY = "topsnip_last_level";

interface LevelUpDetectorProps {
  level: string;
}

export default function LevelUpDetector({ level }: LevelUpDetectorProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    try {
      const lastLevel = localStorage.getItem(STORAGE_KEY);

      if (lastLevel && lastLevel !== level) {
        // Level changed — trigger celebration
        setShowConfetti(true);
        setShowToast(true);

        const toastTimer = setTimeout(() => setShowToast(false), 5000);
        return () => clearTimeout(toastTimer);
      }
    } catch {
      // localStorage not available
    } finally {
      // Always update stored level
      try {
        localStorage.setItem(STORAGE_KEY, level);
      } catch {
        // ignore
      }
    }
  }, [level]);

  const levelLabel = LEVEL_LABELS[level] ?? level;

  return (
    <>
      <Confetti show={showConfetti} />

      {showToast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 101,
            background: "var(--ts-surface, #161618)",
            border: "1px solid rgba(232,115,74,0.2)",
            borderRadius: "12px",
            padding: "16px 24px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            animation: "fadeInUp 0.4s ease both",
          }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary, #EDEDEF)" }}
          >
            Level Up! 🎉 You&apos;re now <span style={{ color: "var(--ts-accent)" }}>{levelLabel}</span>
          </span>
        </div>
      )}
    </>
  );
}
