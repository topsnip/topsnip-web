// src/lib/content/card-quality.ts
import type { TopicCard, LearnBrief } from './card-types';

export const BANNED_PHRASES = [
  'game-changer', 'revolutionary', 'exciting', 'groundbreaking',
  'significant milestone', 'rapidly evolving landscape',
  'it remains to be seen', 'in the world of',
];

const MIN_SCORE = 50;
const MIN_DIMENSION = 8;

export interface CardQualityScore {
  factual: number;
  voice: number;
  completeness: number;
  brevity: number;
  total: number;
  pass: boolean;
  reasons: string[];
}

export function checkCardQuality(
  card: TopicCard,
  brief: LearnBrief
): CardQualityScore {
  const reasons: string[] = [];

  // Voice check (0-25)
  let voice = 25;
  const allText = `${card.summary} ${card.headline} ${brief.what_it_is} ${brief.why_it_matters}`.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (allText.includes(phrase)) {
      voice -= 8;
      reasons.push(`Banned phrase: "${phrase}"`);
    }
  }
  voice = Math.max(0, voice);

  // Brevity check (0-25)
  let brevity = 25;
  const wordCount = card.summary.split(/\s+/).filter(Boolean).length;
  if (wordCount > 60) {
    brevity -= Math.min(25, (wordCount - 60) * 2);
    reasons.push(`Summary too long: ${wordCount} words (max 60)`);
  }
  const headlineWords = card.headline.split(/\s+/).filter(Boolean).length;
  if (headlineWords > 15) {
    brevity -= 5;
    reasons.push(`Headline too long: ${headlineWords} words (max 15)`);
  }
  brevity = Math.max(0, brevity);

  // Completeness check (0-25)
  let completeness = 25;
  if (!card.headline) { completeness -= 8; reasons.push('Missing headline'); }
  if (!card.summary) { completeness -= 8; reasons.push('Missing summary'); }
  if (!card.category_tag) { completeness -= 3; reasons.push('Missing category_tag'); }
  if (!brief.what_it_is) { completeness -= 5; reasons.push('Missing what_it_is'); }
  if (!brief.why_it_matters) { completeness -= 5; reasons.push('Missing why_it_matters'); }
  if (!brief.key_details?.length) { completeness -= 4; reasons.push('Missing key_details'); }
  if (!brief.illustration_description) { completeness -= 3; reasons.push('Missing illustration_description'); }
  if (!brief.sources?.length) { completeness -= 3; reasons.push('Missing sources'); }
  completeness = Math.max(0, completeness);

  // Factual check (0-25) — basic heuristic
  let factual = 20;
  if (!brief.sources?.length) {
    factual -= 10;
    reasons.push('No sources cited');
  }

  const total = factual + voice + completeness + brevity;
  const dimensionPass = [factual, voice, completeness, brevity].every(d => d >= MIN_DIMENSION);
  const pass = total >= MIN_SCORE && dimensionPass;

  return { factual, voice, completeness, brevity, total, pass, reasons };
}
