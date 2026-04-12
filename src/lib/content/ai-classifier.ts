// src/lib/content/ai-classifier.ts
// Haiku-based AI relevance classifier. Decides whether a topic is a meaningful
// AI/ML/tech development worth publishing. Runs after the cheap keyword filter
// and before card generation.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5";
const CLASSIFIER_TIMEOUT_MS = 10_000;

export interface AIClassification {
  keep: boolean;
  reason: string;
  confidence: number;
}

const SYSTEM_PROMPT = `You are a strict editorial filter for TopSnip, a personal AI intelligence dashboard for a founder/engineer who builds with AI daily.

Decide whether a topic is a meaningful AI/ML/tech development worth publishing.

KEEP if the topic is about:
- AI model, tool, or API launches, updates, or capabilities (with specific news hook)
- AI research, papers, benchmarks with concrete results
- AI company moves: funding, acquisitions, partnerships, leadership changes
- AI regulation, policy, legal rulings
- AI developer tools, frameworks, infrastructure (agents, vector DBs, inference, evals)
- Substantive AI opinion/analysis from credible sources

ARCHIVE if the topic is:
- Non-English content (Hindi, Urdu, Arabic, Spanish, Chinese, etc.) — even if it mentions "AI"
- Listicle or clickbait ("Top 10 AI tools", "Best AI apps of 2026", SEO spam)
- Generic AI hype with no specific news hook or concrete development
- Religion, non-AI politics, sports, entertainment, lifestyle, fitness, fashion, food
- Crypto, trading, get-rich-quick (unless it's genuine crypto-AI infrastructure)
- "Company X added an AI feature" puff pieces with no technical or business depth
- Individual tutorials and one-person ChatGPT blog posts with no broader signal
- Engagement-farm content, low-effort summaries, content-mill reposts
- Junk that happens to mention "AI" tangentially

Default to ARCHIVE when uncertain. Better to miss a marginal story than to publish noise.

Respond with ONLY a JSON object (no markdown, no prose):
{"keep": <boolean>, "reason": "<one brief sentence>", "confidence": <0.0-1.0>}`;

export async function classifyAIRelevance(
  title: string,
  sourceSnippets: string[],
  anthropicClient: Anthropic
): Promise<AIClassification> {
  const snippetText = sourceSnippets.slice(0, 5).join("\n---\n").slice(0, 3000);
  const userPrompt = `Title: ${title}\n\nSources:\n${snippetText || "(no snippets available)"}`;

  try {
    const message = await anthropicClient.messages.create(
      {
        model: MODEL,
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: AbortSignal.timeout(CLASSIFIER_TIMEOUT_MS) }
    );

    const block = message.content[0];
    if (!block || block.type !== "text") {
      return { keep: false, reason: "classifier returned non-text response", confidence: 0 };
    }

    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { keep: false, reason: "classifier returned malformed output", confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      keep: Boolean(parsed.keep),
      reason: typeof parsed.reason === "string" ? parsed.reason : "no reason provided",
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.5,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ai-classifier] error for "${title}": ${msg}`);
    // Fail-open: if the classifier itself errors (timeout, network, rate limit),
    // trust the upstream keyword filter. Prevents one outage from killing the pipeline.
    return { keep: true, reason: `classifier unavailable, passed by keyword filter`, confidence: 0 };
  }
}
