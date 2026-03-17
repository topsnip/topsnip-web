"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/* ─── Role definitions ─────────────────────────────────────────────────── */
const ROLES = [
  {
    value: "general",
    label: "General",
    description: "Keeping up with AI trends and developments",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
  {
    value: "developer",
    label: "Developer",
    description: "Building with AI tools, models, and APIs",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    value: "pm",
    label: "Product Manager",
    description: "Evaluating AI for product strategy and roadmaps",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    value: "cto",
    label: "CTO / Tech Lead",
    description: "Making infrastructure and adoption decisions",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

/* ─── Tag type ─────────────────────────────────────────────────────────── */
interface Tag {
  slug: string;
  label: string;
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<RoleValue | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTags, setLoadingTags] = useState(true);

  /* Auth gate on mount */
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) {
        router.push("/auth/login?redirect=/onboarding");
      }
    }
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fetch tags on mount */
  useEffect(() => {
    async function fetchTags() {
      const { data, error } = await getSupabase()
        .from("tags")
        .select("slug, label")
        .order("label");

      if (error) {
        console.error("Failed to fetch tags:", error);
        setLoadingTags(false);
        return;
      }

      setTags(data ?? []);
      setLoadingTags(false);
    }

    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Toggle interest */
  function toggleInterest(slug: string) {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  /* Save and redirect */
  const submitting = useRef(false);
  async function handleFinish() {
    if (!role) return;
    // [H1 fix] Validate role value
    const validRoles = ROLES.map((r) => r.value);
    if (!validRoles.includes(role)) return;
    // [H3 fix] Prevent double-submit
    if (submitting.current) return;
    submitting.current = true;

    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await getSupabase().auth.getUser();

    if (!user) {
      setError("You need to be signed in. Redirecting...");
      setTimeout(() => router.push("/auth/login?redirect=/onboarding"), 1500);
      return;
    }

    const { error: updateError } = await getSupabase()
      .from("profiles")
      .update({
        role,
        interests: selectedInterests,
        onboarding_complete: true,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Something went wrong. Try again.");
      setSaving(false);
      submitting.current = false;
      return;
    }

    router.push("/feed");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full"
        style={{
          background:
            "var(--ts-glow-radial)",
        }}
      />

      <div className="w-full max-w-lg flex flex-col gap-8 relative z-10">
        {/* Header */}
        <div className="text-center flex flex-col gap-3">
          <Link
            href="/feed"
            className="text-xl font-extrabold tracking-tight text-white mx-auto"
            style={{
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </Link>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
            style={{
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            {step === 1 ? "What describes you best?" : "What are you into?"}
          </h1>
          <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
            {step === 1
              ? "This shapes how we explain things to you."
              : "Pick topics you care about. You can change these later."}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center">
          <div
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: "3rem",
              background: "var(--ts-accent)",
            }}
          />
          <div
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: "3rem",
              background: step === 2 ? "var(--ts-accent)" : "var(--border)",
            }}
          />
        </div>

        {/* ── Step 1: Role Selection ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              role="radiogroup"
              aria-label="Select your role"
            >
              {ROLES.map((r) => {
                const selected = role === r.value;
                return (
                  <button
                    key={r.value}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRole(r.value)}
                    className="rounded-xl p-4 flex flex-col gap-3 text-left transition-all duration-200 cursor-pointer"
                    style={{
                      background: selected
                        ? "var(--ts-accent-8)"
                        : "var(--ts-surface)",
                      border: selected
                        ? "1.5px solid var(--ts-accent-50)"
                        : "1px solid var(--border)",
                      backdropFilter: "blur(16px)",
                      boxShadow: selected
                        ? "0 0 0 3px var(--ts-glow), inset 0 1px 0 0 rgba(255,255,255,0.04)"
                        : "inset 0 1px 0 0 rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: selected
                          ? "var(--ts-glow)"
                          : "var(--ts-accent-6)",
                        color: selected
                          ? "var(--ts-accent)"
                          : "var(--ts-muted)",
                        transition: "background 0.2s, color 0.2s",
                      }}
                    >
                      {r.icon}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: selected ? "white" : "var(--foreground)",
                          fontFamily:
                            "var(--font-heading), 'Instrument Serif', serif",
                        }}
                      >
                        {r.label}
                      </span>
                      <span
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--ts-text-2)" }}
                      >
                        {r.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => role && setStep(2)}
              disabled={!role}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] cursor-pointer mt-2"
              style={{
                background:
                  "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                boxShadow: role ? "0 0 24px var(--ts-accent-30)" : "none",
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2: Interest Selection ──────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            {loadingTags ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{
                    borderColor: "var(--ts-accent)",
                    borderTopColor: "transparent",
                  }}
                />
              </div>
            ) : tags.length === 0 ? (
              <p
                className="text-sm text-center py-4"
                style={{ color: "var(--ts-text-2)" }}
              >
                No topics found. You can skip this step.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {tags.map((tag) => {
                  const selected = selectedInterests.includes(tag.slug);
                  return (
                    <button
                      key={tag.slug}
                      onClick={() => toggleInterest(tag.slug)}
                      className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95"
                      style={{
                        background: selected
                          ? "var(--ts-glow)"
                          : "var(--ts-surface)",
                        border: selected
                          ? "1px solid var(--ts-accent-50)"
                          : "1px solid var(--border)",
                        color: selected
                          ? "var(--ts-accent-2)"
                          : "var(--ts-text-2)",
                        backdropFilter: "blur(8px)",
                        boxShadow: selected
                          ? "0 0 12px var(--ts-glow)"
                          : "none",
                      }}
                    >
                      {selected && (
                        <span className="mr-1.5">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ display: "inline", verticalAlign: "-1px" }}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedInterests.length > 0 && (
              <p
                className="text-xs text-center"
                style={{ color: "var(--ts-muted)" }}
              >
                {selectedInterests.length} topic
                {selectedInterests.length !== 1 ? "s" : ""} selected
              </p>
            )}

            {error && (
              <p
                className="text-xs text-center"
                style={{ color: "var(--error)" }}
              >
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl py-3 px-6 text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
                style={{
                  color: "var(--ts-text-2)",
                  background: "transparent",
                  border: "1px solid var(--border)",
                }}
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 hover:opacity-90 active:scale-[0.98] cursor-pointer"
                style={{
                  background:
                    "linear-gradient(135deg, var(--ts-accent), var(--ts-accent-2))",
                  boxShadow: "0 0 24px var(--ts-accent-30)",
                }}
              >
                {saving ? "Saving..." : "Get Started"}
              </button>
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="text-xs text-center transition-colors hover:text-white cursor-pointer"
              style={{
                color: "var(--ts-muted)",
                background: "none",
                border: "none",
              }}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
