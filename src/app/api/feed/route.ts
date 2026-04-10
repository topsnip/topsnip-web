import { createServiceClient } from '@/lib/ingest/service-client';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 50));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0') || 0);
  // Default: last 7 days. Optional ?days=N to customize window.
  const days = Math.max(1, Math.min(parseInt(url.searchParams.get('days') || '7') || 7, 30));

  const supabase = createServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: topics, error } = await supabase
    .from('topics')
    .select(`
      slug,
      title,
      trending_score,
      platform_count,
      published_at,
      topic_cards (
        headline,
        summary,
        key_fact,
        category_tag,
        image_url
      )
    `)
    .eq('status', 'published')
    .gte('published_at', since)
    .order('trending_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (topics || [])
    .filter((t: any) => t.topic_cards?.length > 0)
    .map((t: any) => ({
      slug: t.slug,
      headline: t.topic_cards[0].headline,
      summary: t.topic_cards[0].summary,
      key_fact: t.topic_cards[0].key_fact,
      category_tag: t.topic_cards[0].category_tag,
      image_url: t.topic_cards[0].image_url,
      trending_score: t.trending_score,
      platform_count: t.platform_count,
      published_at: t.published_at,
    }));

  return NextResponse.json({
    topics: formatted,
    total: formatted.length,
    has_more: formatted.length === limit,
  });
}
