"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SiteNav } from "@/components/SiteNav";

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded") === "true";

  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(
    null,
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setIsLoggedIn(false);
        return;
      }
      setIsLoggedIn(true);

      // Check current plan
      const { data: profile } = await sb
        .from("profiles")
        .select("plan")
        .eq("id", data.user.id)
        .single();
      if (profile?.plan === "pro") setIsPro(true);
    });
  }, []);

  async function handleCheckout(interval: "monthly" | "yearly") {
    if (!isLoggedIn) {
      router.push("/auth/login?redirect=/upgrade");
      return;
    }

    setLoadingPlan(interval);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // If not authenticated, redirect to login
        if (res.status === 401) {
          router.push("/auth/login?redirect=/upgrade");
          return;
        }
        throw new Error(err.error ?? "Something went wrong");
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setCheckoutError(msg);
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  }

  // ── Success state (returned from Stripe) ──────────────────────────────────
  if (upgraded) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div
          className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--ts-accent-12) 0%, transparent 70%)",
          }}
        />
        <div
          className="w-full max-w-sm rounded-2xl border p-8 flex flex-col items-center gap-5 relative z-10 text-center"
          style={{
            background: "var(--ts-surface)",
            borderColor: "var(--border)",
            backdropFilter: "blur(16px)",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: "var(--ts-success-10)",
              border: "1px solid var(--ts-success-30)",
            }}
          >
            <Check size={20} style={{ color: "var(--success)" }} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-white">
              You&apos;re on Pro.
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--ts-text-2)" }}
            >
              Unlimited searches, starting now. Go find something.
            </p>
          </div>
          <button
            onClick={() => router.push("/feed")}
            className="btn-primary flex items-center gap-1.5 rounded-xl px-5 py-3 text-sm w-full justify-center"
          >
            Start searching
            <ArrowRight size={14} />
          </button>
        </div>
      </main>
    );
  }

  // ── Already Pro state ──────────────────────────────────────────────────────
  if (isPro) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div
          className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--ts-accent-10) 0%, transparent 70%)",
          }}
        />
        <div
          className="w-full max-w-sm rounded-2xl border p-8 flex flex-col items-center gap-4 relative z-10 text-center"
          style={{
            background: "var(--ts-surface)",
            borderColor: "var(--border)",
            backdropFilter: "blur(16px)",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="text-xl font-extrabold tracking-tight text-white">
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </div>
          <p className="text-base font-semibold text-white">
            You&apos;re already on Pro.
          </p>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            Unlimited searches. No limits.
          </p>
          <button
            onClick={() => router.push("/feed")}
            className="btn-ghost text-sm font-medium"
            style={{ color: "var(--ts-accent)" }}
          >
            Back to search
          </button>
        </div>
      </main>
    );
  }

  // ── Main upgrade page ──────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--ts-accent-10) 0%, transparent 70%)",
        }}
      />

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <SiteNav user={null} />

      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-10 relative z-10 pt-20">
        {/* Heading */}
        <div className="text-center flex flex-col gap-3">
          <h1
            className="font-extrabold tracking-tight leading-tight text-white"
            style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)" }}
          >
            Unlimited searches.
          </h1>
          <p
            className="text-base max-w-sm mx-auto leading-relaxed"
            style={{ color: "var(--ts-text-2)" }}
          >
            Free gets you the &ldquo;what.&rdquo; Pro gives you the &ldquo;so
            what&rdquo; and &ldquo;now what&rdquo; — tailored to your role.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          {/* Monthly */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-muted)" }}
              >
                Pro — Monthly
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-white">
                  $9.99
                </span>
                <span className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                  /month
                </span>
              </div>
            </div>

            <ul className="flex flex-col gap-2.5">
              {[
                "Unlimited searches",
                "Role-specific depth (dev, PM, CTO)",
                '"So What" + "Now What" sections',
                "Personalized feed + knowledge tracking",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--ts-text-2)" }}
                >
                  <Check
                    size={13}
                    style={{ color: "var(--ts-accent)", flexShrink: 0 }}
                  />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("monthly")}
              disabled={loadingPlan !== null}
              className="btn-primary w-full rounded-xl py-3 text-sm mt-auto"
            >
              {loadingPlan === "monthly"
                ? "Redirecting..."
                : "Get Pro — $9.99/mo"}
            </button>
          </div>

          {/* Yearly — highlighted */}
          <div className="pro-card-glow rounded-2xl p-6 flex flex-col gap-5 relative">
            {/* Best value badge */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                color: "#fff",
                letterSpacing: "0.02em",
                boxShadow: "0 0 10px var(--ts-accent-50)",
              }}
            >
              Save $40/year
            </div>

            <div className="flex flex-col gap-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--ts-accent)" }}
              >
                Pro — Yearly
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-white">
                  $79
                </span>
                <span className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                  /year
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                ~$6.58/month
              </p>
            </div>

            <ul className="flex flex-col gap-2.5">
              {[
                "Unlimited searches",
                "Role-specific depth (dev, PM, CTO)",
                '"So What" + "Now What" sections',
                "Personalized feed + knowledge tracking",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--ts-text-2)" }}
                >
                  <Check
                    size={13}
                    style={{ color: "var(--ts-accent)", flexShrink: 0 }}
                  />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("yearly")}
              disabled={loadingPlan !== null}
              className="btn-primary w-full rounded-xl py-3 text-sm mt-auto"
            >
              {loadingPlan === "yearly" ? "Redirecting..." : "Get Pro — $79/yr"}
            </button>
          </div>
        </div>

        {/* Compare tiers — minimal reference */}
        <div
          className="w-full max-w-xl rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="grid grid-cols-2 md:grid-cols-4 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{
              color: "var(--ts-muted)",
              background: "var(--ts-surface)",
            }}
          >
            <span className="col-span-1 md:col-span-2">Tier</span>
            <span>Searches/day</span>
            <span className="hidden md:block">Price</span>
          </div>
          {[
            { tier: "Guest", searches: "3", price: "Free", muted: true },
            { tier: "Free account", searches: "10", price: "$0", muted: true },
            {
              tier: "Pro",
              searches: "Unlimited",
              price: "From $6.58/mo",
              accent: true,
            },
          ].map((row) => (
            <div
              key={row.tier}
              className="grid grid-cols-2 md:grid-cols-4 px-4 py-3 text-sm border-t"
              style={{
                borderColor: "var(--border)",
                background: row.accent
                  ? "var(--ts-accent-4)"
                  : "transparent",
              }}
            >
              <span
                className="col-span-1 md:col-span-2 font-medium"
                style={{
                  color: row.accent ? "var(--foreground)" : "var(--ts-text-2)",
                }}
              >
                {row.tier}
              </span>
              <span
                style={{
                  color: row.accent ? "var(--ts-accent)" : "var(--ts-text-2)",
                }}
              >
                {row.searches}
              </span>
              <span
                className="hidden md:block"
                style={{
                  color: row.muted ? "var(--ts-muted)" : "var(--ts-text-2)",
                }}
              >
                {row.price}
              </span>
            </div>
          ))}
        </div>

        {/* Checkout error */}
        {checkoutError && (
          <p
            className="text-sm text-center font-medium"
            style={{ color: "var(--error, #ef4444)" }}
          >
            {checkoutError}
          </p>
        )}

        {/* Footer note */}
        <p className="text-xs text-center" style={{ color: "var(--ts-muted)" }}>
          No commitment. Cancel any time. Billed via Stripe.
        </p>
      </div>
    </main>
  );
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}
