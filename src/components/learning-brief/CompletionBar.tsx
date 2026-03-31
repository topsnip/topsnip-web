"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface CompletionBarProps {
  onMarkUnderstood?: () => void;
}

export function CompletionBar({ onMarkUnderstood }: CompletionBarProps) {
  const [understood, setUnderstood] = useState(false);

  function handleClick() {
    if (understood) return;
    setUnderstood(true);
    onMarkUnderstood?.();
  }

  return (
    <div className="flex justify-center">
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: [0.95, 1.05, 1] }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm transition-colors"
        style={{
          background: understood ? "rgba(232,115,74,0.08)" : "transparent",
          border: `1px solid ${understood ? "var(--ts-accent)" : "var(--border)"}`,
          color: understood ? "var(--ts-accent)" : "var(--ts-text-2)",
          cursor: understood ? "default" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!understood) {
            e.currentTarget.style.borderColor = "var(--ts-accent)";
            e.currentTarget.style.color = "var(--ts-accent)";
          }
        }}
        onMouseLeave={(e) => {
          if (!understood) {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--ts-text-2)";
          }
        }}
      >
        <CheckCircle2 size={16} />
        {understood ? "Understood" : "I understand this topic"}
      </motion.button>
    </div>
  );
}
