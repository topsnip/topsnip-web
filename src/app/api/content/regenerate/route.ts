import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";

export const dynamic = "force-dynamic";

/**
 * POST /api/content/regenerate
 * Resets published topics to "detected" so the content pipeline
 * re-generates them with current prompts + model.
 * Protected by CRON_SECRET.
 *
 * Also deletes existing topic_content rows so they get regenerated fresh.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();

    // Find all published topics
    const { data: topics, error: fetchErr } = await supabase
      .from("topics")
      .select("id, title")
      .eq("status", "published");

    if (fetchErr) {
      return NextResponse.json(
        { ok: false, error: fetchErr.message },
        { status: 500 }
      );
    }

    if (!topics || topics.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No published topics to regenerate",
        topicsReset: 0,
      });
    }

    const topicIds = topics.map((t) => t.id);

    // Delete existing content so it gets regenerated fresh
    const { error: deleteErr } = await supabase
      .from("topic_content")
      .delete()
      .in("topic_id", topicIds);

    if (deleteErr) {
      return NextResponse.json(
        { ok: false, error: `Failed to delete old content: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    // Reset topics to "detected" so the pipeline picks them up
    const { error: updateErr } = await supabase
      .from("topics")
      .update({ status: "detected" })
      .in("id", topicIds);

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: `Failed to reset topics: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      topicsReset: topics.length,
      topics: topics.map((t) => t.title),
      message: `Reset ${topics.length} topics to "detected". Run /api/content/generate to regenerate.`,
    });
  } catch (err) {
    console.error("Regeneration failed:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
