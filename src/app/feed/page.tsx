import { createServiceClient } from '@/lib/ingest/service-client';
import { CardStack } from '@/components/feed/CardStack';

export const metadata = {
  title: 'TopSnip — AI Intelligence Feed',
  description: 'Your personal AI news dashboard',
};

export default async function FeedPage() {
  const supabase = createServiceClient();

  // Show last 3 days of topics
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

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

  const formatted = (cards || []).map((c: any) => ({
    slug: c.topics.slug,
    headline: c.headline,
    summary: c.summary,
    key_fact: c.key_fact,
    category_tag: c.category_tag,
    image_url: c.image_url,
    platform_count: c.topics.platform_count,
    published_at: c.topics.published_at,
  }));

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
