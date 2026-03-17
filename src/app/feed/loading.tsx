export default function FeedLoading() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Nav placeholder */}
      <div className="h-16" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pt-28 pb-16">
        {/* Search bar skeleton */}
        <div
          className="h-12 rounded-2xl mb-8 animate-pulse"
          style={{ background: "rgba(240,240,240,0.04)" }}
        />

        {/* Date heading skeleton */}
        <div className="flex flex-col gap-2 mb-8">
          <div
            className="h-7 w-48 rounded-md animate-pulse"
            style={{ background: "rgba(240,240,240,0.06)" }}
          />
          <div
            className="h-4 w-64 rounded-md animate-pulse"
            style={{ background: "rgba(240,240,240,0.04)" }}
          />
        </div>

        {/* Card skeletons */}
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-6 flex flex-col gap-4 animate-pulse"
              style={{
                background: "rgba(240,240,240,0.03)",
                border: "1px solid rgba(240,240,240,0.06)",
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {/* Badge row */}
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-16 rounded-full"
                  style={{ background: "var(--ts-accent-10)" }}
                />
                <div
                  className="h-3 w-20 rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
              </div>

              {/* Title */}
              <div
                className="h-5 w-3/4 rounded"
                style={{ background: "rgba(240,240,240,0.06)" }}
              />

              {/* TL;DR lines */}
              <div className="flex flex-col gap-2">
                <div
                  className="h-3.5 w-full rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
                <div
                  className="h-3.5 w-5/6 rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
              </div>

              {/* Read more */}
              <div
                className="h-3 w-24 rounded"
                style={{ background: "var(--ts-accent-8)" }}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
