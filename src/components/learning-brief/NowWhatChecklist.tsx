"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface NowWhatChecklistProps {
  items: string[];
}

// ── Markdown-lite renderer (bold only) ─────────────────────────────────────

function renderMarkdown(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-white font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function NowWhatChecklist({ items }: NowWhatChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function toggleItem(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const isChecked = checked.has(i);
        return (
          <button
            key={i}
            onClick={() => toggleItem(i)}
            className="now-what-item flex items-start gap-3 text-left cursor-pointer"
            style={{
              padding: "12px 0",
              borderBottom:
                i < items.length - 1
                  ? "1px solid rgba(255,255,255,0.04)"
                  : "none",
              background: "none",
              border: "none",
              borderBottomWidth: i < items.length - 1 ? "1px" : "0",
              borderBottomStyle: "solid",
              borderBottomColor: "rgba(255,255,255,0.04)",
              width: "100%",
            }}
            aria-checked={isChecked}
            role="checkbox"
          >
            {/* Custom checkbox */}
            <span
              className="now-what-checkbox flex-shrink-0 flex items-center justify-center"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "6px",
                border: isChecked
                  ? "none"
                  : "2px solid rgba(255,255,255,0.12)",
                background: isChecked ? "var(--success, #34d399)" : "transparent",
                transition: "all 200ms var(--ease-out-expo)",
                transform: isChecked ? "scale(1)" : "scale(1)",
                marginTop: "1px",
              }}
            >
              {isChecked && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{
                    animation: "checkmarkDraw 300ms var(--ease-spring) both",
                  }}
                >
                  <path
                    d="M2.5 6L5 8.5L9.5 3.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>

            {/* Item text */}
            <span
              className="text-sm leading-relaxed"
              style={{
                color: isChecked
                  ? "var(--ts-muted)"
                  : "var(--foreground)",
                textDecoration: isChecked ? "line-through" : "none",
                opacity: isChecked ? 0.5 : 1,
                transition: "all 200ms ease",
              }}
            >
              {renderMarkdown(item)}
            </span>
          </button>
        );
      })}

      <style jsx>{`
        @keyframes checkmarkDraw {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          60% {
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .now-what-checkbox {
          transition:
            background 200ms var(--ease-out-expo),
            border-color 200ms var(--ease-out-expo),
            transform 300ms var(--ease-spring);
        }
      `}</style>
    </div>
  );
}
