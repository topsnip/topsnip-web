"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Code, Briefcase, Building } from "lucide-react";

/* ─── Role definitions ─────────────────────────────────────────────────── */
const ROLES = [
  {
    value: "general",
    label: "General",
    description: "I'm curious about AI and want to stay informed",
    icon: Globe,
  },
  {
    value: "developer",
    label: "Developer",
    description: "I build with AI and need to track what's changing",
    icon: Code,
  },
  {
    value: "pm",
    label: "PM",
    description: "I make product decisions involving AI",
    icon: Briefcase,
  },
  {
    value: "cto",
    label: "CTO",
    description: "I evaluate AI strategy for my organization",
    icon: Building,
  },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

/* ─── Tag type ─────────────────────────────────────────────────────────── */
interface Tag {
  slug: string;
  label: string;
}

/* ─── Animation config ─────────────────────────────────────────────────── */
const EASE = [0.16, 1, 0.3, 1] as const;

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: EASE },
  }),
};

const pillVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.3, ease: EASE },
  }),
};

/* ─── Hardcoded preview brief ──────────────────────────────────────────── */
const PREVIEW_BRIEF = {
  title: "Claude 4 Opus: What Changed and Why It Matters",
  tldr: "Anthropic released Claude 4 Opus with a 1M context window, native tool use, and improved reasoning. It outperforms GPT-4o on most benchmarks and introduces a new \"extended thinking\" mode for complex tasks.",
};

/* ─── Progress Dots ────────────────────────────────────────────────────── */
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2.5 justify-center">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i + 1 === current;
        return (
          <motion.div
            key={i}
            animate={{
              width: isActive ? 10 : 6,
              height: isActive ? 10 : 6,
              backgroundColor: isActive
                ? "var(--ts-accent)"
                : "var(--ts-muted)",
            }}
            transition={{ duration: 0.3, ease: EASE }}
            className="rounded-full"
          />
        );
      })}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  /* Advance from step 2 to step 3, saving profile along the way */
  async function handleStep2Continue() {
    if (!role) return;
    const validRoles = ROLES.map((r) => r.value);
    if (!validRoles.includes(role)) return;
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

    setSaving(false);
    submitting.current = false;
    setStep(3);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full"
        style={{
          background: "var(--ts-glow-radial)",
        }}
      />

      <div className="w-full max-w-[600px] flex flex-col gap-8 relative z-10">
        {/* Logo */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-white inline-block"
            style={{
              fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            }}
          >
            top<span style={{ color: "var(--ts-accent)" }}>snip</span>
          </Link>
        </div>

        {/* Progress dots */}
        <ProgressDots current={step} total={3} />

        {/* Step content with AnimatePresence */}
        <AnimatePresence mode="wait">
          {/* ── Step 1: Role Selection ──────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: EASE }}
              className="flex flex-col gap-8"
            >
              {/* Heading */}
              <div className="text-center flex flex-col gap-3">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
                  style={{
                    fontFamily:
                      "var(--font-heading), 'Instrument Serif', serif",
                    fontSize: "var(--text-3xl, 1.875rem)",
                  }}
                >
                  What brings you here?
                </h1>
                <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                  This helps us tailor your experience.
                </p>
              </div>

              {/* Role cards 2x2 grid */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                role="radiogroup"
                aria-label="Select your role"
              >
                {ROLES.map((r, i) => {
                  const selected = role === r.value;
                  const Icon = r.icon;
                  return (
                    <motion.button
                      key={r.value}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setRole(r.value)}
                      className="card-interactive rounded-xl p-4 flex flex-col gap-3 text-left"
                      style={{
                        background: selected
                          ? "var(--ts-accent-8)"
                          : "var(--ts-surface)",
                        border: selected
                          ? "1.5px solid var(--ts-accent-50)"
                          : "1px solid var(--border)",
                        borderRadius: "12px",
                        backdropFilter: "blur(16px)",
                        boxShadow: selected
                          ? "0 0 0 3px var(--ts-glow), inset 0 1px 0 0 rgba(255,255,255,0.04)"
                          : "inset 0 1px 0 0 rgba(255,255,255,0.02)",
                      }}
                    >
                      <Icon
                        size={48}
                        strokeWidth={1.5}
                        style={{
                          color: selected
                            ? "var(--ts-accent)"
                            : "var(--ts-muted)",
                          transition: "color 0.2s",
                        }}
                      />
                      <div className="flex flex-col gap-1">
                        <span
                          className="text-sm font-bold"
                          style={{
                            color: selected ? "white" : "var(--foreground)",
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
                    </motion.button>
                  );
                })}
              </div>

              {/* Continue button */}
              <button
                onClick={() => role && setStep(2)}
                disabled={!role}
                className="btn-primary w-full rounded-xl py-3 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  boxShadow: role ? undefined : "none",
                }}
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Interest Selection ──────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: EASE }}
              className="flex flex-col gap-8"
            >
              {/* Heading */}
              <div className="text-center flex flex-col gap-3">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
                  style={{
                    fontFamily:
                      "var(--font-heading), 'Instrument Serif', serif",
                    fontSize: "var(--text-3xl, 1.875rem)",
                  }}
                >
                  What interests you?
                </h1>
                <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                  Pick as many as you like. You can change these later.
                </p>
              </div>

              {/* Tags as animated floating pills */}
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
                <div className="flex flex-wrap gap-2.5 justify-center">
                  {tags.map((tag, i) => {
                    const selected = selectedInterests.includes(tag.slug);
                    return (
                      <motion.button
                        key={tag.slug}
                        custom={i}
                        variants={pillVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => toggleInterest(tag.slug)}
                        className="trending-pill pill-interactive rounded-full border px-4 py-2 text-sm font-medium"
                        style={{
                          background: selected
                            ? "var(--ts-accent-8)"
                            : undefined,
                          borderColor: selected
                            ? "var(--ts-accent)"
                            : undefined,
                          color: selected
                            ? "var(--ts-accent)"
                            : undefined,
                          boxShadow: selected
                            ? "0 0 12px var(--ts-glow)"
                            : undefined,
                          animationDuration: `${3 + (i % 5) * 0.5}s`,
                        }}
                      >
                        {tag.label}
                      </motion.button>
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

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary rounded-xl py-3 px-6 text-sm font-medium"
                  style={{ color: "var(--ts-text-2)" }}
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Continue}
                  disabled={saving}
                  className="btn-primary flex-1 rounded-xl py-3 text-sm"
                >
                  {saving ? "Saving..." : "Continue"}
                </button>
              </div>

              {/* Skip link */}
              <button
                onClick={handleStep2Continue}
                disabled={saving}
                className="btn-ghost text-xs text-center"
                style={{ color: "var(--ts-muted)" }}
              >
                Skip
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Instant Value Preview ──────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: EASE }}
              className="flex flex-col gap-8"
            >
              {/* Heading */}
              <div className="text-center flex flex-col gap-3">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
                  style={{
                    fontFamily:
                      "var(--font-heading), 'Instrument Serif', serif",
                    fontSize: "var(--text-3xl, 1.875rem)",
                  }}
                >
                  You&apos;re all set!
                </h1>
                <p className="text-sm" style={{ color: "var(--ts-text-2)" }}>
                  This is what your feed will look like.
                </p>
              </div>

              {/* Mini learning brief preview */}
              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
                className="rounded-xl p-6 flex flex-col gap-4"
                style={{
                  background: "var(--ts-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div className="flex flex-col gap-2">
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--ts-accent)" }}
                  >
                    Today&apos;s Top Topic
                  </span>
                  <h2
                    className="text-lg font-bold text-white leading-snug"
                    style={{
                      fontFamily:
                        "var(--font-heading), 'Instrument Serif', serif",
                    }}
                  >
                    {PREVIEW_BRIEF.title}
                  </h2>
                </div>
                <div
                  className="rounded-lg p-4"
                  style={{
                    background: "var(--ts-accent-6)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: "var(--ts-accent)" }}
                  >
                    TL;DR
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--ts-text-2)" }}
                  >
                    {PREVIEW_BRIEF.tldr}
                  </p>
                </div>
              </motion.div>

              {/* CTA button */}
              <button
                onClick={() => router.push("/feed")}
                className="btn-primary w-full rounded-xl py-3 text-sm"
              >
                Go to my feed &rarr;
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
