export default function FeedLoading() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Nav placeholder */}
      <div className="h-16" />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-4 pt-28 pb-16">
        {/* ── TopBar skeleton ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div
            className="flex-1 h-11 rounded-xl animate-pulse"
            style={{ background: "rgba(240,240,240,0.04)" }}
          />
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-20 rounded-lg animate-pulse"
              style={{
                background: "rgba(240,240,240,0.04)",
                animationDelay: "0.1s",
              }}
            />
            <div
              className="h-8 w-24 rounded-lg animate-pulse"
              style={{
                background: "rgba(240,240,240,0.04)",
                animationDelay: "0.15s",
              }}
            />
          </div>
        </div>

        {/* ── FeaturedSection skeleton ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 mb-6">
          {/* Large featured card */}
          <div
            className="rounded-xl p-6 animate-pulse"
            style={{
              background: "rgba(240,240,240,0.03)",
              border: "1px solid rgba(240,240,240,0.06)",
              borderTop: "3px solid rgba(240,240,240,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="h-3 w-16 rounded"
                style={{ background: "rgba(240,240,240,0.06)" }}
              />
              <div
                className="h-3 w-12 rounded"
                style={{ background: "rgba(240,240,240,0.04)" }}
              />
            </div>
            <div
              className="h-7 w-3/4 rounded mb-3"
              style={{ background: "rgba(240,240,240,0.06)" }}
            />
            <div className="flex flex-col gap-2 mb-4">
              <div
                className="h-3.5 w-full rounded"
                style={{ background: "rgba(240,240,240,0.04)" }}
              />
              <div
                className="h-3.5 w-5/6 rounded"
                style={{ background: "rgba(240,240,240,0.04)" }}
              />
              <div
                className="h-3.5 w-2/3 rounded"
                style={{ background: "rgba(240,240,240,0.04)" }}
              />
            </div>
            <div
              className="h-4 w-28 rounded"
              style={{ background: "rgba(240,240,240,0.06)" }}
            />
          </div>

          {/* Quick list (3 compact rows) */}
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg p-3 animate-pulse"
                style={{
                  background: "rgba(240,240,240,0.03)",
                  border: "1px solid rgba(240,240,240,0.06)",
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: "rgba(240,240,240,0.08)" }}
                />
                <div className="flex-1">
                  <div
                    className="h-4 w-4/5 rounded mb-1"
                    style={{ background: "rgba(240,240,240,0.06)" }}
                  />
                  <div
                    className="h-3 w-12 rounded"
                    style={{ background: "rgba(240,240,240,0.04)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CategoryTabs skeleton ────────────────────────────────────── */}
        <div className="flex gap-2 mb-6">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-8 rounded-lg animate-pulse flex-shrink-0"
              style={{
                width: i === 0 ? 40 : [72, 80, 65, 90, 55, 75][i - 1] ?? 70,
                background: "rgba(240,240,240,0.04)",
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>

        {/* ── TopicCardGrid skeleton (2x2) ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl p-5 animate-pulse"
              style={{
                background: "rgba(240,240,240,0.03)",
                border: "1px solid rgba(240,240,240,0.06)",
                borderTop: "3px solid rgba(240,240,240,0.08)",
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="h-3 w-14 rounded"
                  style={{ background: "rgba(240,240,240,0.06)" }}
                />
                <div
                  className="h-3 w-10 rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
              </div>
              <div
                className="h-5 w-3/4 rounded mb-2"
                style={{ background: "rgba(240,240,240,0.06)" }}
              />
              <div className="flex flex-col gap-2 mb-3">
                <div
                  className="h-3.5 w-full rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
                <div
                  className="h-3.5 w-4/5 rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-16 rounded-md"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
                <div
                  className="ml-auto h-3 w-16 rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── EvergreenStrip skeleton ──────────────────────────────────── */}
        <div>
          <div
            className="h-6 w-48 rounded mb-4 animate-pulse"
            style={{ background: "rgba(240,240,240,0.06)" }}
          />
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 rounded-xl p-4 animate-pulse"
                style={{
                  minWidth: 160,
                  background: "rgba(240,240,240,0.03)",
                  border: "1px solid rgba(240,240,240,0.06)",
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <div
                  className="h-5 w-5 rounded mb-2"
                  style={{ background: "rgba(240,240,240,0.06)" }}
                />
                <div
                  className="h-4 w-24 rounded mb-1"
                  style={{ background: "rgba(240,240,240,0.06)" }}
                />
                <div
                  className="h-3 w-32 rounded"
                  style={{ background: "rgba(240,240,240,0.04)" }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
