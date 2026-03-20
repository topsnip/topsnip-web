"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface NewTopicToastProps {
  count: number;
  onRefresh: () => void;
  onDismiss: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function NewTopicToast({ count, onRefresh, onDismiss }: NewTopicToastProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: -40, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: -40, x: "-50%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="fixed top-20 z-50 flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-lg"
          style={{
            left: "50%",
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <span className="text-sm text-white">
            {count} new topic{count === 1 ? "" : "s"} available
          </span>

          <button
            onClick={onRefresh}
            className="text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--ts-accent)" }}
          >
            Refresh
          </button>

          <button
            onClick={onDismiss}
            className="rounded-md p-1 transition-colors hover:bg-white/10"
            aria-label="Dismiss notification"
          >
            <X size={14} style={{ color: "var(--ts-text-2)" }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
