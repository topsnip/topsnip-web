import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";
import { runIngestion } from "@/lib/ingest/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for full ingestion

const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between runs

/**
 * POST /api/ingest/run
 * Triggers a full ingestion cycle: fetch all sources → score → detect topics.
 * Protected by CRON_SECRET + DB-backed rate limiting.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();

    // Rate limit: check last ingestion run via most recent source check
    const { data: lastCheck } = await supabase
      .from("sources")
      .select("last_checked_at")
      .not("last_checked_at", "is", null)
      .order("last_checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastCheck?.last_checked_at) {
      const elapsed = Date.now() - new Date(lastCheck.last_checked_at).getTime();
      if (elapsed < MIN_INTERVAL_MS) {
        return NextResponse.json(
          { ok: false, error: "Too soon since last run" },
          { status: 429 }
        );
      }
    }

    const result = await runIngestion(supabase);

    // Return safe summary — no internal error details
    return NextResponse.json({
      ok: true,
      fetchedSources: result.fetchedSources,
      newItems: result.newItems,
      newTopics: result.newTopics,
      errorCount: result.errors.length,
      durationMs: result.durationMs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Ingestion run failed:", msg);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron (cron jobs send GET requests)
export async function GET(req: NextRequest) {
  return POST(req);
}
