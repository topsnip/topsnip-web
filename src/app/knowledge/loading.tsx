import { SiteNav } from "@/components/SiteNav";

const headingFont = "var(--font-heading), 'Instrument Serif', serif";

function SkeletonBar({ w, h = "h-4" }: { w: string; h?: string }) {
  return (
    <div
      className={`${w} ${h} rounded`}
      style={{ background: "var(--ts-surface-hover)", opacity: 0.5 }}
    />
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--ts-surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded"
          style={{ background: "var(--ts-surface-hover)", opacity: 0.4 }}
        />
        <SkeletonBar w="w-16" h="h-7" />
      </div>
      <SkeletonBar w="w-20" h="h-3" />
    </div>
  );
}

export default function KnowledgeLoading() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <SiteNav user={null} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-28 pb-16 relative z-10">
        {/* Title skeleton */}
        <div className="flex flex-col gap-2 mb-8">
          <SkeletonBar w="w-48" h="h-7" />
          <SkeletonBar w="w-64" h="h-4" />
        </div>

        {/* Stats bar skeleton — 4 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Level bar skeleton */}
        <div
          className="rounded-xl p-5 mb-10"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          }}
        >
          <div className="flex justify-between mb-3">
            <SkeletonBar w="w-32" h="h-4" />
            <SkeletonBar w="w-24" h="h-3" />
          </div>
          <div
            className="w-full"
            style={{
              height: "8px",
              borderRadius: "9999px",
              background: "var(--ts-surface-hover, rgba(255,255,255,0.06))",
            }}
          />
          <div className="flex justify-end mt-2">
            <SkeletonBar w="w-28" h="h-3" />
          </div>
        </div>

        {/* Knowledge map skeleton — 6 tag pills */}
        <div className="mb-10">
          <SkeletonBar w="w-36" h="h-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                }}
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ background: "var(--ts-surface-hover)", opacity: 0.4 }}
                />
                <div className="flex flex-col gap-1.5">
                  <SkeletonBar w="w-16" h="h-3" />
                  <SkeletonBar w="w-12" h="h-2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline skeleton — 4 entries */}
        <div className="mb-10">
          <SkeletonBar w="w-32" h="h-6" />
          <div className="flex flex-col gap-4 mt-4 pl-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: "var(--ts-surface-hover)", opacity: 0.5 }}
                />
                <SkeletonBar w="w-48" h="h-4" />
                <div className="ml-auto">
                  <SkeletonBar w="w-14" h="h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
