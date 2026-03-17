import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <p
          className="text-6xl font-extrabold tracking-tight"
          style={{
            color: "var(--ts-accent)",
            fontFamily: "var(--font-heading), 'Instrument Serif', serif",
          }}
        >
          404
        </p>

        <div className="flex flex-col gap-2">
          <h1
            className="text-xl font-bold tracking-tight"
            style={{
              color: "var(--foreground)",
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            Page not found
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(240,240,240,0.6)" }}
          >
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
            boxShadow: "0 0 20px var(--ts-accent-30)",
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
