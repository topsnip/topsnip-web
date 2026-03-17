"use client";

import { useRouter } from "next/navigation";

interface SignUpGateProps {
  /** "guest" = hit 3-search guest limit, "free" = hit 10-search free limit */
  reason: "guest" | "free";
  currentPath: string;
  onDismiss?: () => void;
}

export function SignUpGate({
  reason,
  currentPath,
  onDismiss,
}: SignUpGateProps) {
  const router = useRouter();

  const message =
    reason === "guest"
      ? "You've used your 3 free searches. Sign up free — no credit card needed."
      : "You've hit your 10 daily searches. Upgrade to Pro for unlimited access.";

  const cta =
    reason === "guest" ? "Sign up free" : "Upgrade to Pro — $9.99/month";

  const ctaPath =
    reason === "guest"
      ? `/auth/login?redirect=${encodeURIComponent(currentPath)}`
      : "/upgrade";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (onDismiss) onDismiss();
          else router.push("/");
        }
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 flex flex-col gap-5"
        style={{
          background: "var(--ts-surface)",
          borderColor: "var(--border)",
          backdropFilter: "blur(16px)",
          boxShadow:
            "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Wordmark */}
        <div className="text-lg font-extrabold tracking-tight text-white">
          top<span style={{ color: "var(--ts-accent)" }}>snip</span>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold text-white">Keep going</p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--ts-text-2)" }}
          >
            {message}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push(ctaPath)}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 shadow-[0_0_20px_var(--ts-accent-30)]"
            style={{
              background:
                "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
            }}
          >
            {cta}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full rounded-xl py-3 text-sm font-medium transition-all hover:opacity-80"
              style={{ color: "var(--ts-muted)" }}
            >
              Maybe later
            </button>
          )}
        </div>

        {reason === "free" && (
          <p
            className="text-xs text-center"
            style={{ color: "var(--ts-muted)" }}
          >
            $9.99/month · cancel any time · no commitment
          </p>
        )}
      </div>
    </div>
  );
}
