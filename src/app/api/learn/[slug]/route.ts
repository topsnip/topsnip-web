import { createClient } from '@/lib/supabase/server';
import { getLearnTopic } from '@/lib/learn/get-learn-topic';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

  const data = await getLearnTopic(supabase, slug);
  if (!data) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  const { topic, card, youtubeRecs, sources } = data;

  return NextResponse.json({
    topic: {
      slug: topic.slug,
      title: topic.title,
      category_tag: card.category_tag || topic.topic_type,
      published_at: topic.published_at,
      platform_count: topic.platform_count,
      source_count: topic.source_count,
    },
    card: {
      headline: card.headline,
      summary: card.summary,
      image_url: card.image_url,
      learn_brief: card.learn_brief,
      quality_score: card.quality_score,
      action_label: card.action_label,
      novelty_note: card.novelty_note,
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
