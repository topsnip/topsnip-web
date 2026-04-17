import { createServiceClient } from '@/lib/ingest/service-client';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 50));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0') || 0);
  const days = Math.max(1, Math.min(parseInt(url.searchParams.get('days') || '7') || 7, 30));

  const supabase = createServiceClient();
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

  const formatted = page.map((c: any) => ({
    slug: c.topics.slug,
    headline: c.headline,
    summary: c.summary,
    key_fact: c.key_fact,
    category_tag: c.category_tag,
    image_url: c.image_url,
    trending_score: c.topics.trending_score,
    platform_count: c.topics.platform_count,
    published_at: c.topics.published_at,
  }));

  return NextResponse.json({
    topics: formatted,
    total: formatted.length,
    has_more: hasMore,
  });
}
