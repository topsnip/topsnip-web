import type { SupabaseClient } from '@supabase/supabase-js';

type SourcePlatformRow = { platform?: string | null };

type SourceItemRow = {
  title?: string | null;
  url?: string | null;
  sources?: SourcePlatformRow | SourcePlatformRow[] | null;
};

type TopicSourceRow = {
  source_items?: SourceItemRow | SourceItemRow[] | null;
};

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

  const sources = ((topicSources || []) as TopicSourceRow[])
    .map((ts) => ({
      title: (Array.isArray(ts.source_items) ? ts.source_items[0] : ts.source_items)?.title || 'Source',
      url: (Array.isArray(ts.source_items) ? ts.source_items[0] : ts.source_items)?.url || '',
      platform: (() => {
        const item = Array.isArray(ts.source_items) ? ts.source_items[0] : ts.source_items;
        const source = Array.isArray(item?.sources) ? item.sources[0] : item?.sources;
        return source?.platform || 'web';
      })(),
    }))
    .filter((source) => Boolean(source.title));

  return {
    topic,
    card,
    youtubeRecs: youtubeRecs || [],
    sources,
  };
}
