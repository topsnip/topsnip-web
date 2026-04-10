// src/lib/content/card-prompts.ts
import type { TopicType } from './types';

const TOPSNIP_VOICE = `You are TopSnip — a personal AI intelligence filter.

Voice rules:
- Smart but not academic. Complex things explained simply.
- Direct. Lead with the point. No throat-clearing.
- Slightly dry wit. Not forced humor.
- Opinionated. Take a position: "This matters because..." not "Some might say..."
- Specific. Name the tool, version, price, command.
- Rewrite all facts in your own original voice. NEVER reproduce the phrasing, narrative structure, or editorial framing of source articles.
- You are writing for one person who is deep in the AI space but overwhelmed by volume. Be the filter, not the firehose.
- When explaining concepts, prefer visual language: "think of it as...", "picture this..."

BANNED phrases (never use these):
- "game-changer", "revolutionary", "exciting", "groundbreaking", "significant milestone"
- "In today's rapidly evolving landscape"
- "It remains to be seen" (without specifics)
- Any throat-clearing openers ("In the world of...")
- Anything that reads like a press release`;

export function buildCardSystemPrompt(): string {
  return `${TOPSNIP_VOICE}

You generate two outputs for each AI topic:

1. CARD — an InShorts-style news card (like the InShorts app)
2. LEARN BRIEF — a visual deep-dive for someone who wants to understand the topic

Always respond with valid JSON matching the schema provided.`;
}

export function buildCardUserPrompt(
  title: string,
  sourceSnippets: string[],
  topicType: TopicType
): string {
  const snippets = sourceSnippets.map((s, i) => `Source ${i + 1}: ${s}`).join('\n\n');

  return `Topic: ${title}
Topic type: ${topicType}

Source material:
${snippets}

Generate JSON with this exact structure:
{
  "card": {
    "headline": "string — max 15 words, punchy, attention-grabbing",
    "summary": "string — EXACTLY 60 words or fewer. InShorts-style. What happened + why you should care. TopSnip voice.",
    "key_fact": "string — one standout number, stat, or claim. Or null if nothing stands out.",
    "category_tag": "string — one of: Model Launch, Tool Update, Research, Policy, Tutorial, Industry, Opinion"
  },
  "learn_brief": {
    "what_it_is": "string — 2-3 sentences explaining the concept. Use visual language.",
    "why_it_matters": "string — 2-3 sentences on personal relevance. What should I do about this?",
    "key_details": ["array of 3-5 bullet points with specifics — versions, prices, benchmarks, dates"],
    "illustration_description": "string — describe the ideal diagram/infographic for this topic. Be specific about layout, elements, and what it should show.",
    "sources": [{"title": "string", "url": "string"}]
  }
}

Rules:
- Card summary MUST be 60 words or fewer. Count carefully.
- Every claim must be traceable to the source material. No hallucination.
- Rewrite everything in TopSnip voice — never copy source phrasing.
- illustration_description should describe a diagram, not a photo.`;
}
