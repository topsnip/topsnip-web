// Prompt templates for content generation (Step 4)
// Each role gets structurally different output — not just different words.

import type { Role, ContentType } from "./types";

// [H4 fix] Defense-in-depth: strip XML-like tags from source content
// before embedding in prompt XML structure, preventing tag injection.
function sanitizeForPrompt(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── System prompts per role ───────────────────────────────────────────────

const SYSTEM_BASE = `You are TopSnip's content engine. You turn raw source material about AI developments into clear, accurate learning content.

Rules:
- Only state facts that appear in the source material. Never hallucinate.
- Cite specific products, versions, numbers, and dates from the sources.
- Write like a knowledgeable friend, not a corporate AI.
- Be direct. No filler, no "in today's rapidly evolving landscape" nonsense.
- If the source material is thin, say less — don't pad.`;

const ROLE_INSTRUCTIONS: Record<Role, string> = {
  general: `You are writing for a curious non-technical person who wants to understand AI developments without jargon.

- Explain technical concepts using everyday analogies
- Focus on "why should I care?" and real-world impact
- Avoid acronyms unless you define them first
- Use concrete examples anyone can relate to (apps they use, tasks they do)
- The "Now What?" section should suggest things a non-technical person can actually do`,

  developer: `You are writing for a software developer who builds with AI tools and APIs.

- Include specific technical details: API names, model versions, parameter changes
- Show code-relevant implications: what breaks, what's new, migration paths
- The "So What?" section should cover: impact on existing codebases, new capabilities unlocked
- The "Now What?" section should include concrete actions: "try this API", "update this dependency", "prototype this pattern"
- Use technical language freely — they know what embeddings, fine-tuning, and inference mean`,

  pm: `You are writing for a product manager who needs to understand AI for product decisions.

- Frame everything in product terms: features, user value, competitive positioning
- The "So What?" section should cover: product implications, feature opportunities, competitive moves
- The "Now What?" section should include sprint-actionable items: "evaluate for roadmap", "test with users", "brief engineering on..."
- Include comparisons to existing products/features users already know
- Focus on what's now possible that wasn't before, from a product perspective`,

  cto: `You are writing for a CTO or engineering leader making strategic technical decisions.

- Frame in terms of architecture, cost, team capability, and strategic positioning
- The "So What?" section should cover: build-vs-buy implications, infrastructure impact, hiring needs
- The "Now What?" section should include: evaluation criteria, risk assessment, timeline considerations
- Include cost implications where relevant (API pricing, compute requirements, team ramp-up)
- Address "should we adopt this?" not just "what is this?"`,
};

// ── Prompt builders ───────────────────────────────────────────────────────

export function buildExplainerSystemPrompt(role: Role): string {
  return `${SYSTEM_BASE}\n\n${ROLE_INSTRUCTIONS[role]}`;
}

export function buildExplainerUserPrompt(
  topicTitle: string,
  sourceItems: Array<{ title: string; url: string; contentSnippet: string; platform: string }>
): string {
  // [H4 fix] Sanitize source content to prevent XML tag injection
  const sourcesText = sourceItems
    .map(
      (item, i) =>
        `=== Source ${i + 1} [${sanitizeForPrompt(item.platform)}]: "${sanitizeForPrompt(item.title)}" ===\nURL: ${item.url}\n${sanitizeForPrompt(item.contentSnippet)}`
    )
    .join("\n\n");

  return `<topic>${sanitizeForPrompt(topicTitle)}</topic>

<source_material>
${sourcesText}
</source_material>

Generate a learning brief about this topic. Your response must be valid JSON matching this exact schema:

{
  "tldr": "2-3 sentence plain-language summary of what happened. Under 80 words.",
  "what_happened": "3-5 paragraphs explaining the development clearly. Use markdown formatting. Include specific details from the sources.",
  "so_what": "2-3 paragraphs explaining why this matters. Tailor to the reader's perspective.",
  "now_what": "2-4 bullet points of concrete actions the reader can take. Each bullet should be actionable, not vague.",
  "sources": [{"title": "...", "url": "...", "platform": "..."}]
}`;
}

export function buildTldrSystemPrompt(): string {
  return `${SYSTEM_BASE}

You write ultra-concise TL;DR summaries for feed cards. One to two sentences max. No jargon. The reader should understand the significance in under 5 seconds.`;
}

export function buildTldrUserPrompt(
  topicTitle: string,
  whatHappened: string
): string {
  return `<topic>${sanitizeForPrompt(topicTitle)}</topic>

<context>
${sanitizeForPrompt(whatHappened)}
</context>

Write a 1-2 sentence TL;DR for a feed card. Plain text, no markdown. Under 40 words.
Respond with just the TL;DR text, nothing else.`;
}

export function buildWhatChangedSystemPrompt(role: Role): string {
  return `${SYSTEM_BASE}\n\n${ROLE_INSTRUCTIONS[role]}

You write "What changed since last time" updates for returning users who already read about this topic. Focus only on what's new — don't repeat background they already know.`;
}

export function buildWhatChangedUserPrompt(
  topicTitle: string,
  previousContent: string,
  newSourceItems: Array<{ title: string; url: string; contentSnippet: string; platform: string }>
): string {
  const newSourcesText = newSourceItems
    .map(
      (item, i) =>
        `=== New Source ${i + 1} [${sanitizeForPrompt(item.platform)}]: "${sanitizeForPrompt(item.title)}" ===\nURL: ${item.url}\n${sanitizeForPrompt(item.contentSnippet)}`
    )
    .join("\n\n");

  return `<topic>${sanitizeForPrompt(topicTitle)}</topic>

<previous_content>
${sanitizeForPrompt(previousContent)}
</previous_content>

<new_source_material>
${newSourcesText}
</new_source_material>

Write a brief update focusing only on what's changed. Your response must be valid JSON:

{
  "changelog": "1-2 paragraphs describing what's new since the last update. Markdown formatting OK.",
  "updated_tldr": "Updated 2-3 sentence TL;DR reflecting the new information. Under 80 words.",
  "updated_so_what": "Updated perspective on why this matters, incorporating new developments.",
  "updated_now_what": "Updated action items reflecting what's new."
}`;
}

// ── YouTube recommendation prompt ─────────────────────────────────────────

export function buildYouTubeRecPrompt(
  topicTitle: string,
  videos: Array<{ title: string; channelName: string; videoId: string }>
): string {
  const videoList = videos
    .map((v, i) => `${i + 1}. "${sanitizeForPrompt(v.title)}" by ${sanitizeForPrompt(v.channelName)} (${v.videoId})`)
    .join("\n");

  return `<topic>${sanitizeForPrompt(topicTitle)}</topic>

<candidate_videos>
${videoList}
</candidate_videos>

Pick the 2-3 best videos for someone who wants to go deeper on this topic. For each, explain in one sentence WHY this video is worth watching.

Respond with valid JSON:
{
  "recommendations": [
    {"videoId": "...", "reason": "One sentence explaining why this video is worth watching."}
  ]
}`;
}

// ── Quality scoring prompt ────────────────────────────────────────────────

export function buildQualityCheckPrompt(
  topicTitle: string,
  content: { tldr: string; whatHappened: string; soWhat: string; nowWhat: string },
  sourceItems: Array<{ title: string; contentSnippet: string }>
): string {
  const sourceSummary = sourceItems
    .map((s, i) => `${i + 1}. "${sanitizeForPrompt(s.title)}": ${sanitizeForPrompt(s.contentSnippet.slice(0, 200))}`)
    .join("\n");

  return `Rate this generated content for quality. Check for:
1. Factual accuracy — does the content match the sources?
2. Hallucination — does it claim anything NOT in the sources?
3. Completeness — does it cover the key points?
4. Actionability — are the "Now What" items concrete?
5. Clarity — is it easy to understand?

<topic>${sanitizeForPrompt(topicTitle)}</topic>

<generated_content>
TL;DR: ${sanitizeForPrompt(content.tldr)}

What Happened:
${sanitizeForPrompt(content.whatHappened)}

So What:
${sanitizeForPrompt(content.soWhat)}

Now What:
${sanitizeForPrompt(content.nowWhat)}
</generated_content>

<source_material>
${sourceSummary}
</source_material>

Respond with valid JSON:
{
  "score": <number 0-100>,
  "issues": ["list of specific issues found, or empty array if none"]
}`;
}
