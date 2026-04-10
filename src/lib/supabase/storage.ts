import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'topic-illustrations';

export async function uploadIllustration(
  supabase: SupabaseClient,
  slug: string,
  imageBuffer: ArrayBuffer,
  contentType = 'image/png'
): Promise<string | null> {
  const path = `${slug}.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, imageBuffer, { contentType, upsert: true });

  if (error) {
    console.error(`[storage] Upload failed for ${slug}:`, error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteIllustration(
  supabase: SupabaseClient,
  slug: string
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([`${slug}.png`]);
}
