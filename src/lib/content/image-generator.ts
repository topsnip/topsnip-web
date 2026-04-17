import OpenAI from 'openai';
import { claimDalleImage } from '../ratelimit';

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
  prompt: string
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
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) return null;

    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!imageResponse.ok) return null;

    return await imageResponse.arrayBuffer();
  } catch (error) {
    console.error('[image-gen] Failed:', error);
    return null;
  }
}
