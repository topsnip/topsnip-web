"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface MarkUnderstoodProps {
  topicId: string;
}

/**
 * "Mark as understood" button with confetti burst on click.
 * Awards 25 XP via checklist_complete event.
 */
export function MarkUnderstood({ topicId }: MarkUnderstoodProps) {
  const [understood, setUnderstood] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (understood) return;
    setUnderstood(true);
    setShowConfetti(true);

    // Award XP — fire and forget
    fetch("/api/user/xp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "checklist_complete",
        metadata: { topic_id: topicId },
      }),
      keepalive: true,
    }).catch(() => {
      // silent — best effort
    });
  }, [understood, topicId]);

  // Remove confetti after animation
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  return (
    <div className="relative inline-flex justify-center w-full">
      {/* Confetti particles */}
      {showConfetti && <ConfettiBurst />}

      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={understood}
        className="btn-primary w-full rounded-xl px-8 py-3.5 text-base font-medium disabled:cursor-default"
        style={{
          background: understood ? "var(--success)" : undefined,
          boxShadow: understood ? "none" : undefined,
        }}
      >
        {understood ? "Understood \u2713" : "I understand this"}
      </button>
    </div>
  );
}

/**
 * CSS-only confetti burst — 24 particles that fall from center.
 */
function ConfettiBurst() {
  // Generate random particles once
  const particles = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      // Random x offset: -120px to 120px
      x: Math.round(Math.random() * 240 - 120),
      // Random y travel: 60px to 140px
      y: Math.round(Math.random() * 80 + 60),
      // Random rotation
      rotate: Math.round(Math.random() * 360),
      // Random delay: 0ms to 200ms
      delay: Math.round(Math.random() * 200),
      // Random size: 4px to 8px
      size: Math.round(Math.random() * 4 + 4),
      // Alternate shapes
      isCircle: i % 3 === 0,
      // Color: coral or white
      color: i % 2 === 0 ? "var(--ts-accent)" : "#ffffff",
    })),
  ).current;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 10 }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-particle"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: p.isCircle ? "50%" : "2px",
            opacity: 0,
            transform: "translate(-50%, -50%)",
            animation: `confettiFall 1.5s ${p.delay}ms ease-out forwards`,
            // CSS custom properties for the keyframe
            ["--confetti-x" as string]: `${p.x}px`,
            ["--confetti-y" as string]: `${p.y}px`,
            ["--confetti-rotate" as string]: `${p.rotate}deg`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes confettiFall {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translateX(0) translateY(0)
              rotate(0deg) scale(1);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%)
              translateX(var(--confetti-x))
              translateY(var(--confetti-y))
              rotate(var(--confetti-rotate)) scale(0.5);
          }
        }
      `}</style>
    </div>
  );
}
