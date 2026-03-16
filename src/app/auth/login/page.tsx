"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow — same as home page */}
      <div
        className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(124,106,247,0.12) 0%, rgba(60,30,180,0.05) 40%, transparent 70%)",
        }}
      />
      <div
        className="w-full max-w-sm rounded-2xl border p-8 flex flex-col gap-6 relative z-10"
        style={{ background: "var(--ts-surface)", borderColor: "var(--border)", backdropFilter: "blur(16px)", boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
      >
        {/* Wordmark */}
        <div className="text-center">
          <div className="text-xl font-extrabold tracking-tight text-white mb-1">
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </div>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            Sign in to keep searching
          </p>
        </div>

        {sent ? (
          <div className="text-center flex flex-col gap-2">
            <p className="text-sm font-medium" style={{ color: "var(--success)" }}>
              Check your email
            </p>
            <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
              We sent a magic link to <strong className="text-white">{email}</strong>
            </p>
          </div>
        ) : (
          <>
            {/* Google */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 rounded-xl border py-3 text-sm font-medium transition-all hover:border-[var(--border-focus)]"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-xs" style={{ color: "var(--ts-muted)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {/* Magic link */}
            <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background: "var(--ts-surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              {error && (
                <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-40 hover:opacity-90 shadow-[0_0_20px_rgba(124,106,247,0.3)]"
                style={{ background: "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))" }}
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          </>
        )}

        <p className="text-xs text-center" style={{ color: "var(--ts-muted)" }}>
          No password required. No spam. Ever.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
