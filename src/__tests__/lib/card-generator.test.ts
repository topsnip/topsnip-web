import { describe, it, expect } from 'vitest';
import { parseCardResponse } from '@/lib/content/card-generator';

describe('parseCardResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      card: {
        headline: 'Test',
        summary: 'Short summary.',
        key_fact: 'A fact',
        category_tag: 'Research',
      },
      learn_brief: {
        what_it_is: 'Explanation.',
        why_it_matters: 'Relevance.',
        key_details: ['Detail'],
        illustration_description: 'A diagram.',
        sources: [{ title: 'Src', url: 'https://example.com' }],
      },
    });
    const result = parseCardResponse(json);
    expect(result).not.toBeNull();
    expect(result!.card.headline).toBe('Test');
    expect(result!.card.summary).toBe('Short summary.');
    expect(result!.card.key_fact).toBe('A fact');
    expect(result!.card.category_tag).toBe('Research');
    expect(result!.learn_brief.what_it_is).toBe('Explanation.');
  });

  it('extracts JSON from markdown code blocks', () => {
    const wrapped =
      '```json\n{"card":{"headline":"Test","summary":"Short.","key_fact":null,"category_tag":"Industry"},"learn_brief":{"what_it_is":"X","why_it_matters":"Y","key_details":[],"illustration_description":"Z","sources":[]}}\n```';
    const result = parseCardResponse(wrapped);
    expect(result).not.toBeNull();
    expect(result!.card.headline).toBe('Test');
  });

  it('returns null for invalid JSON', () => {
    expect(parseCardResponse('not json')).toBeNull();
  });

  it('returns null if required card fields missing', () => {
    expect(
      parseCardResponse(JSON.stringify({ card: {}, learn_brief: {} }))
    ).toBeNull();
  });

  it('returns null if learn_brief.what_it_is is missing', () => {
    const json = JSON.stringify({
      card: { headline: 'Test', summary: 'Short.', key_fact: null, category_tag: 'Industry' },
      learn_brief: { why_it_matters: 'Y', key_details: [], illustration_description: 'Z', sources: [] },
    });
    expect(parseCardResponse(json)).toBeNull();
  });

  it('enforces 60-word limit on summary', () => {
    const longSummary = Array(80).fill('word').join(' ');
    const json = JSON.stringify({
      card: {
        headline: 'Test',
        summary: longSummary,
        key_fact: null,
        category_tag: 'Industry',
      },
      learn_brief: {
        what_it_is: 'X',
        why_it_matters: 'Y',
        key_details: [],
        illustration_description: 'Z',
        sources: [],
      },
    });
    const result = parseCardResponse(json);
    expect(result).not.toBeNull();
    const words = result!.card.summary.split(/\s+/).filter(Boolean);
    expect(words.length).toBeLessThanOrEqual(61); // 60 words + "..."
  });

  it('defaults category_tag to Industry when missing', () => {
    const json = JSON.stringify({
      card: { headline: 'Test', summary: 'Short.' },
      learn_brief: { what_it_is: 'X', why_it_matters: 'Y', key_details: [], illustration_description: 'Z', sources: [] },
    });
    const result = parseCardResponse(json);
    expect(result).not.toBeNull();
    expect(result!.card.category_tag).toBe('Industry');
  });

  it('defaults key_fact to null when missing', () => {
    const json = JSON.stringify({
      card: { headline: 'Test', summary: 'Short.', category_tag: 'Research' },
      learn_brief: { what_it_is: 'X', why_it_matters: 'Y', key_details: [], illustration_description: 'Z', sources: [] },
    });
    const result = parseCardResponse(json);
    expect(result).not.toBeNull();
    expect(result!.card.key_fact).toBeNull();
  });
});
