"use client";

import { motion } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PageTransitionProps {
  children: React.ReactNode;
}

// ── Animation config ───────────────────────────────────────────────────────

const customEase = [0.16, 1, 0.3, 1] as const;

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ── Component ──────────────────────────────────────────────────────────────

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [...customEase] }}
    >
      {children}
    </motion.div>
  );
}
