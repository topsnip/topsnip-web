// Quiet day detection — determines if there's enough significant AI news to justify a feed update.
// If it's a quiet day, we still show value (learning content, knowledge gaps) instead of nothing.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "./types";

const ALL_ROLES: Role[] = ["general", "developer", "pm", "cto"];

// Thresholds for "quiet day" detection
const MIN_TOPICS_FOR_ACTIVE_DAY = 2; // Need at least 2 published topics
const MIN_TRENDING_SCORE = 3; // Topics below this aren't significant enough

/**
 * Check if today is a quiet day — not enough significant AI developments to warrant a full feed.
 * Returns true if quiet, false if active.
 */
export async function isQuietDay(
  supabase: SupabaseClient,
  date: string // ISO date string YYYY-MM-DD
): Promise<boolean> {
  // Count topics published today with meaningful trending scores
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  const { count } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gte("published_at", startOfDay)
    .lte("published_at", endOfDay)
    .gte("trending_score", MIN_TRENDING_SCORE);

  return (count ?? 0) < MIN_TOPICS_FOR_ACTIVE_DAY;
}

/**
 * Build the daily digest for each role.
 * On active days: top 3-5 published topics for the day.
 * On quiet days: mark as quiet + still include any topics that exist.
 */
export async function buildDailyDigests(
  supabase: SupabaseClient,
  date: string // YYYY-MM-DD
): Promise<{ digestsCreated: number; isQuietDay: boolean; error?: string }> {
  const quiet = await isQuietDay(supabase, date);

  // Get today's published topics, ordered by trending score
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  const { data: topics } = await supabase
    .from("topics")
    .select("id, trending_score")
    .eq("status", "published")
    .gte("published_at", startOfDay)
    .lte("published_at", endOfDay)
    .order("trending_score", { ascending: false })
    .limit(5);

  const topicIds = (topics ?? []).map((t) => t.id);

  // Create a digest for each role
  let digestsCreated = 0;
  for (const role of ALL_ROLES) {
    const { error } = await supabase.from("daily_digests").upsert(
      {
        date,
        role,
        topic_ids: topicIds,
        is_quiet_day: quiet,
      },
      { onConflict: "date,role" }
    );

    if (error) {
      return {
        digestsCreated,
        isQuietDay: quiet,
        error: `Failed to create digest for ${role}: ${error.message}`,
      };
    }
    digestsCreated++;
  }

  return { digestsCreated, isQuietDay: quiet };
}
