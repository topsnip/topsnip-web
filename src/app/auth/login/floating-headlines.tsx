"use client";

const HEADLINES = [
  { text: "Claude 4 just dropped", size: "var(--text-2xl)", rotate: -2, top: "8%", left: "5%" },
  { text: "OpenAI's new reasoning model", size: "var(--text-lg)", rotate: 1.5, top: "15%", left: "55%" },
  { text: "AI agents are changing everything", size: "var(--text-xl)", rotate: -1, top: "28%", left: "10%" },
  { text: "MCP: the USB-C of AI", size: "var(--text-2xl)", rotate: 2.5, top: "35%", left: "60%" },
  { text: "Local LLMs hit GPT-4 quality", size: "var(--text-lg)", rotate: -2.5, top: "50%", left: "3%" },
  { text: "Google Gemini 2.5 Pro released", size: "var(--text-xl)", rotate: 1, top: "55%", left: "50%" },
  { text: "AI coding assistants compared", size: "var(--text-lg)", rotate: -1.5, top: "70%", left: "15%" },
  { text: "What is RAG and why it matters", size: "var(--text-2xl)", rotate: 3, top: "72%", left: "55%" },
  { text: "Cursor vs GitHub Copilot 2026", size: "var(--text-xl)", rotate: -0.5, top: "85%", left: "8%" },
  { text: "AI in healthcare: breakthrough year", size: "var(--text-lg)", rotate: 2, top: "88%", left: "48%" },
];

export function FloatingHeadlines() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none hidden sm:block"
      aria-hidden="true"
    >
      {HEADLINES.map((h, i) => (
        <span
          key={i}
          className="headline-float absolute whitespace-nowrap select-none"
          style={{
            fontFamily: "var(--font-heading), 'Instrument Serif', serif",
            fontSize: h.size,
            color: "var(--ts-text-2)",
            top: h.top,
            left: h.left,
            transform: `rotate(${h.rotate}deg)`,
            animationDelay: `${(i * 1.2) % 8}s`,
          }}
        >
          {h.text}
        </span>
      ))}
    </div>
  );
}
