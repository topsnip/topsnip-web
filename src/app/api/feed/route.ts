import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type FeedCardRow = {
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
  image_url: string | null;
  topics: {
    slug: string;
    trending_score: number;
    platform_count: number;
    published_at: string;
  } | Array<{
    slug: string;
    trending_score: number;
    platform_count: number;
    published_at: string;
  }>;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 50));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0') || 0);
  const days = Math.max(1, Math.min(parseInt(url.searchParams.get('days') || '7') || 7, 30));

  const supabase = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Fetch one extra row so `has_more` is accurate at exact page boundaries.
  const { data: cards, error } = await supabase
    .from('topic_cards')
    .select(`
      headline,
      summary,
      key_fact,
      category_tag,
      image_url,
      topics!inner (
        slug,
        trending_score,
        platform_count,
        published_at,
        status
      )
    `)
    .eq('topics.status', 'published')
    .gte('topics.published_at', since)
    .order('generated_at', { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = cards ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const formatted = (page as unknown as FeedCardRow[]).flatMap((c) => {
    const topic = Array.isArray(c.topics) ? c.topics[0] : c.topics;
    if (!topic) return [];

    return [{
      slug: topic.slug,
      headline: c.headline,
      summary: c.summary,
      key_fact: c.key_fact,
      category_tag: c.category_tag,
      image_url: c.image_url,
      trending_score: topic.trending_score,
      platform_count: topic.platform_count,
      published_at: topic.published_at,
    }];
  });

  return NextResponse.json({
    topics: formatted,
    total: formatted.length,
    has_more: hasMore,
  });
}
