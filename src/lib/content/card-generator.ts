// src/lib/content/card-generator.ts
// v3 card generation service — generates InShorts-style cards + learn briefs for topics using Claude.

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TopicCard, LearnBrief, CardGenerationResult } from './card-types';
import type { TopicType } from './topic-classifier';
import { buildCardSystemPrompt, buildCardUserPrompt } from './card-prompts';
import { buildIllustrationPrompt, generateIllustration } from './image-generator';
import { uploadIllustration } from '../supabase/storage';
import { checkCardQuality } from './card-quality';
import { enforceWordLimit } from '../utils/word-limit';
import { callClaudeWithRetry } from './retry';

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 2000;

interface ParsedCardResponse {
  card: TopicCard;
  learn_brief: LearnBrief;
}

/**
 * Parse Claude's JSON response into card + brief.
 * Handles raw JSON and JSON wrapped in markdown code blocks.
 * Returns null if the response is invalid or missing required fields.
 */
export function parseCardResponse(text: string): ParsedCardResponse | null {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1]!.trim() : text.trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed?.card?.headline || !parsed?.card?.summary) return null;
    if (!parsed?.learn_brief?.what_it_is) return null;

    return {
      card: {
        headline: parsed.card.headline,
        summary: enforceWordLimit(parsed.card.summary, 60),
        key_fact: parsed.card.key_fact || null,
        category_tag: parsed.card.category_tag || 'Industry',
      },
      learn_brief: parsed.learn_brief,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a v3 card + learn brief for a topic.
 * Handles Claude call, quality check, image generation, and DB write.
 */
export async function generateCard(
  supabase: SupabaseClient,
  topicId: string,
  topicSlug: string,
  topicTitle: string,
  sourceSnippets: string[],
  topicType: TopicType
): Promise<CardGenerationResult | null> {
  // 1. Generate card + learn brief via Claude
  const anthropic = new Anthropic();
  const systemPrompt = buildCardSystemPrompt();
  const userPrompt = buildCardUserPrompt(topicTitle, sourceSnippets, topicType);

  // callClaudeWithRetry expects a zero-arg function that returns a promise
  const response = await callClaudeWithRetry(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user' as const, content: userPrompt }],
    })
  );

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const parsed = parseCardResponse(text);
  if (!parsed) {
    console.error(`[card-gen] Failed to parse response for ${topicSlug}`);
    return null;
  }

  // 2. Quality check
  const quality = checkCardQuality(parsed.card, parsed.learn_brief);
  if (!quality.pass) {
    console.warn(`[card-gen] Quality check failed for ${topicSlug}:`, quality.reasons);
    return null;
  }

  // 3. Generate illustration
  const illustrationPrompt = buildIllustrationPrompt(
    topicTitle,
    parsed.learn_brief.illustration_description
  );

  let imageUrl: string | null = null;
  const imageBuffer = await generateIllustration(illustrationPrompt);
  if (imageBuffer) {
    imageUrl = await uploadIllustration(supabase, topicSlug, imageBuffer);
  }

  // 4. Write to DB
  const { error } = await supabase.from('topic_cards').upsert(
    {
      topic_id: topicId,
      headline: parsed.card.headline,
      summary: parsed.card.summary,
      key_fact: parsed.card.key_fact,
      category_tag: parsed.card.category_tag,
      image_url: imageUrl,
      learn_brief: parsed.learn_brief,
      illustration_prompt: illustrationPrompt,
      quality_score: quality.total,
    },
    { onConflict: 'topic_id' }
  );

  if (error) {
    console.error(`[card-gen] DB write failed for ${topicSlug}:`, error);
    return null;
  }

  return {
    card: parsed.card,
    learn_brief: parsed.learn_brief,
    illustration_prompt: illustrationPrompt,
    image_url: imageUrl,
    quality_score: quality.total,
  };
}
