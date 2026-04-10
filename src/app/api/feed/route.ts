import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 50));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0') || 0);

  const supabase = await createClient();

  const { data: topics, error, count } = await supabase
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
    `, { count: 'exact' })
    .eq('status', 'published')
    .gte('published_at', `${date}T00:00:00Z`)
    .lte('published_at', `${date}T23:59:59Z`)
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
