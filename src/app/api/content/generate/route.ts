import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";
import { runContentGeneration } from "@/lib/content/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Content generation can take longer than ingestion

const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes between runs

/**
 * POST /api/content/generate
 * Triggers content generation for detected topics.
 * Protected by CRON_SECRET + rate limiting.
 *
 * Designed to run after ingestion — picks up topics with status "detected"
 * and generates role-specific learning briefs.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();

    // [7.2 fix] Rate limit: check most recent topic publish time instead of digest created_at
    // (digest uses upsert so created_at doesn't update on subsequent runs)
    const { data: recentTopic } = await supabase
      .from("topics")
      .select("published_at")
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentTopic?.published_at) {
      const elapsed = Date.now() - new Date(recentTopic.published_at).getTime();
      if (elapsed < MIN_INTERVAL_MS) {
        return NextResponse.json(
          { ok: false, error: "Too soon since last run" },
          { status: 429 }
        );
      }
    }

    const result = await runContentGeneration(supabase);

    return NextResponse.json({
      ok: true,
      topicsProcessed: result.topicsProcessed,
      contentGenerated: result.contentGenerated,
      topicsPublished: result.topicsPublished,
      isQuietDay: result.isQuietDay,
      errorCount: result.errors.length,
      durationMs: result.durationMs,
    });
  } catch (err) {
    console.error(
      "Content generation failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Support GET for Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req);
}
