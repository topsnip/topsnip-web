"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import { FloatingHeadlines } from "./floating-headlines";
import { headingFont } from "@/lib/constants";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/feed";

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
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) {
      setError(error.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating AI headlines background */}
      <FloatingHeadlines />

      {/* Background glow */}
      <div
        className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full"
        style={{ background: "var(--ts-glow-radial)" }}
      />

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] flex flex-col gap-6 relative z-10"
      >
        {/* Logo + tagline */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-2"
        >
          <div
            className="font-normal tracking-tight text-white mb-3"
            style={{ fontFamily: headingFont, fontSize: "var(--text-2xl)" }}
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </div>
          <h1
            className="font-normal tracking-tight text-white mb-2"
            style={{ fontFamily: headingFont, fontSize: "var(--text-xl)" }}
          >
            Start understanding AI
          </h1>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            Sign in to access your personalized AI feed
          </p>
        </motion.div>

        {/* Card */}
        <div
          className="w-full rounded-2xl border p-8 flex flex-col gap-5"
          style={{
            background: "var(--ts-surface)",
            borderColor: "var(--border)",
            backdropFilter: "blur(16px)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {sent ? (
            <div className="text-center flex flex-col gap-3 py-4">
              <div
                className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2"
                style={{ background: "var(--ts-success-12)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p
                className="text-base font-medium"
                style={{ color: "var(--success)" }}
              >
                Check your email
              </p>
              <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                We sent a magic link to{" "}
                <strong className="text-white">{email}</strong>
              </p>
            </div>
          ) : (
            <>
              {/* Google sign-in */}
              <button
                onClick={handleGoogleSignIn}
                className="btn-social w-full flex items-center justify-center gap-3 rounded-xl py-3 px-6 text-sm font-medium"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 h-px"
                  style={{ background: "var(--border)" }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--ts-muted)" }}
                >
                  or
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "var(--border)" }}
                />
              </div>

              {/* Magic link form */}
              <form
                onSubmit={handleEmailSignIn}
                className="flex flex-col gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  aria-label="Email address"
                  className="login-input w-full rounded-xl border px-4 py-3 text-sm outline-none"
                  style={{
                    background: "var(--ts-surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                {error && (
                  <p className="text-xs" style={{ color: "var(--error)" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn-primary w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40"
                  style={{
                    cursor: loading ? "wait" : undefined,
                  }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="opacity-25"
                        />
                        <path
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          className="opacity-75"
                        />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send magic link"
                  )}
                </button>
              </form>

              <p
                className="text-xs text-center"
                style={{ color: "var(--ts-muted)" }}
              >
                No password needed. We&apos;ll send you a magic link.
              </p>
            </>
          )}
        </div>

        {/* Back to home */}
        <div className="text-center">
          <Link
            href="/"
            className="login-back-link inline-flex items-center gap-1 text-sm"
            style={{ color: "var(--ts-text-2)", cursor: "pointer" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to home
          </Link>
        </div>
      </motion.div>
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
