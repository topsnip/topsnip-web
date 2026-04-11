import { createServiceClient } from '@/lib/ingest/service-client';
import { LearnBrief } from '@/components/learn/LearnBrief';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceClient();

  // Query card directly, join to topic
  const { data: card } = await supabase
    .from('topic_cards')
    .select('headline, topics!inner(slug, title)')
    .eq('topics.slug', slug)
    .single();

  return {
    title: card?.headline || (card?.topics as any)?.title || 'TopSnip',
  };
}

export default async function LearnPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();

  // Fetch topic
  const { data: topic } = await supabase
    .from('topics')
    .select('id, slug, title, topic_type, platform_count, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!topic) notFound();

  // Fetch card separately
  const { data: card } = await supabase
    .from('topic_cards')
    .select('headline, summary, image_url, learn_brief, quality_score, category_tag')
    .eq('topic_id', topic.id)
    .single();

  if (!card) notFound();

  // Fetch YouTube recs separately
  const { data: youtubeRecs } = await supabase
    .from('youtube_recommendations')
    .select('video_id, title, channel_name, duration, reason, position')
    .eq('topic_id', topic.id)
    .order('position', { ascending: true });

  // Fetch sources
  const { data: topicSources } = await supabase
    .from('topic_sources')
    .select('source_items(title, url, sources(platform))')
    .eq('topic_id', topic.id);

  const sources = (topicSources || []).map((ts: any) => ({
    title: ts.source_items?.title || 'Source',
    url: ts.source_items?.url || '',
    platform: ts.source_items?.sources?.platform || 'web',
  }));

  return (
    <main className="min-h-screen bg-[#080808]">
      <nav className="sticky top-0 z-10 bg-[#080808]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <Link href="/feed" className="flex items-center gap-2 text-sm text-[#666] hover:text-[#F0F0F0] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>
      </nav>

      <LearnBrief
        title={topic.title}
        categoryTag={card.category_tag || topic.topic_type}
        publishedAt={topic.published_at}
        imageUrl={card.image_url}
        brief={card.learn_brief as any}
        youtubeRecs={(youtubeRecs || []).map((r: any) => ({
          video_id: r.video_id,
          title: r.title,
          channel_name: r.channel_name,
          duration: r.duration,
          reason: r.reason,
        }))}
        sources={sources}
      />
    </main>
  );
}
