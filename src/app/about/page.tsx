import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "About — TopSnip",
  description:
    "TopSnip is an AI learning platform that monitors 7+ sources and turns raw information into clear, structured explainers you can understand in 3 minutes.",
  openGraph: {
    title: "About — TopSnip",
    description:
      "TopSnip is an AI learning platform that monitors 7+ sources and turns raw information into clear, structured explainers you can understand in 3 minutes.",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 py-16">
      {/* ── Floating Nav ─────────────── */}
      <SiteNav user={null} />

      <div className="max-w-3xl mx-auto flex flex-col gap-12 pt-16">
        {/* Hero */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            What is TopSnip?
          </h1>
          <p
            className="text-base leading-[1.8]"
            style={{ color: "var(--ts-text-2)" }}
          >
            You know the feeling. Something big happens in AI — a new model
            drops, an API changes, a framework gets released. You see the
            headline, but you don&apos;t really understand it. So you open 10
            tabs: blog posts, Reddit threads, YouTube videos, Hacker News
            discussions.
          </p>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--ts-text-2)" }}
          >
            An hour later, you&apos;ve read a lot of words but still can&apos;t
            explain it to someone else.
          </p>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--ts-text-2)" }}
          >
            <strong className="text-white">TopSnip fixes that.</strong> We
            monitor AI developments across official blogs, Hacker News, Reddit,
            arXiv, GitHub, and YouTube — then turn raw source material into
            clear, structured learning briefs you can actually understand.
          </p>
        </div>

        {/* How it works */}
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold text-white">How it works</h2>
          <div className="flex flex-col gap-4">
            {[
              {
                step: "01",
                title: "We monitor everything",
                desc: "6 platforms tracked continuously: official AI blogs, Hacker News, Reddit, arXiv papers, GitHub releases, and YouTube.",
              },
              {
                step: "02",
                title: "We detect what matters",
                desc: "Cross-platform scoring identifies what's actually significant vs. noise. A topic trending on 2+ platforms = worth covering.",
              },
              {
                step: "03",
                title: "AI generates learning briefs",
                desc: "Each topic gets a structured explainer: what happened, why it matters, and what to do next — grounded in source material, never hallucinated.",
              },
              {
                step: "04",
                title: "You understand it",
                desc: "Read the brief, check the sources, watch the recommended videos if you want to go deeper. 3 minutes, not 3 hours.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="glass-card flex gap-4 rounded-xl p-4">
                <span
                  className="text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ color: "var(--ts-accent)" }}
                >
                  {step}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p
                    className="text-base leading-relaxed"
                    style={{ color: "var(--ts-text-2)" }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pro tier */}
        <div
          className="rounded-xl border p-5 flex flex-col gap-3"
          style={{
            background: "var(--ts-surface)",
            borderColor: "var(--ts-accent-30)",
            backdropFilter: "blur(12px)",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--ts-accent)" }}
          >
            Free vs. Pro
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--ts-text-2)" }}
          >
            Everyone gets plain-language explainers, trending topics, and
            YouTube recommendations for free.{" "}
            <strong className="text-white">Pro</strong> adds role-specific depth
            — if you&apos;re a developer, you get code examples and migration
            paths. If you&apos;re a PM, you get product implications and sprint
            actions. Plus personalized feeds and knowledge tracking.
          </p>
        </div>

        {/* How our content works */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white">
            How our content works
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--ts-text-2)" }}
          >
            Every learning brief on TopSnip is generated by AI, grounded in real
            source material from the platforms we monitor. Here&apos;s what that
            means:
          </p>
          <ul className="flex flex-col gap-3">
            {[
              {
                title: "Source-grounded, not hallucinated",
                desc: "We pull from real articles, papers, discussions, and videos. The AI synthesizes — it doesn't invent.",
              },
              {
                title: "Transparent sourcing",
                desc: "Every brief links back to its original sources so you can verify and go deeper.",
              },
              {
                title: "AI-generated summaries",
                desc: "The explainers, TL;DRs, and role-specific sections are written by AI (Claude). We don't pretend otherwise.",
              },
              {
                title: "Always verify critical decisions",
                desc: "Our briefs are a starting point for understanding, not a replacement for due diligence on decisions that matter.",
              },
            ].map(({ title, desc }) => (
              <li key={title} className="flex gap-3">
                <span
                  className="text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ color: "var(--ts-accent)" }}
                >
                  &bull;
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p
                    className="text-base leading-relaxed"
                    style={{ color: "var(--ts-text-2)" }}
                  >
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-start gap-3">
          <Link
            href="/"
            className="btn-primary flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
          >
            Try it now →
          </Link>
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            3 free searches per day. No account required.
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
