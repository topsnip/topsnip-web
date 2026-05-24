import type { SupabaseClient } from '@supabase/supabase-js';

export type UsageProvider = 'anthropic' | 'openai' | 'youtube';

export async function recordUsage(
  supabase: SupabaseClient | null,
  event: {
    provider: UsageProvider;
    operation: string;
    units?: number;
    topicId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from('api_usage_events').insert({
    provider: event.provider,
    operation: event.operation,
    units: event.units ?? 1,
    topic_id: event.topicId ?? null,
    metadata: event.metadata ?? {},
  });

  if (error) {
    console.warn(`[usage-ledger] failed to record ${event.provider}:${event.operation}: ${error.message}`);
  }
}

export async function getUsageSince(
  supabase: SupabaseClient,
  provider: UsageProvider,
  sinceIso: string
): Promise<number> {
  const { data, error } = await supabase
    .from('api_usage_events')
    .select('units')
    .eq('provider', provider)
    .gte('created_at', sinceIso);

  if (error) {
    console.warn(`[usage-ledger] failed to read usage for ${provider}: ${error.message}`);
    return 0;
  }

  return (data ?? []).reduce((sum, row: { units: number | null }) => sum + (row.units ?? 0), 0);
}
