import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type TopicSourceRow = {
  source_items?: {
    title?: string | null;
    url?: string | null;
    sources?: { platform?: string | null } | null;
  } | null;
};

type YouTubeRecRow = {
  video_id: string;
  title: string;
  channel_name: string;
  duration: string | null;
  reason: string | null;
  position: number;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch topic
  const { data: topic } = await supabase
    .from('topics')
    .select('id, slug, title, topic_type, platform_count, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!topic) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Fetch card
  const { data: card } = await supabase
    .from('topic_cards')
    .select('headline, summary, image_url, learn_brief, quality_score, category_tag')
    .eq('topic_id', topic.id)
    .single();

  if (!card) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Fetch YouTube recs
  const { data: youtubeRecs } = await supabase
    .from('youtube_recommendations')
    .select('video_id, title, channel_name, duration, reason, position')
    .eq('topic_id', topic.id)
    .order('position', { ascending: true });

  // Fetch sources
  const { data: topicSources } = await supabase
    .from('topic_sources')
    .select('source_items(title, url, sources(platform))')
    .eq('topic_id', topic.id);

  const sources = ((topicSources || []) as TopicSourceRow[]).map((ts) => ({
    title: ts.source_items?.title || 'Source',
    url: ts.source_items?.url || '',
    platform: ts.source_items?.sources?.platform || 'web',
  }));

  return NextResponse.json({
    topic: {
      slug: topic.slug,
      title: topic.title,
      category_tag: card.category_tag || topic.topic_type,
      published_at: topic.published_at,
      platform_count: topic.platform_count,
    },
    card: {
      headline: card.headline,
      summary: card.summary,
      image_url: card.image_url,
      learn_brief: card.learn_brief,
      quality_score: card.quality_score,
    },
    youtube_recs: ((youtubeRecs || []) as YouTubeRecRow[]).map((r) => ({
      video_id: r.video_id,
      title: r.title,
      channel_name: r.channel_name,
      duration: r.duration,
      reason: r.reason,
      position: r.position,
    })),
    sources,
  });
}
