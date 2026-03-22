import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";
import { runContentGeneration } from "@/lib/content/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 200; // Parallel generation: up to 3 topics with 90s per-topic timeout

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

    // Rate limit: check most recent content generation timestamp
    const { data: recentContent } = await supabase
      .from("topic_content")
      .select("generated_at")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentContent?.generated_at) {
      const elapsed = Date.now() - new Date(recentContent.generated_at).getTime();
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
