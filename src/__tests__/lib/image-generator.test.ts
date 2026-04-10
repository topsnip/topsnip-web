import { describe, it, expect } from 'vitest';
import { buildIllustrationPrompt } from '@/lib/content/image-generator';

describe('buildIllustrationPrompt', () => {
  it('includes topic title and description', () => {
    const prompt = buildIllustrationPrompt('Claude 4.5 Released', 'A comparison diagram');
    expect(prompt).toContain('Claude 4.5 Released');
    expect(prompt).toContain('comparison diagram');
  });

  it('includes brand style instructions', () => {
    const prompt = buildIllustrationPrompt('Test', 'Description');
    expect(prompt).toContain('#080808');
    expect(prompt).toContain('#7C6AF7');
  });
});
