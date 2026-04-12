import { describe, it, expect } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { classifyAIRelevance } from '@/lib/content/ai-classifier';

function makeFakeClient(responseText: string): Anthropic {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'text', text: responseText }],
      }),
    },
  } as unknown as Anthropic;
}

function makeErroringClient(err: Error): Anthropic {
  return {
    messages: {
      create: async () => {
        throw err;
      },
    },
  } as unknown as Anthropic;
}

describe('classifyAIRelevance', () => {
  it('parses a keep verdict', async () => {
    const client = makeFakeClient('{"keep": true, "reason": "AI model launch", "confidence": 0.95}');
    const result = await classifyAIRelevance('Claude 4.6 Released', ['New model'], client);
    expect(result.keep).toBe(true);
    expect(result.confidence).toBe(0.95);
  });

  it('parses an archive verdict', async () => {
    const client = makeFakeClient('{"keep": false, "reason": "non-English content", "confidence": 0.9}');
    const result = await classifyAIRelevance('Musalman Zaroor Sune Allah', ['ai spam'], client);
    expect(result.keep).toBe(false);
    expect(result.reason).toContain('non-English');
  });

  it('tolerates JSON wrapped in prose', async () => {
    const client = makeFakeClient('Here is my verdict: {"keep": false, "reason": "listicle", "confidence": 0.8} — done.');
    const result = await classifyAIRelevance('Top 10 AI tools', ['listicle'], client);
    expect(result.keep).toBe(false);
  });

  it('archives when response is non-text', async () => {
    const client = {
      messages: {
        create: async () => ({ content: [{ type: 'image', source: {} }] }),
      },
    } as unknown as Anthropic;
    const result = await classifyAIRelevance('Foo', [], client);
    expect(result.keep).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('archives when response has no JSON object', async () => {
    const client = makeFakeClient('I cannot decide.');
    const result = await classifyAIRelevance('Foo', [], client);
    expect(result.keep).toBe(false);
  });

  it('fails open when the API errors (trusts upstream keyword filter)', async () => {
    const client = makeErroringClient(new Error('rate limit'));
    const result = await classifyAIRelevance('Claude 4.6', ['new model'], client);
    expect(result.keep).toBe(true);
    expect(result.confidence).toBe(0);
    expect(result.reason).toContain('classifier unavailable');
  });

  it('clamps confidence to [0, 1]', async () => {
    const client = makeFakeClient('{"keep": true, "reason": "yes", "confidence": 5.5}');
    const result = await classifyAIRelevance('Foo', [], client);
    expect(result.confidence).toBe(1);
  });
});
