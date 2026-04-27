import { createClient } from '@/lib/supabase/server';
import { CardStack } from '@/components/feed/CardStack';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'TopSnip — AI Intelligence Feed',
  description: 'Your personal AI news dashboard',
};

type FeedCardRow = {
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
  image_url: string | null;
  topics: {
    slug: string;
    platform_count: number;
    published_at: string;
  } | Array<{
    slug: string;
    platform_count: number;
    published_at: string;
  }>;
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function FeedPage() {
  const supabase = await createClient();

  // Show last 3 days of topics
  const threeDaysAgo = daysAgoIso(3);

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
    .gte('topics.published_at', threeDaysAgo)
    .order('generated_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[feed] Query error:', error.message);
  }

  const formatted = ((cards || []) as unknown as FeedCardRow[]).flatMap((c) => {
    const topic = Array.isArray(c.topics) ? c.topics[0] : c.topics;
    if (!topic) return [];

    return [{
      slug: topic.slug,
      headline: c.headline,
      summary: c.summary,
      key_fact: c.key_fact,
      category_tag: c.category_tag,
      image_url: c.image_url,
      platform_count: topic.platform_count,
      published_at: topic.published_at,
    }];
  });

  return (
    <main className="min-h-screen bg-[#080808]">
      <header className="sticky top-0 z-10 bg-[#080808]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <h1 className="text-lg font-bold text-[#F0F0F0]">
          Top<span className="text-[#7C6AF7]">Snip</span>
        </h1>
      </header>
      <CardStack topics={formatted} />
    </main>
  );
}
