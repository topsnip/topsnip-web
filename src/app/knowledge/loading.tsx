import { AuthNav } from "@/components/AuthNav";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

function SkeletonBar({ w, h = "h-4" }: { w: string; h?: string }) {
  return (
    <div
      className={`${w} ${h} rounded`}
      style={{ background: "var(--ts-surface-hover)", opacity: 0.5 }}
    />
  );
}

export default function KnowledgeLoading() {
  return (
    <main className="min-h-screen px-4 relative">
      <AuthNav />
      <div className="max-w-3xl mx-auto flex flex-col gap-10 pt-28 pb-16">
        {/* Title skeleton */}
        <div className="flex flex-col gap-2">
          <SkeletonBar w="w-48" h="h-7" />
          <SkeletonBar w="w-64" h="h-4" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-5 flex flex-col gap-3"
              style={{
                background: "var(--ts-surface)",
                borderColor: "var(--border)",
              }}
            >
              <SkeletonBar w="w-16" h="h-8" />
              <SkeletonBar w="w-24" h="h-3" />
            </div>
          ))}
        </div>

        {/* Knowledge map skeleton */}
        <div className="flex flex-col gap-4">
          <SkeletonBar w="w-36" h="h-6" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full h-7"
                style={{
                  width: `${60 + (i % 3) * 20}px`,
                  background: "var(--ts-surface-hover)",
                  opacity: 0.4,
                }}
              />
            ))}
          </div>
        </div>

        {/* Recent reads skeleton */}
        <div className="flex flex-col gap-4">
          <SkeletonBar w="w-32" h="h-6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border px-4 py-3 flex items-center justify-between"
              style={{
                background: "var(--ts-surface)",
                borderColor: "var(--border)",
              }}
            >
              <SkeletonBar w="w-48" />
              <SkeletonBar w="w-20" h="h-3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
