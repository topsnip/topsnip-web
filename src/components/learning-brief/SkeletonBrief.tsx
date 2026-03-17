"use client";

// ── Shimmer block ──────────────────────────────────────────────────────────

function ShimmerBlock({
  height = "1rem",
  width = "100%",
  className = "",
}: {
  height?: string;
  width?: string;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-shimmer rounded-md ${className}`}
      style={{
        height,
        width,
        background:
          "linear-gradient(90deg, var(--ts-surface-2) 25%, rgba(255,255,255,0.04) 50%, var(--ts-surface-2) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

// ── Skeleton card wrapper ──────────────────────────────────────────────────

function SkeletonCard({
  children,
  accentBorder = false,
}: {
  children: React.ReactNode;
  accentBorder?: boolean;
}) {
  return (
    <div
      className="rounded-xl"
      style={{
        background: "var(--ts-surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "1.5rem",
        ...(accentBorder
          ? {
              borderLeft: "4px solid var(--ts-accent-20)",
              borderRadius: "0 12px 12px 0",
              background: "rgba(232,115,74,0.02)",
            }
          : {}),
      }}
    >
      {children}
    </div>
  );
}

// ── Main skeleton component ────────────────────────────────────────────────

export function SkeletonBrief() {
  return (
    <div className="flex flex-col" style={{ gap: "1.5rem" }}>
      {/* TL;DR skeleton */}
      <SkeletonCard accentBorder>
        <ShimmerBlock height="0.75rem" width="3rem" className="mb-4" />
        <div className="flex flex-col gap-2">
          <ShimmerBlock height="1.125rem" width="100%" />
          <ShimmerBlock height="1.125rem" width="100%" />
          <ShimmerBlock height="1.125rem" width="65%" />
        </div>
      </SkeletonCard>

      {/* What Happened skeleton */}
      <SkeletonCard>
        <ShimmerBlock height="0.75rem" width="6rem" className="mb-4" />
        <div className="flex flex-col gap-2">
          <ShimmerBlock height="0.875rem" width="100%" />
          <ShimmerBlock height="0.875rem" width="100%" />
          <ShimmerBlock height="0.875rem" width="90%" />
          <ShimmerBlock height="0.875rem" width="100%" className="mt-2" />
          <ShimmerBlock height="0.875rem" width="75%" />
        </div>
      </SkeletonCard>

      {/* So What skeleton */}
      <SkeletonCard>
        <ShimmerBlock height="0.75rem" width="4rem" className="mb-4" />
        <div className="flex flex-col gap-2">
          <ShimmerBlock height="0.875rem" width="100%" />
          <ShimmerBlock height="0.875rem" width="95%" />
          <ShimmerBlock height="0.875rem" width="80%" />
        </div>
      </SkeletonCard>

      {/* Now What skeleton */}
      <SkeletonCard>
        <ShimmerBlock height="0.75rem" width="5rem" className="mb-4" />
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <ShimmerBlock height="20px" width="20px" className="flex-shrink-0 rounded-md" />
            <ShimmerBlock height="0.875rem" width="85%" />
          </div>
          <div className="flex items-start gap-3">
            <ShimmerBlock height="20px" width="20px" className="flex-shrink-0 rounded-md" />
            <ShimmerBlock height="0.875rem" width="70%" />
          </div>
          <div className="flex items-start gap-3">
            <ShimmerBlock height="20px" width="20px" className="flex-shrink-0 rounded-md" />
            <ShimmerBlock height="0.875rem" width="90%" />
          </div>
        </div>
      </SkeletonCard>

      {/* Shimmer keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
