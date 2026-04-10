import { describe, it, expect } from 'vitest';
import { enforceWordLimit } from '@/lib/utils/word-limit';

describe('enforceWordLimit', () => {
  it('returns text unchanged if under limit', () => {
    expect(enforceWordLimit('hello world', 10)).toBe('hello world');
  });

  it('truncates text at word boundary when over limit', () => {
    const text = 'one two three four five six';
    expect(enforceWordLimit(text, 3)).toBe('one two three...');
  });

  it('returns empty string for empty input', () => {
    expect(enforceWordLimit('', 10)).toBe('');
  });

  it('handles exact word count', () => {
    expect(enforceWordLimit('one two three', 3)).toBe('one two three');
  });
});
