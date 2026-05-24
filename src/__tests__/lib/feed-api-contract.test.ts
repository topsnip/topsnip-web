import { describe, expect, it } from 'vitest';
import { formatFeedRows, isoDayRange } from '@/lib/feed/format-feed';

describe('feed API contract helpers', () => {
  it('formats source_count separately from platform_count', () => {
    const rows = formatFeedRows([
      {
        headline: 'Headline',
        summary: 'Summary',
        key_fact: null,
        category_tag: 'Industry',
        image_url: null,
        topics: {
          slug: 'story',
          trending_score: 9,
          platform_count: 2,
          source_count: 7,
          published_at: '2026-05-23T12:00:00.000Z',
        },
      },
    ]);

    expect(rows[0].source_count).toBe(7);
    expect(rows[0].platform_count).toBe(2);
  });

  it('builds an exact UTC day range for date filtering', () => {
    expect(isoDayRange('2026-05-23')).toEqual({
      start: '2026-05-23T00:00:00.000Z',
      end: '2026-05-24T00:00:00.000Z',
    });
  });
});
