"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { SkeletonBrief } from "@/components/learning-brief";

// ── Types ──────────────────────────────────────────────────────────────────

interface SearchLoadingProps {
  query: string;
}

// ── Stage definitions ──────────────────────────────────────────────────────

const SOURCE_PLATFORMS = [
  { name: "arXiv", icon: "📄" },
  { name: "YouTube", icon: "▶️" },
  { name: "Hacker News", icon: "🔶" },
  { name: "Official blogs", icon: "📝" },
];

// ── Animations ─────────────────────────────────────────────────────────────

const customEase = [0.16, 1, 0.3, 1] as const;

const fadeVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

// ── Component ──────────────────────────────────────────────────────────────

export function SearchLoading({ query }: SearchLoadingProps) {
  const [stage, setStage] = useState(0);
  const [visibleSources, setVisibleSources] = useState(0);

  useEffect(() => {
    // Stage 0 -> 1 at 2s
    const t1 = setTimeout(() => setStage(1), 2000);
    // Stage 1 -> 2 at 5s
    const t2 = setTimeout(() => setStage(2), 5000);
    // Stage 2 -> 3 at 10s
    const t3 = setTimeout(() => setStage(3), 10000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Stagger source cards appearing in stage 1
  useEffect(() => {
    if (stage < 1) return;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleSources(count);
      if (count >= SOURCE_PLATFORMS.length) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  }, [stage]);

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Background glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full pointer-events-none"
        aria-hidden="true"
        style={{
          background: "var(--ts-accent)",
          opacity: 0.08,
          filter: "blur(80px)",
          animation: "pulseGlow 3s ease-in-out infinite",
        }}
      />

      {/* Query heading */}
      <div className="flex flex-col gap-2">
        <h1
          className="text-white leading-snug"
          style={{
            fontFamily: headingFont,
            fontSize: "clamp(1.5rem, 1.2rem + 1.5vw, 2rem)",
          }}
        >
          {query}
        </h1>
      </div>

      {/* Stage transitions */}
      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.div
            key="stage-0"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: [...customEase] }}
            className="flex flex-col gap-4"
          >
            {/* Searching sources with animated dots */}
            <div className="flex items-center gap-3">
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: "var(--ts-accent)" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--ts-text-2)" }}
              >
                Searching sources
                <span className="loading-dots">
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </span>
              </p>
            </div>

            {/* Checklist items */}
            <div className="flex flex-col gap-2 ml-7">
              <ChecklistItem
                label="Scanning knowledge base..."
                completed={false}
                delay={0}
              />
              <ChecklistItem
                label="Querying AI sources..."
                completed={false}
                delay={0.5}
              />
            </div>
          </motion.div>
        )}

        {stage === 1 && (
          <motion.div
            key="stage-1"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: [...customEase] }}
            className="flex flex-col gap-4"
          >
            {/* Found sources header */}
            <div className="flex items-center gap-3">
              <Check
                size={16}
                style={{ color: "var(--success, #34d399)" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--success, #34d399)" }}
              >
                Found sources
              </p>
            </div>

            {/* Source cards appearing one by one */}
            <div className="flex flex-col gap-2 ml-7">
              {SOURCE_PLATFORMS.map((platform, i) => (
                <motion.div
                  key={platform.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={
                    i < visibleSources
                      ? { opacity: 1, x: 0 }
                      : { opacity: 0, x: -8 }
                  }
                  transition={{
                    duration: 0.25,
                    ease: [...customEase],
                  }}
                >
                  <SourceCard
                    icon={platform.icon}
                    name={platform.name}
                    scanning={i >= visibleSources - 1}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {stage === 2 && (
          <motion.div
            key="stage-2"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: [...customEase] }}
            className="flex flex-col gap-6"
          >
            {/* Generating brief */}
            <div className="flex items-center gap-3">
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: "var(--ts-accent)" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--ts-text-2)" }}
              >
                Generating your brief...
              </p>
            </div>

            {/* Skeleton brief */}
            <SkeletonBrief />
          </motion.div>
        )}

        {stage === 3 && (
          <motion.div
            key="stage-3"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: [...customEase] }}
            className="flex flex-col gap-6"
          >
            {/* Almost ready */}
            <div className="flex items-center gap-3">
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: "var(--ts-accent)" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--ts-accent)" }}
              >
                Almost ready...
              </p>
            </div>

            {/* Skeleton continues */}
            <SkeletonBrief />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated dots CSS */}
      <style jsx>{`
        .loading-dots .dot {
          animation: dotFade 1.4s infinite;
          opacity: 0;
        }
        .loading-dots .dot:nth-child(1) {
          animation-delay: 0s;
        }
        .loading-dots .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dots .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes dotFade {
          0%,
          20% {
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          60%,
          100% {
            opacity: 0;
          }
        }
        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.06;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.12;
            transform: translateX(-50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function ChecklistItem({
  label,
  completed,
  delay,
}: {
  label: string;
  completed: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [...customEase] }}
      className="flex items-center gap-2"
    >
      {completed ? (
        <Check size={12} style={{ color: "var(--success, #34d399)" }} />
      ) : (
        <span
          className="block w-3 h-3 rounded-full border"
          style={{
            borderColor: "var(--ts-muted)",
            animation: "pulse 1.5s infinite",
          }}
        />
      )}
      <span
        className="text-xs"
        style={{
          color: completed ? "var(--success, #34d399)" : "var(--ts-muted)",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

function SourceCard({
  icon,
  name,
  scanning,
}: {
  icon: string;
  name: string;
  scanning: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
      style={{
        background: "var(--ts-surface)",
        borderColor: "var(--border)",
        maxWidth: "480px",
      }}
    >
      <span className="text-sm flex-shrink-0">{icon}</span>
      <span
        className="text-xs font-medium flex-shrink-0"
        style={{ color: "var(--ts-text-2)" }}
      >
        {name}
      </span>
      <span className="flex-1" />
      {scanning ? (
        <span
          className="text-xs"
          style={{ color: "var(--ts-muted)" }}
        >
          Scanning...
        </span>
      ) : (
        <Check size={12} style={{ color: "var(--success, #34d399)" }} />
      )}
    </div>
  );
}
