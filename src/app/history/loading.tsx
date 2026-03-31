import { SiteNav } from "@/components/SiteNav";
import { SkeletonLine, SkeletonCard } from "@/components/Skeleton";

export default function HistoryLoading() {
  return (
    <main className="min-h-screen px-4 relative">
      <SiteNav user={null} />

      <div className="max-w-2xl mx-auto flex flex-col gap-8 pt-24 pb-10">
        {/* Title skeleton */}
        <SkeletonLine width="180px" height={24} />

        {/* History item skeletons */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border px-4 py-3 flex items-center justify-between animate-pulse"
              style={{
                background: "var(--ts-surface)",
                borderColor: "var(--border)",
              }}
            >
              <SkeletonLine width={`${60 + Math.random() * 30}%`} height={14} />
              <SkeletonLine width="70px" height={10} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
