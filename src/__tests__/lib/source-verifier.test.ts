import { describe, expect, it } from 'vitest';
import { parseVerificationResponse } from '@/lib/content/source-verifier';

describe('source verifier response parsing', () => {
  it('parses a passing verifier response', () => {
    expect(parseVerificationResponse('{"pass":true,"unsupportedClaims":[],"copiedPhrases":[],"reason":"grounded"}')).toEqual({
      pass: true,
      unsupportedClaims: [],
      copiedPhrases: [],
      reason: 'grounded',
    });
  });

  it('fails closed on malformed verifier output', () => {
    expect(parseVerificationResponse('not json').pass).toBe(false);
  });
});
