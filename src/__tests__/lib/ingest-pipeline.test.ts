import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildArxivFetchUrl } from '@/lib/ingest/fetchers/arxiv';
import { getSubredditFromSourceUrl } from '@/lib/ingest/fetchers/reddit';
import { computeVelocity } from '@/lib/ingest/scorer';

describe('ingest pipeline remediation guardrails', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps this suite wired into Vitest', () => {
    expect(true).toBe(true);
  });
});

describe('source-specific fetcher parsing', () => {
  it('extracts subreddit from configured source URL', () => {
    expect(getSubredditFromSourceUrl('https://reddit.com/r/LocalLLaMA')).toBe('LocalLLaMA');
    expect(getSubredditFromSourceUrl('https://www.reddit.com/r/MachineLearning/')).toBe('MachineLearning');
  });

  it('uses configured arXiv URL when it points at export.arxiv.org', () => {
    const url = 'http://export.arxiv.org/api/query?search_query=cat:cs.CL&max_results=20';
    expect(buildArxivFetchUrl(url, 20)).toContain('cat%3Acs.CL');
  });
});

describe('engagement velocity', () => {
  it('uses the last two engagement snapshots instead of raw volume', () => {
    const velocity = computeVelocity(
      [
        { score: 100, timestamp: '2026-05-23T00:00:00.000Z' },
        { score: 160, timestamp: '2026-05-23T02:00:00.000Z' },
      ],
      160
    );

    expect(velocity).toBe(30);
  });
});
