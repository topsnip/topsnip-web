import { createClient } from '@/lib/supabase/server';
import { formatFeedRows, isoDayRange, type FeedCardRow } from '@/lib/feed/format-feed';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 50));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0') || 0);
  const date = url.searchParams.get('date');
  const days = Math.max(1, Math.min(parseInt(url.searchParams.get('days') || '7') || 7, 30));
  const range = date
    ? isoDayRange(date)
    : { start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() };

  const supabase = await createClient();

  // Fetch one extra row so `has_more` is accurate at exact page boundaries.
  const { data: cards, error, count } = await supabase
    .from('topic_cards')
    .select(`
      headline,
      summary,
      key_fact,
      category_tag,
      image_url,
      action_label,
      novelty_note,
      topics!inner (
        slug,
        trending_score,
        platform_count,
        source_count,
        published_at,
        status
      )
    `, { count: 'exact' })
    .eq('topics.status', 'published')
    .gte('topics.published_at', range.start)
    .lt('topics.published_at', range.end)
    .order('generated_at', { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    console.error('[feed-api] Query error:', error.message);
    return NextResponse.json({ error: 'Could not load feed' }, { status: 500 });
  }

  const rows = cards ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const formatted = formatFeedRows(page as unknown as FeedCardRow[])
    .sort((a, b) => b.trending_score - a.trending_score);

  return NextResponse.json({
    topics: formatted,
    total: count ?? formatted.length,
    has_more: hasMore,
  });
}
