export default function TopicLoading() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Nav placeholder */}
      <div className="h-16" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-28 pb-16">
        {/* Back link skeleton */}
        <div
          className="h-4 w-20 rounded mb-8 skeleton-shimmer skeleton-stagger"
          style={{ animationDelay: "0ms" }}
        />

        {/* Title skeleton */}
        <div
          className="flex flex-col gap-3 mb-8 skeleton-stagger"
          style={{ animationDelay: "50ms" }}
        >
          <div
            className="h-4 w-24 rounded skeleton-shimmer"
            style={{ background: "var(--ts-accent-10)" }}
          />
          <div className="h-8 w-3/4 rounded skeleton-shimmer" />
          <div className="h-4 w-40 rounded skeleton-shimmer" />
        </div>

        {/* TL;DR card skeleton */}
        <div
          className="rounded-xl p-5 mb-8 skeleton-stagger"
          style={{
            background: "var(--ts-surface)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--ts-accent-25)",
            animationDelay: "100ms",
          }}
        >
          <div
            className="h-3 w-12 rounded mb-4 skeleton-shimmer"
          />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-full rounded skeleton-shimmer" />
            <div className="h-4 w-full rounded skeleton-shimmer" />
            <div className="h-4 w-2/3 rounded skeleton-shimmer" />
          </div>
        </div>

        {/* Section skeletons */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="mb-8 skeleton-stagger"
            style={{ animationDelay: `${150 + i * 50}ms` }}
          >
            <div className="h-3 w-32 rounded mb-3 skeleton-shimmer" />
            <div
              className="rounded-lg p-5"
              style={{
                background: "var(--ts-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex flex-col gap-2">
                <div className="h-4 w-full rounded skeleton-shimmer" />
                <div className="h-4 w-full rounded skeleton-shimmer" />
                <div className="h-4 w-3/4 rounded skeleton-shimmer" />
              </div>
            </div>
          </div>
        ))}

        {/* Sources skeleton */}
        <div
          className="skeleton-stagger"
          style={{ animationDelay: "300ms" }}
        >
          <div className="h-3 w-20 rounded mb-3 skeleton-shimmer" />
          <div
            className="rounded-lg p-5"
            style={{
              background: "var(--ts-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded skeleton-shimmer flex-shrink-0" />
                  <div className="h-4 w-3/5 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
