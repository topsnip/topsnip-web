'use client';

import { FeedCard } from './FeedCard';

interface Topic {
  slug: string;
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
  image_url: string | null;
  platform_count: number;
  published_at: string;
}

export function CardStack({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-full bg-[#7C6AF7]/10 flex items-center justify-center mb-4">
          <span className="text-2xl">📡</span>
        </div>
        <h2 className="text-lg font-semibold text-[#F0F0F0] mb-2">No topics yet today</h2>
        <p className="text-sm text-[#666]">Check back later — the pipeline runs every few hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-6 max-w-lg mx-auto">
      {topics.map((topic) => (
        <FeedCard
          key={topic.slug}
          slug={topic.slug}
          headline={topic.headline}
          summary={topic.summary}
          keyFact={topic.key_fact}
          categoryTag={topic.category_tag}
          imageUrl={topic.image_url}
          sourceCount={topic.platform_count}
          publishedAt={topic.published_at}
        />
      ))}
    </div>
  );
}
