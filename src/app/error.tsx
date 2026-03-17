"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: "var(--ts-error-8)",
            border: "1px solid var(--ts-error-25)",
          }}
        >
          <span className="text-2xl" style={{ color: "#F87171" }}>
            !
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1
            className="text-xl font-bold tracking-tight"
            style={{
              color: "var(--foreground)",
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            Something went wrong
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(240,240,240,0.6)" }}
          >
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>

        <button
          onClick={reset}
          className="btn-primary rounded-xl px-6 py-3 text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
