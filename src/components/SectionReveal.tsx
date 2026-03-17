"use client";

import { motion } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SectionRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
}

// ── Animation config ───────────────────────────────────────────────────────

const customEase = [0.16, 1, 0.3, 1] as const;

function getInitial(direction: "up" | "left" | "right") {
  switch (direction) {
    case "up":
      return { opacity: 0, y: 20 };
    case "left":
      return { opacity: 0, x: -20 };
    case "right":
      return { opacity: 0, x: 20 };
  }
}

function getAnimate(direction: "up" | "left" | "right") {
  switch (direction) {
    case "up":
      return { opacity: 1, y: 0 };
    case "left":
      return { opacity: 1, x: 0 };
    case "right":
      return { opacity: 1, x: 0 };
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function SectionReveal({
  children,
  delay = 0,
  direction = "up",
}: SectionRevealProps) {
  return (
    <motion.div
      initial={getInitial(direction)}
      whileInView={getAnimate(direction)}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: [...customEase] }}
    >
      {children}
    </motion.div>
  );
}
