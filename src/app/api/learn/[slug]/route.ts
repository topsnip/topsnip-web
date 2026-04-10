import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from('topics')
    .select(`
      id,
      slug,
      title,
      topic_type,
      platform_count,
      published_at,
      topic_cards (
        headline,
        summary,
        image_url,
        learn_brief,
        quality_score,
        category_tag
      ),
      youtube_recommendations (
        video_id,
        title,
        channel_name,
        duration,
        reason,
        position
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!topic || !(topic.topic_cards as any[])?.length) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  // Fetch source articles
  const { data: topicSources } = await supabase
    .from('topic_sources')
    .select('source_items(title, url, sources(platform))')
    .eq('topic_id', topic.id);

  const sources = (topicSources || []).map((ts: any) => ({
    title: ts.source_items?.title || 'Source',
    url: ts.source_items?.url || '',
    platform: ts.source_items?.sources?.platform || 'web',
  }));

  const card = (topic.topic_cards as any[])[0];
  const youtubeRecs = ((topic.youtube_recommendations as any[]) || [])
    .sort((a: any, b: any) => a.position - b.position);

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
    youtube_recs: youtubeRecs.map((r: any) => ({
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
