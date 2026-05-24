import { createClient } from '@/lib/supabase/server';
import { CardStack } from '@/components/feed/CardStack';
import { formatFeedRows, type FeedCardRow } from '@/lib/feed/format-feed';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'TopSnip — AI Intelligence Feed',
  description: 'Your personal AI news dashboard',
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
    `)
    .eq('topics.status', 'published')
    .gte('topics.published_at', threeDaysAgo)
    .order('generated_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[feed] Query error:', error.message);
    return (
      <main className="min-h-screen bg-[#080808]">
        <header className="sticky top-0 z-10 bg-[#080808]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
          <h1 className="text-lg font-bold text-[#F0F0F0]">
            Top<span className="text-[#7C6AF7]">Snip</span>
          </h1>
        </header>
        <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
          <p className="text-sm text-[#999]">The feed could not load. Try again shortly.</p>
        </div>
      </main>
    );
  }

  const formatted = formatFeedRows((cards ?? []) as unknown as FeedCardRow[])
    .sort((a, b) => b.trending_score - a.trending_score);

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
