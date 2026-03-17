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
          className="h-4 w-20 rounded mb-8 animate-pulse"
          style={{ background: "rgba(240,240,240,0.04)" }}
        />

        {/* Title skeleton */}
        <div className="flex flex-col gap-3 mb-8">
          <div
            className="h-4 w-24 rounded animate-pulse"
            style={{ background: "var(--ts-accent-10)" }}
          />
          <div
            className="h-8 w-3/4 rounded animate-pulse"
            style={{ background: "rgba(240,240,240,0.06)" }}
          />
          <div
            className="h-4 w-40 rounded animate-pulse"
            style={{ background: "rgba(240,240,240,0.04)" }}
          />
        </div>

        {/* TL;DR card skeleton */}
        <div
          className="rounded-xl p-5 mb-8 animate-pulse"
          style={{
            background: "rgba(240,240,240,0.03)",
            border: "1px solid rgba(240,240,240,0.06)",
          }}
        >
          <div
            className="h-3 w-12 rounded mb-4"
            style={{ background: "var(--ts-glow)" }}
          />
          <div className="flex flex-col gap-2">
            <div
              className="h-4 w-full rounded"
              style={{ background: "rgba(240,240,240,0.05)" }}
            />
            <div
              className="h-4 w-full rounded"
              style={{ background: "rgba(240,240,240,0.05)" }}
            />
            <div
              className="h-4 w-2/3 rounded"
              style={{ background: "rgba(240,240,240,0.05)" }}
            />
          </div>
        </div>

        {/* Section skeletons */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="mb-8 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div
              className="h-3 w-32 rounded mb-3"
              style={{ background: "rgba(240,240,240,0.04)" }}
            />
            <div
              className="rounded-lg p-5"
              style={{
                background: "rgba(240,240,240,0.03)",
                border: "1px solid rgba(240,240,240,0.06)",
              }}
            >
              <div className="flex flex-col gap-2">
                <div
                  className="h-4 w-full rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
                <div
                  className="h-4 w-full rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
                <div
                  className="h-4 w-3/4 rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
