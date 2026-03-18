// Prompt templates for content generation (Step 4)
// Each role gets structurally different output — not just different words.

import type { Role } from "./types";

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
- If the source material is thin, say less — don't pad.

Formatting rules:
- Use **bold** for key terms, product names, and important numbers on first mention.
- Use bullet points (- ) for any list of 3+ items. Never write lists as comma-separated paragraphs.
- Keep paragraphs short: 2-4 sentences max. White space is your friend.
- In "what_happened": if describing a sequence of events, use numbered steps. If describing a change, use a Before/After comparison.
- In "so_what": lead each paragraph with a bold one-line takeaway, then explain.
- In "now_what": each bullet must start with an action verb (Try, Update, Evaluate, Read, Test, Check).
- Never use filler transitions like "Furthermore," "Additionally," "It's worth noting that." Just state the next point.`;

const ROLE_INSTRUCTIONS: Record<Role, string> = {
  general: `You are writing for someone who has never worked in tech. Think: explaining to your mom, your barber, or your neighbor. They're smart people — they just don't know what an API is.

- Explain EVERY technical concept with a simple analogy or comparison to something physical/everyday. Example: "A language model is like autocomplete on your phone, but for entire paragraphs."
- Define every acronym on first use. If a concept needs more than one sentence to explain, add a "Think of it like..." aside.
- Focus on "how does this affect my daily life?" — connect to apps they already use (Google, Netflix, their phone's camera, Siri/Alexa).
- Include at least one concrete real-life example per section: "For example, if you use Google Photos, this means..."
- Use short paragraphs (2-3 sentences max). Use **bold** for key terms when first introduced.
- In "what_happened": structure as clear steps when describing a process (Step 1, Step 2...) or use a simple Before/After when describing a change.
- The "Now What?" bullets should be things a non-tech person can literally do today — not "evaluate the API" but "Open Settings > Privacy on your iPhone."
- NEVER assume the reader knows what machine learning, neural networks, tokens, fine-tuning, or inference mean.`,

  developer: `You are writing for a software developer who builds with AI tools and APIs.

- Include specific technical details: API names, model versions, parameter changes, pricing changes.
- Format all code-related information as bullet points, not paragraphs. Example:
  - **New endpoint:** \`POST /v2/embeddings\`
  - **Breaking change:** \`max_tokens\` renamed to \`max_completion_tokens\`
  - **Migration:** Replace \`model="gpt-4"\` with \`model="gpt-4-turbo"\`
- When listing multiple changes, capabilities, or specs, ALWAYS use bullet points.
- The "So What?" section should cover: impact on existing codebases, new capabilities unlocked, performance/cost changes.
- The "Now What?" section should be a concrete checklist:
  - "Try this API: [specific endpoint]"
  - "Update this dependency: [package@version]"
  - "Prototype this pattern: [specific pattern]"
- Use technical language freely — they know what embeddings, fine-tuning, and inference mean.
- Include version numbers, dates, and pricing where available.`,

  pm: `You are writing for a product manager who needs to understand AI for product decisions.

- Frame everything in product terms: features, user value, competitive positioning.
- When describing features/capabilities, use a Before vs After format:
  **Before:** Users had to manually...
  **After:** The new feature automatically...
- Structure competitive implications as bullet points with specific company/product names.
- The "So What?" section should cover: product implications, feature opportunities, competitive moves.
- The "Now What?" section should be sprint-actionable tasks:
  - "**Evaluate:** Test [product] against current [feature]"
  - "**Brief:** Share [finding] with engineering"
  - "**Roadmap:** Consider adding [feature] to Q[X] planning"
- Include comparisons to existing products/features users already know.
- Focus on what's now possible that wasn't before.`,

  cto: `You are writing for a CTO or engineering leader making strategic technical decisions.

- Frame in terms of architecture, cost, team capability, and strategic positioning.
- Use structured formats for decision-relevant information:
  **Build cost:** [estimate] | **Buy cost:** [estimate] | **Timeline:** [estimate]
- The "So What?" section should cover: build-vs-buy implications, infrastructure impact, hiring needs.
- The "Now What?" section should be a prioritized action list:
  - **P0:** [immediate action]
  - **P1:** [this sprint]
  - **P2:** [this quarter]
- Include risk assessment where relevant:
  - **High risk:** [risk + mitigation]
  - **Low risk:** [risk]
- Include cost implications: API pricing, compute requirements, team ramp-up time.
- Address "should we adopt this?" not just "what is this?"`,
};

// ── Prompt builders ───────────────────────────────────────────────────────

export function buildExplainerSystemPrompt(role: Role): string {
  return `${SYSTEM_BASE}\n\n${ROLE_INSTRUCTIONS[role]}`;
}

// ── On-demand prompts (for search — no ingested source material) ──────────
// These use Claude's own knowledge rather than requiring source material.

const ON_DEMAND_BASE = `You are TopSnip's AI learning engine. A user searched for a topic and you need to write a structured learning brief using your training knowledge.

Rules:
- Use your knowledge to explain the topic thoroughly and accurately.
- Be factual and specific — name real tools, versions, companies, dates, and concrete examples.
- If you don't know enough about a topic, say so briefly rather than padding with generalities.
- If something is uncertain or rapidly changing, acknowledge it and move on.
- Write like a knowledgeable friend, not a corporate AI.
- Be direct. No filler, no "in today's rapidly evolving landscape" nonsense.
- Never refuse to answer. You always have useful knowledge to share — provide the best explanation you can.
- This is a learning brief, not a chatbot response. Structure and substance matter.`;

export function buildOnDemandSystemPrompt(role: Role): string {
  return `${ON_DEMAND_BASE}\n\n${ROLE_INSTRUCTIONS[role]}`;
}

export function buildOnDemandUserPrompt(query: string): string {
  return `A user searched for: <topic>${sanitizeForPrompt(query)}</topic>

Write a structured learning brief about this topic using your knowledge. Your response must be valid JSON matching this exact schema:

{
  "tldr": "2-3 sentence plain-language summary. Under 80 words.",
  "what_happened": "3-5 paragraphs explaining this topic clearly. Use markdown formatting (**bold** for emphasis). Include specific details — real tool names, versions, companies, concrete examples.",
  "so_what": "2-3 paragraphs explaining why this matters. Tailor to the reader's perspective.",
  "now_what": "2-4 bullet points (start each with -) of concrete actions the reader can take. Each should be actionable, not vague.",
  "sources": []
}

Important: the "sources" array should be empty since this is generated from knowledge, not specific articles. Do not include placeholder or made-up URLs.`;
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

RELEVANCE FILTER: Only use information from sources that is DIRECTLY about "${sanitizeForPrompt(topicTitle)}". If a source mentions this topic only in passing or is primarily about something else, IGNORE that source entirely. Do not include tangential information.

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
