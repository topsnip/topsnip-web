import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";
import { EVERGREEN_TOPICS } from "@/lib/content/evergreen";

export const dynamic = "force-dynamic";

/**
 * POST /api/content/reseed-evergreen
 * Re-publishes all evergreen topics with their hardcoded content.
 * Protected by CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const supabase = createServiceClient();
  let seeded = 0;
  const errors: string[] = [];

  for (const topic of EVERGREEN_TOPICS) {
    try {
      const { data: topicRow, error: topicErr } = await supabase
        .from("topics")
        .upsert(
          {
            slug: topic.slug,
            title: topic.title,
            status: "published",
            is_evergreen: true,
            published_at: new Date().toISOString(),
            trending_score: 10,
          },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (topicErr) throw new Error(topicErr.message);

      const { error: contentErr } = await supabase
        .from("topic_content")
        .upsert(
          {
            topic_id: topicRow.id,
            role: "general",
            tldr: topic.tldr,
            what_happened: topic.what_happened,
            so_what: topic.so_what,
            now_what: topic.now_what,
            generated_by: "reseed-api",
            generated_at: new Date().toISOString(),
          },
          { onConflict: "topic_id,role" }
        );

      if (contentErr) throw new Error(contentErr.message);
      seeded++;
    } catch (err) {
      errors.push(`${topic.title}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    seeded,
    total: EVERGREEN_TOPICS.length,
    errors,
  });
}
