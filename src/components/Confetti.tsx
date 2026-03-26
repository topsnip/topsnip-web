"use client";

import { useEffect, useState } from "react";

// ── Confetti Component ──────────────────────────────────────────────────────
// Pure CSS confetti burst. Triggered via `show` prop.

interface ConfettiProps {
  show: boolean;
}

const PARTICLE_COUNT = 24;
const COLORS = [
  "var(--ts-accent, #E8734A)", // coral
  "#FFFFFF",                     // white
  "var(--ts-accent-2, #D4633D)", // darker coral
  "#FBBF24",                     // gold
];

interface Particle {
  id: number;
  x: number;        // random x-offset in px
  rotation: number;  // final rotation in deg
  scale: number;     // scale factor
  delay: number;     // animation delay in ms
  color: string;
  isCircle: boolean;
  size: number;      // 4-8px
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    rotation: Math.random() * 720,
    scale: 0.5 + Math.random() * 1,
    delay: Math.random() * 400,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    isCircle: Math.random() > 0.5,
    size: 4 + Math.random() * 4,
  }));
}

export default function Confetti({ show }: ConfettiProps) {
  const [burst, setBurst] = useState<{ visible: boolean; particles: Particle[] }>({
    visible: false,
    particles: [],
  });

  useEffect(() => {
    if (!show) return;
    requestAnimationFrame(() => setBurst({ visible: true, particles: generateParticles() }));
    const timer = setTimeout(() => setBurst(prev => ({ ...prev, visible: false })), 2500);
    return () => clearTimeout(timer);
  }, [show]);

  if (!burst.visible) return null;

  const particles = burst.particles;

  return (
    <>
      <style>{`
        @keyframes confettiBurst {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          20% {
            transform: translateY(-120px) translateX(var(--confetti-x)) rotate(calc(var(--confetti-rot) * 0.3)) scale(var(--confetti-scale));
            opacity: 1;
          }
          100% {
            transform: translateY(400px) translateX(var(--confetti-x)) rotate(var(--confetti-rot)) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          zIndex: 100,
          width: 0,
          height: 0,
        }}
        aria-hidden="true"
      >
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              borderRadius: p.isCircle ? "50%" : "2px",
              ["--confetti-x" as string]: `${p.x}px`,
              ["--confetti-rot" as string]: `${p.rotation}deg`,
              ["--confetti-scale" as string]: `${p.scale}`,
              animation: `confettiBurst 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}
