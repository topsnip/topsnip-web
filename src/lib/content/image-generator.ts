import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { claimDalleImage } from '../ratelimit';
import { recordUsage } from './usage-ledger';

export function buildIllustrationPrompt(
  topicTitle: string,
  illustrationDescription: string
): string {
  return [
    'Clean, minimal infographic on dark background (#080808).',
    'Purple accent color (#7C6AF7). White text (#F0F0F0).',
    'Modern tech aesthetic. No photorealism. Diagram/flowchart style.',
    'No watermarks, no logos, no text overlays.',
    `Topic: ${topicTitle}`,
    `Visual: ${illustrationDescription}`,
  ].join(' ');
}

export async function generateIllustration(
  prompt: string,
  supabase: SupabaseClient | null = null,
  topicId: string | null = null
): Promise<ArrayBuffer | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[image-gen] OPENAI_API_KEY not set, skipping');
    return null;
  }

  if (!(await claimDalleImage())) {
    console.warn('[image-gen] Daily cap reached, skipping');
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // gpt-image-1 replaced dall-e-3 (deprecated by OpenAI ~2026-05-13).
    // Returns base64 directly, not a URL, and rejects `response_format`.
    // quality 'medium' is the closest $/image match to old `dall-e-3 standard`.
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
    });

    await recordUsage(supabase, {
      provider: 'openai',
      operation: 'image_generation',
      units: 1,
      topicId,
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      console.warn('[image-gen] No b64_json in response');
      return null;
    }
    const buf = Buffer.from(b64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch (error) {
    console.error('[image-gen] Failed:', error);
    return null;
  }
}
