// Multi-dimensional quality scoring for generated content.
// Extracted from generator.ts and upgraded with 4-dimension scoring.

import Anthropic from "@anthropic-ai/sdk";
import type {
  QualityScoreBreakdown,
  TopicSourceMaterial,
  GeneratedContent,
  TopicType,
} from "./types";

const QUALITY_CHECK_MODEL = "claude-haiku-4-5";

export const MIN_QUALITY_SCORE = 60; // Raised from 40
export const MIN_DIMENSION_SCORE = 10; // Any dimension below this = auto-reject

// ── Quality check prompt ────────────────────────────────────────────────────

function sanitizeForPrompt(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildQualityCheckPromptV2(
  topicTitle: string,
  content: GeneratedContent,
  sourceItems: Array<{ title: string; contentSnippet: string }>,
  topicType?: TopicType
): string {
  const sourceSummary = sourceItems
    .map(
      (s, i) =>
        `${i + 1}. "${sanitizeForPrompt(s.title)}": ${sanitizeForPrompt(s.contentSnippet.slice(0, 200))}`
    )
    .join("\n");

  // Build content text from either contentJson or legacy fields
  const contentText = content.contentJson
    ? JSON.stringify(content.contentJson, null, 2)
    : `TL;DR: ${content.tldr}\n\nWhat Happened:\n${content.whatHappened}\n\nSo What:\n${content.soWhat}\n\nNow What:\n${content.nowWhat}`;

  return `You are a content quality auditor for TopSnip, an AI learning intelligence platform.

Score the following generated content on 4 dimensions (0-25 points each, total 0-100).

## Scoring Dimensions

### 1. Factual Grounding (0-25)
Are claims backed by the provided source material? Any hallucinations or invented details?
- 20-25: Every claim traceable to sources, no hallucinations
- 10-19: Mostly grounded, minor unsupported claims
- 0-9: Significant hallucinations or fabricated details

### 2. Actionability (0-25)
Does the reader know what to DO after reading? Are action items concrete and specific?
- 20-25: Clear, specific actions with tools/links/steps named
- 10-19: Some actionable items but vague or generic
- 0-9: No real actions, just passive observation

### 3. Format Compliance (0-25)
Does the output match the expected structure? Are all required sections present and well-formed?
${topicType ? `Expected format: ${topicType}` : "Expected format: industry_news (tldr, what_happened, so_what, now_what)"}
- 20-25: All sections present, well-structured, proper length
- 10-19: Minor structural issues, some sections thin
- 0-9: Missing sections, wrong structure, malformed

### 4. Voice Compliance (0-25)
Does it sound like TopSnip (smart, direct, slightly dry)? Or generic AI slop?

TopSnip voice rules:
- Smart but not academic. Explains complex things simply.
- Direct. Leads with the point. No throat-clearing.
- Slightly dry. A little wit, never forced humor.
- Opinionated when warranted.
- Every sentence earns its place.

BANNED phrases (automatic deductions):
- "game-changer", "revolutionary", "exciting", "groundbreaking"
- "In today's rapidly evolving landscape"
- "This groundbreaking technology"
- "In the world of..."
- "It remains to be seen" (without specifics)
- Any throat-clearing opener

Voice score should be LOW if content contains phrases like "In today's rapidly evolving landscape" or "This groundbreaking technology". These are hallmarks of generic AI output, not TopSnip's voice.

- 20-25: Distinctly TopSnip voice, zero banned phrases, direct and opinionated
- 10-19: Mostly good but some generic AI phrasing slips through
- 0-9: Reads like generic ChatGPT output, multiple banned phrases

## Content to Score

<topic>${sanitizeForPrompt(topicTitle)}</topic>

<generated_content>
${sanitizeForPrompt(contentText)}
</generated_content>

<source_material>
${sourceSummary}
</source_material>

Respond with ONLY valid JSON (no markdown fences, no explanation):
{
  "factual_grounding": <0-25>,
  "actionability": <0-25>,
  "format_compliance": <0-25>,
  "voice_compliance": <0-25>,
  "issues": ["specific issue 1", "specific issue 2"]
}`;
}

// ── Retry logic (duplicated from generator to keep quality.ts self-contained) ─

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callClaudeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 && attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(
          `Quality check rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error("callClaudeWithRetry: exhausted retries");
}

// ── Main quality check function ─────────────────────────────────────────────

export async function checkQualityV2(
  anthropic: Anthropic,
  material: TopicSourceMaterial,
  content: GeneratedContent,
  topicType?: TopicType
): Promise<QualityScoreBreakdown> {
  const prompt = buildQualityCheckPromptV2(
    material.topicTitle,
    content,
    material.items.map((i) => ({
      title: i.title,
      contentSnippet: i.contentSnippet,
    })),
    topicType
  );

  try {
    const message = await callClaudeWithRetry(() =>
      anthropic.messages.create(
        {
          model: QUALITY_CHECK_MODEL,
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        },
        { signal: AbortSignal.timeout(30_000) }
      )
    );

    const text = message.content[0];
    if (text.type !== "text") {
      return defaultBreakdown("Unexpected response type from quality check model");
    }

    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return defaultBreakdown("Could not parse quality check JSON response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const factualGrounding = clampScore(parsed.factual_grounding);
    const actionability = clampScore(parsed.actionability);
    const formatCompliance = clampScore(parsed.format_compliance);
    const voiceCompliance = clampScore(parsed.voice_compliance);
    const total = factualGrounding + actionability + formatCompliance + voiceCompliance;
    const issues = Array.isArray(parsed.issues) ? parsed.issues.filter((i: unknown) => typeof i === "string") : [];

    return {
      factualGrounding,
      actionability,
      formatCompliance,
      voiceCompliance,
      total,
      issues,
    };
  } catch (err) {
    // Quality check is non-critical — don't block generation
    console.warn(
      `Quality check failed for topic ${material.topicId}: ${err instanceof Error ? err.message : String(err)}`
    );
    return defaultBreakdown("Quality check failed — defaulting to zero");
  }
}

// ── Acceptance check ────────────────────────────────────────────────────────

export function isQualityAcceptable(score: QualityScoreBreakdown): boolean {
  return (
    score.total >= MIN_QUALITY_SCORE &&
    score.factualGrounding >= MIN_DIMENSION_SCORE &&
    score.actionability >= MIN_DIMENSION_SCORE &&
    score.formatCompliance >= MIN_DIMENSION_SCORE &&
    score.voiceCompliance >= MIN_DIMENSION_SCORE
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clampScore(val: unknown): number {
  if (typeof val !== "number" || isNaN(val)) return 0;
  return Math.max(0, Math.min(25, Math.round(val)));
}

function defaultBreakdown(issue: string): QualityScoreBreakdown {
  return {
    factualGrounding: 0,
    actionability: 0,
    formatCompliance: 0,
    voiceCompliance: 0,
    total: 0,
    issues: [issue],
  };
}
