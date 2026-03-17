"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LogOut, Crown, User } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SiteNav } from "@/components/SiteNav";

/* ─── Types ────────────────────────────────────────────────────────────────── */

type Plan = "free" | "pro";
type Role = "general" | "developer" | "pm" | "cto";

interface Profile {
  email: string | null;
  plan: Plan;
  role: Role;
  interests: string[];
}

interface Tag {
  slug: string;
  label: string;
}

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: "general",
    label: "General",
    description: "Broad AI coverage across all domains",
  },
  {
    value: "developer",
    label: "Developer",
    description: "Code-level depth, APIs, frameworks, tools",
  },
  {
    value: "pm",
    label: "Product Manager",
    description: "Strategy, roadmaps, competitive landscape",
  },
  {
    value: "cto",
    label: "CTO / Tech Lead",
    description: "Architecture, scaling, team decisions",
  },
];

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

  // Editable state
  const [selectedRole, setSelectedRole] = useState<Role>("general");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Save feedback
  const [savingRole, setSavingRole] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const [roleSaved, setRoleSaved] = useState(false);
  const [interestsSaved, setInterestsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User ID for SiteNav
  const [userId, setUserId] = useState<string | null>(null);

  // Sign out
  const [signingOut, setSigningOut] = useState(false);

  /* ── Fetch profile + tags on mount ───────────────────────────────────────── */

  useEffect(() => {
    const sb = createClient();

    async function load() {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        router.push("/auth/login?redirect=/settings");
        return;
      }

      const [profileRes, tagsRes] = await Promise.all([
        sb
          .from("profiles")
          .select("email, plan, role, interests")
          .eq("id", user.id)
          .single(),
        sb.from("tags").select("slug, label").order("label"),
      ]);

      if (profileRes.error) {
        setError("Failed to load profile.");
        setLoading(false);
        return;
      }

      const p = profileRes.data as Profile;
      setUserId(user.id);
      setProfile(p);
      setSelectedRole(p.role);
      setSelectedInterests(p.interests ?? []);
      setTags((tagsRes.data as Tag[]) ?? []);
      setLoading(false);
    }

    load();
  }, [router]);

  /* ── Save role ───────────────────────────────────────────────────────────── */

  const saveRole = useCallback(async () => {
    setSavingRole(true);
    setRoleSaved(false);
    setError(null);

    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { error: err } = await sb
      .from("profiles")
      .update({ role: selectedRole })
      .eq("id", user.id);

    setSavingRole(false);
    if (err) {
      setError("Failed to save role.");
    } else {
      setRoleSaved(true);
      setProfile((prev) => (prev ? { ...prev, role: selectedRole } : prev));
      setTimeout(() => setRoleSaved(false), 2000);
    }
  }, [selectedRole]);

  /* ── Save interests ──────────────────────────────────────────────────────── */

  const saveInterests = useCallback(async () => {
    setSavingInterests(true);
    setInterestsSaved(false);
    setError(null);

    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;

    const { error: err } = await sb
      .from("profiles")
      .update({ interests: selectedInterests })
      .eq("id", user.id);

    setSavingInterests(false);
    if (err) {
      setError("Failed to save interests.");
    } else {
      setInterestsSaved(true);
      setProfile((prev) =>
        prev ? { ...prev, interests: selectedInterests } : prev,
      );
      setTimeout(() => setInterestsSaved(false), 2000);
    }
  }, [selectedInterests]);

  /* ── Toggle interest ─────────────────────────────────────────────────────── */

  function toggleInterest(slug: string) {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  /* ── Sign out ────────────────────────────────────────────────────────────── */

  async function handleSignOut() {
    setSigningOut(true);
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/");
  }

  /* ── Manage subscription (Stripe portal) ─────────────────────────────────── */

  async function handleManageSubscription() {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) throw new Error("Failed to open billing portal");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setError("Could not open billing portal. Please try again.");
    }
  }

  /* ── Loading state ───────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--ts-accent)",
              borderTopColor: "transparent",
            }}
          />
          <p className="text-sm" style={{ color: "var(--ts-muted)" }}>
            Loading settings...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center flex flex-col gap-3">
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            {error ?? "Unable to load profile."}
          </p>
          <Link
            href="/"
            className="text-sm font-medium"
            style={{ color: "var(--ts-accent)" }}
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const roleChanged = selectedRole !== profile.role;
  const interestsChanged =
    JSON.stringify([...selectedInterests].sort()) !==
    JSON.stringify([...(profile.interests ?? [])].sort());

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-glow"
        style={{
          background: "var(--ts-glow-radial)",
        }}
      />

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <SiteNav user={userId && profile ? { id: userId, plan: profile.plan } : null} />

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-28 pb-16 sm:pt-32 flex flex-col gap-8 relative z-10">
        <h1
          className="text-2xl font-bold tracking-tight text-white"
          style={{
            fontFamily: "var(--font-heading), 'Instrument Serif', serif",
          }}
        >
          Settings
        </h1>

        {/* Error banner */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{
              background: "var(--ts-error-8)",
              color: "var(--error)",
              border: "1px solid var(--ts-error-20)",
            }}
          >
            {error}
          </div>
        )}

        {/* ── Section: Profile ─────────────────────────────────────────────── */}
        <section
          className="glass-card rounded-xl p-6 flex flex-col gap-4"
          style={{ cursor: "default" }}
        >
          <div className="flex items-center gap-2">
            <User size={16} style={{ color: "var(--ts-accent)" }} />
            <h2
              className="text-base font-semibold text-white"
              style={{
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              Profile
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1 flex-1">
              <label
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: "var(--ts-muted)" }}
              >
                Email
              </label>
              <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                {profile.email ?? "No email"}
              </p>
            </div>

            {/* Plan badge */}
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: "var(--ts-muted)" }}
              >
                Plan
              </label>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold w-fit"
                style={
                  profile.plan === "pro"
                    ? {
                        background: "var(--ts-accent-12)",
                        color: "var(--ts-accent)",
                        border: "1px solid var(--ts-accent-30)",
                      }
                    : {
                        background: "var(--ts-surface-2)",
                        color: "var(--ts-text-2)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {profile.plan === "pro" && <Crown size={12} />}
                {profile.plan === "pro" ? "Pro" : "Free"}
              </span>
            </div>
          </div>
        </section>

        {/* ── Section: Role ────────────────────────────────────────────────── */}
        <section
          className="glass-card rounded-xl p-6 flex flex-col gap-4"
          style={{ cursor: "default" }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-semibold text-white"
              style={{
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              Your Role
            </h2>
            {roleSaved && (
              <span
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--success)" }}
              >
                <Check size={12} /> Saved
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            TopSnip tailors content depth and language to your role.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map((r) => {
              const active = selectedRole === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setSelectedRole(r.value)}
                  className="rounded-xl p-4 text-left transition-all duration-200 cursor-pointer"
                  style={{
                    background: active
                      ? "var(--ts-accent-8)"
                      : "var(--ts-surface)",
                    border: active
                      ? "1px solid var(--ring)"
                      : "1px solid var(--border)",
                    boxShadow: active
                      ? "0 0 16px var(--ts-accent-10)"
                      : "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: active
                          ? "var(--foreground)"
                          : "var(--ts-text-2)",
                      }}
                    >
                      {r.label}
                    </span>
                    {active && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "var(--ts-accent)" }}
                      >
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                    {r.description}
                  </p>
                </button>
              );
            })}
          </div>

          {roleChanged && (
            <button
              onClick={saveRole}
              disabled={savingRole}
              className="self-end rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                boxShadow: "0 0 16px var(--ts-accent-25)",
              }}
            >
              {savingRole ? "Saving..." : "Save role"}
            </button>
          )}
        </section>

        {/* ── Section: Interests ───────────────────────────────────────────── */}
        <section
          className="glass-card rounded-xl p-6 flex flex-col gap-4"
          style={{ cursor: "default" }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-semibold text-white"
              style={{
                fontFamily: "var(--font-heading), 'Instrument Serif', serif",
              }}
            >
              Interests
            </h2>
            {interestsSaved && (
              <span
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--success)" }}
              >
                <Check size={12} /> Saved
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            Select topics you care about to personalize your feed.
          </p>

          {tags.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
              No tags available.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedInterests.includes(tag.slug);
                return (
                  <button
                    key={tag.slug}
                    onClick={() => toggleInterest(tag.slug)}
                    className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer"
                    style={{
                      background: active
                        ? "var(--ts-accent-12)"
                        : "var(--ts-surface)",
                      border: active
                        ? "1px solid var(--ring)"
                        : "1px solid var(--border)",
                      color: active ? "var(--ts-accent)" : "var(--ts-text-2)",
                      boxShadow: active
                        ? "0 0 10px var(--ts-accent-10)"
                        : "none",
                    }}
                  >
                    {active && (
                      <Check
                        size={10}
                        className="inline mr-1"
                        style={{ verticalAlign: "-1px" }}
                      />
                    )}
                    {tag.label}
                  </button>
                );
              })}
            </div>
          )}

          {interestsChanged && (
            <button
              onClick={saveInterests}
              disabled={savingInterests}
              className="self-end rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                boxShadow: "0 0 16px var(--ts-accent-25)",
              }}
            >
              {savingInterests ? "Saving..." : "Save interests"}
            </button>
          )}
        </section>

        {/* ── Section: Subscription ────────────────────────────────────────── */}
        <section
          className="glass-card rounded-xl p-6 flex flex-col gap-4"
          style={{ cursor: "default" }}
        >
          <h2
            className="text-base font-semibold text-white"
            style={{
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            Subscription
          </h2>

          {profile.plan === "free" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                  You&apos;re on the{" "}
                  <strong className="text-white">Free</strong> plan.
                </p>
                <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                  Upgrade to Pro for unlimited searches and role-specific depth.
                </p>
              </div>
              <Link
                href="/upgrade"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 whitespace-nowrap"
                style={{
                  background:
                    "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                  boxShadow: "0 0 20px var(--ts-accent-25)",
                }}
              >
                <Crown size={14} />
                Upgrade to Pro
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                  You&apos;re on the{" "}
                  <strong style={{ color: "var(--ts-accent)" }}>Pro</strong>{" "}
                  plan.
                </p>
                <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
                  Manage billing, update payment method, or cancel.
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-80 whitespace-nowrap cursor-pointer"
                style={{
                  color: "var(--ts-text-2)",
                  background: "transparent",
                  border: "1px solid var(--border)",
                }}
              >
                Manage subscription
              </button>
            </div>
          )}
        </section>

        {/* ── Sign out ─────────────────────────────────────────────────────── */}
        <div className="pt-2">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-40 cursor-pointer"
            style={{
              color: "var(--ts-text-2)",
              background: "transparent",
              border: "1px solid var(--border)",
            }}
          >
            <LogOut size={14} />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </main>
  );
}
