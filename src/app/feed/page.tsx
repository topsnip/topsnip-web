import { createServiceClient } from '@/lib/ingest/service-client';
import { CardStack } from '@/components/feed/CardStack';

export const metadata = {
  title: 'TopSnip — AI Intelligence Feed',
  description: 'Your personal AI news dashboard',
};

export default async function FeedPage() {
  const supabase = createServiceClient();

  // Show all recent published topics (last 7 days), not just today
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: topics, error } = await supabase
    .from('topics')
    .select(`
      slug,
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
    .gte('published_at', weekAgo)
    .order('trending_score', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[feed] Query error:', error.message);
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
      platform_count: t.platform_count,
      published_at: t.published_at,
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
