"use client";

import { motion } from "framer-motion";

interface Takeaway {
  label: string;
  text: string;
}

interface KeyTakeawayCardsProps {
  takeaways: Takeaway[];
}

const BORDER_COLORS = [
  "var(--ts-accent)", // coral #E8734A
  "#3b82f6",          // blue
  "#eab308",          // amber
];

export function KeyTakeawayCards({ takeaways }: KeyTakeawayCardsProps) {
  return (
    <div className="flex flex-row flex-wrap gap-3">
      {takeaways.map((takeaway, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-w-[200px] rounded-lg"
          style={{
            padding: "16px",
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderLeft: `3px solid ${BORDER_COLORS[i] || BORDER_COLORS[0]}`,
          }}
        >
          <p
            className="text-xs mb-1.5"
            style={{ color: "var(--ts-muted)" }}
          >
            {takeaway.label}
          </p>
          <p className="text-sm font-bold text-white">
            {takeaway.text}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
