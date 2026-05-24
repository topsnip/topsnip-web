import { describe, expect, it, vi } from 'vitest';
import { getUsageSince, recordUsage } from '@/lib/content/usage-ledger';

function fakeSupabase() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const gte = vi.fn().mockResolvedValue({ data: [{ units: 2 }, { units: 3 }], error: null });
  const eq = vi.fn(() => ({ gte }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ insert, select }));
  return { client: { from }, insert, from };
}

describe('usage ledger', () => {
  it('records usage events when a Supabase client is available', async () => {
    const { client, insert } = fakeSupabase();
    await recordUsage(client as any, {
      provider: 'anthropic',
      operation: 'card_generation',
      units: 1,
      topicId: 'topic-1',
    });

    expect(insert).toHaveBeenCalledWith({
      provider: 'anthropic',
      operation: 'card_generation',
      units: 1,
      topic_id: 'topic-1',
      metadata: {},
    });
  });

  it('sums usage since a cutoff', async () => {
    const { client } = fakeSupabase();
    await expect(getUsageSince(client as any, 'openai', '2026-05-23T00:00:00.000Z')).resolves.toBe(5);
  });
});
