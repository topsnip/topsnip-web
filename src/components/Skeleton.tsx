/** Pulsing skeleton bars for loading states */

interface SkeletonLineProps {
  width?: string;
  height?: number;
}

export function SkeletonLine({ width = "100%", height = 12 }: SkeletonLineProps) {
  return (
    <div
      className="rounded animate-pulse"
      style={{
        width,
        height: `${height}px`,
        background: "var(--border)",
      }}
    />
  );
}

interface SkeletonCardProps {
  height?: number;
}

export function SkeletonCard({ height = 120 }: SkeletonCardProps) {
  return (
    <div
      className="rounded-xl animate-pulse"
      style={{
        height: `${height}px`,
        background: "var(--ts-surface)",
      }}
    />
  );
}

interface SkeletonGroupProps {
  count?: number;
  cardHeight?: number;
}

export function SkeletonGroup({ count = 3, cardHeight = 120 }: SkeletonGroupProps) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={cardHeight} />
      ))}
    </div>
  );
}
