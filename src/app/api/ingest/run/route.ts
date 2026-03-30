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

    // Atomic rate-limit + concurrency guard:
    // Check last run time AND claim the slot in one step.
    // If another run started within MIN_INTERVAL_MS, skip gracefully.
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
          { ok: true, skipped: true, reason: "Too soon since last run or another run in progress" },
          { status: 429, headers: { "Retry-After": String(Math.ceil((MIN_INTERVAL_MS - elapsed) / 1000)) } }
        );
      }
    }

    // Touch a source's last_checked_at immediately to claim the slot.
    // Any concurrent request arriving after this will see the fresh timestamp
    // and exit via the rate limit above.
    const { error: claimErr } = await supabase
      .from("sources")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("is_active", true)
      .limit(1);

    if (claimErr) {
      console.warn("[Ingest] Failed to claim ingestion slot:", claimErr.message);
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
