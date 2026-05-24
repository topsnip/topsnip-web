type TopicJoin = {
  slug: string;
  trending_score: number;
  platform_count: number;
  source_count?: number | null;
  published_at: string;
};

export type FeedCardRow = {
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
  image_url: string | null;
  action_label?: string | null;
  novelty_note?: string | null;
  topics: TopicJoin | TopicJoin[];
};

export type FeedTopicDto = {
  slug: string;
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
  image_url: string | null;
  action_label: string | null;
  novelty_note: string | null;
  trending_score: number;
  platform_count: number;
  source_count: number;
  published_at: string;
};

export function formatFeedRows(rows: FeedCardRow[]): FeedTopicDto[] {
  return rows.flatMap((card) => {
    const topic = Array.isArray(card.topics) ? card.topics[0] : card.topics;
    if (!topic) return [];

    return [{
      slug: topic.slug,
      headline: card.headline,
      summary: card.summary,
      key_fact: card.key_fact,
      category_tag: card.category_tag,
      image_url: card.image_url,
      action_label: card.action_label ?? null,
      novelty_note: card.novelty_note ?? null,
      trending_score: topic.trending_score,
      platform_count: topic.platform_count,
      source_count: topic.source_count ?? topic.platform_count,
      published_at: topic.published_at,
    }];
  });
}

export function isoDayRange(date: string): { start: string; end: string } {
  const startDate = new Date(`${date}T00:00:00.000Z`);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}
