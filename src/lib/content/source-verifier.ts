import Anthropic from '@anthropic-ai/sdk';
import type { LearnBrief, TopicCard } from './card-types';

const MODEL = 'claude-haiku-4-5';

export interface SourceVerification {
  pass: boolean;
  unsupportedClaims: string[];
  copiedPhrases: string[];
  reason: string;
}

export function parseVerificationResponse(text: string): SourceVerification {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { pass: false, unsupportedClaims: [], copiedPhrases: [], reason: 'verifier returned no JSON' };
    }
    const parsed = JSON.parse(match[0]);
    return {
      pass: Boolean(parsed.pass),
      unsupportedClaims: Array.isArray(parsed.unsupportedClaims) ? parsed.unsupportedClaims.map(String) : [],
      copiedPhrases: Array.isArray(parsed.copiedPhrases) ? parsed.copiedPhrases.map(String) : [],
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'no reason provided',
    };
  } catch {
    return { pass: false, unsupportedClaims: [], copiedPhrases: [], reason: 'verifier returned invalid JSON' };
  }
}

export async function verifySourceGrounding(
  card: TopicCard,
  brief: LearnBrief,
  sourceSnippets: string[],
  anthropicClient = new Anthropic()
): Promise<SourceVerification> {
  const sourceText = sourceSnippets.slice(0, 8).join('\n---\n').slice(0, 12_000);
  const generated = JSON.stringify({ card, learn_brief: brief }).slice(0, 8_000);

  const message = await anthropicClient.messages.create(
    {
      model: MODEL,
      max_tokens: 500,
      system: `You verify whether generated AI news copy is grounded in provided source snippets.
Return JSON only:
{"pass": boolean, "unsupportedClaims": string[], "copiedPhrases": string[], "reason": string}
Fail if generated copy makes specific factual claims not present in sources.
Fail if it copies distinctive phrasing or sentence structure from the sources.
Pass only when claims are supported and wording is transformed.`,
      messages: [
        {
          role: 'user',
          content: `<sources>\n${sourceText}\n</sources>\n\n<generated>\n${generated}\n</generated>`,
        },
      ],
    },
    { signal: AbortSignal.timeout(20_000) }
  );

  const block = message.content[0];
  if (!block || block.type !== 'text') {
    return { pass: false, unsupportedClaims: [], copiedPhrases: [], reason: 'verifier returned non-text response' };
  }

  return parseVerificationResponse(block.text);
}
