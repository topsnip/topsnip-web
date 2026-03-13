import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-12">
        {/* Wordmark */}
        <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
          top<span style={{ color: "var(--ts-accent)" }}>snip</span>
        </Link>

        {/* Hero */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            What is Topsnip?
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
            You know the feeling. You want to learn something — maybe how to build an
            AI agent in n8n, or which automation tool to use. So you open YouTube and
            find 10 videos on the topic. Each one is 20–30 minutes. Each one starts with
            an intro, a channel plug, and 5 minutes of context you already know.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
            You end up with 10 browser tabs and still don&apos;t have the answer.
          </p>
          <p className="text-base leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
            <strong className="text-white">Topsnip fixes that.</strong> Type a topic.
            We watch the best YouTube videos on it, strip the noise, and give you one
            clean, structured summary — the signal, without the filler.
          </p>
        </div>

        {/* How it works */}
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold text-white">How it works</h2>
          <div className="flex flex-col gap-4">
            {[
              {
                step: "01",
                title: "You type a topic",
                desc: "Any AI or automation topic — n8n workflows, Claude Code, LangChain basics, Cursor tips, Make vs Zapier.",
              },
              {
                step: "02",
                title: "We find the best videos",
                desc: "Topsnip searches YouTube and identifies the 8 most relevant videos for your query.",
              },
              {
                step: "03",
                title: "We read all of them",
                desc: "Every transcript is fetched and fed into Claude — our AI synthesis engine. It reads all 8 videos simultaneously.",
              },
              {
                step: "04",
                title: "You get the signal",
                desc: "A structured summary: TL;DR, key points, concepts, and sources — so you can verify everything.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="flex gap-4 rounded-xl border p-4"
                style={{ background: "var(--ts-surface)", borderColor: "var(--border)" }}
              >
                <span
                  className="text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ color: "var(--ts-accent)" }}
                >
                  {step}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Niche */}
        <div
          className="rounded-xl border p-5 flex flex-col gap-3"
          style={{ background: "var(--ts-surface)", borderColor: "rgba(124,106,247,0.3)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--ts-accent)" }}>
            Currently: AI & automation only
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ts-text-2)" }}>
            Topsnip is starting with AI and automation tools — n8n, Make, Zapier, Claude,
            LangChain, Cursor, and more. We&apos;re going deep on one niche before expanding.
            More topics are coming.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-start gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "var(--ts-accent)" }}
          >
            Try it now →
          </Link>
          <p className="text-xs" style={{ color: "var(--ts-muted)" }}>
            3 free searches. No account required.
          </p>
        </div>
      </div>
    </main>
  );
}
