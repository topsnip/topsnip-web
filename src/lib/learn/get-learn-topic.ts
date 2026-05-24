import type { SupabaseClient } from '@supabase/supabase-js';

export async function getLearnTopic(supabase: SupabaseClient, slug: string) {
  const { data: topic } = await supabase
    .from('topics')
    .select('id, slug, title, topic_type, platform_count, source_count, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!topic) return null;

  const [{ data: card }, { data: youtubeRecs }, { data: topicSources }] = await Promise.all([
    supabase
      .from('topic_cards')
      .select('headline, summary, image_url, learn_brief, quality_score, category_tag, action_label, novelty_note')
      .eq('topic_id', topic.id)
      .single(),
    supabase
      .from('youtube_recommendations')
      .select('video_id, title, channel_name, duration, reason, position')
      .eq('topic_id', topic.id)
      .order('position', { ascending: true }),
    supabase
      .from('topic_sources')
      .select('source_items(title, url, sources(platform))')
      .eq('topic_id', topic.id),
  ]);

  if (!card) return null;

  const sources = ((topicSources || []) as any[])
    .map((ts) => ({
      title: ts.source_items?.title || 'Source',
      url: ts.source_items?.url || '',
      platform: ts.source_items?.sources?.platform || 'web',
    }))
    .filter((source) => Boolean(source.title));

  return {
    topic,
    card,
    youtubeRecs: youtubeRecs || [],
    sources,
  };
}
