import { describe, it, expect } from 'vitest';
import { isAIRelevant } from '@/lib/content/relevance-filter';

describe('isAIRelevant', () => {
  it('accepts genuine AI topics', () => {
    expect(isAIRelevant('Claude 4.5 Released by Anthropic', ['New model with extended thinking'])).toBe(true);
    expect(isAIRelevant('LangChain adds new RAG features', ['vector database integration'])).toBe(true);
  });

  it('rejects non-AI content tagged with #ai', () => {
    expect(isAIRelevant('Mercedes CLA EV Launched', ['car price range features'])).toBe(false);
    expect(isAIRelevant('Musalman Zaroor Sune Allah Islam', ['islamic facts'])).toBe(false);
  });

  it('allows AI-related car content', () => {
    expect(isAIRelevant('Mercedes uses GPT-4 for autonomous driving AI', ['large language model driving assistant'])).toBe(true);
  });

  it('rejects topics with zero AI keywords', () => {
    expect(isAIRelevant('Best Coffee Shops in NYC', ['reviews and ratings'])).toBe(false);
  });
});
