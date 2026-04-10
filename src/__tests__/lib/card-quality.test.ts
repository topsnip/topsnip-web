import { describe, it, expect } from 'vitest';
import { checkCardQuality } from '@/lib/content/card-quality';
import type { TopicCard, LearnBrief } from '@/lib/content/card-types';

const validCard: TopicCard = {
  headline: 'Claude 4.5 Ships with Extended Thinking',
  summary: 'Anthropic released Claude 4.5 today with extended thinking capabilities. The model scores 15% higher on coding benchmarks. Available now on API at same pricing. Worth switching if you use Claude for code.',
  key_fact: '15% improvement on SWE-bench',
  category_tag: 'Model Launch',
};

const validBrief: LearnBrief = {
  what_it_is: 'Claude 4.5 is the latest model from Anthropic with extended thinking.',
  why_it_matters: 'Better at coding tasks at the same price point.',
  key_details: ['15% better on SWE-bench', 'Same API pricing', 'Available now'],
  illustration_description: 'Bar chart comparing benchmark scores across models',
  sources: [{ title: 'Anthropic Blog', url: 'https://anthropic.com/blog/claude-4-5', platform: 'web', publishedAt: '2026-04-09' }],
};

describe('checkCardQuality', () => {
  it('returns passing score for valid card + brief', () => {
    const result = checkCardQuality(validCard, validBrief);
    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.pass).toBe(true);
  });

  it('fails voice check if summary contains banned phrases', () => {
    const badCard = { ...validCard, summary: 'This is a game-changer for the industry and truly revolutionary.' };
    const result = checkCardQuality(badCard, validBrief);
    expect(result.voice).toBeLessThan(15);
  });

  it('fails brevity if summary exceeds 60 words', () => {
    const longSummary = Array(70).fill('word').join(' ');
    const badCard = { ...validCard, summary: longSummary };
    const result = checkCardQuality(badCard, validBrief);
    expect(result.brevity).toBeLessThan(15);
  });

  it('fails completeness if learn brief fields are empty', () => {
    const badBrief = { ...validBrief, what_it_is: '', why_it_matters: '' };
    const result = checkCardQuality(validCard, badBrief);
    expect(result.completeness).toBeLessThanOrEqual(15);
  });
});
