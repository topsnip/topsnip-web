import { createClient } from '@/lib/supabase/server';
import { LearnBrief } from '@/components/learn/LearnBrief';
import { getLearnTopic } from '@/lib/learn/get-learn-topic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

type TopicMetaRow = {
  headline?: string | null;
  topics?: { title?: string | null } | null;
};

type YouTubeRecRow = {
  video_id: string;
  title: string;
  channel_name: string;
  duration: string | null;
  reason: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Query card directly, join to topic
  const { data: card } = await supabase
    .from('topic_cards')
    .select('headline, topics!inner(slug, title)')
    .eq('topics.slug', slug)
    .single();

  const typedCard = card as TopicMetaRow | null;

  return {
    title: typedCard?.headline || typedCard?.topics?.title || 'TopSnip',
  };
}

export default async function LearnPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const data = await getLearnTopic(supabase, slug);
  if (!data) notFound();

  const { topic, card, youtubeRecs, sources } = data;

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
        brief={card.learn_brief as Parameters<typeof LearnBrief>[0]['brief']}
        youtubeRecs={((youtubeRecs || []) as YouTubeRecRow[]).map((r) => ({
          video_id: r.video_id,
          title: r.title,
          channel_name: r.channel_name,
          duration: r.duration ?? '',
          reason: r.reason ?? '',
        }))}
        sources={sources}
      />
    </main>
  );
}
