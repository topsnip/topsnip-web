import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";
import { runIngestion } from "@/lib/ingest/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for full ingestion

const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between runs
const LOCK_NAME = "ingest";

/**
 * POST /api/ingest/run
 * Triggers a full ingestion cycle: fetch all sources → score → detect topics.
 * Protected by CRON_SECRET + DB-backed lock.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();

    // Atomic claim: a single UPDATE that only succeeds if the lock is stale.
    // Two concurrent requests cannot both match the WHERE clause because
    // Postgres serializes row updates, so the second sees the fresh timestamp.
    const cutoffIso = new Date(Date.now() - MIN_INTERVAL_MS).toISOString();
    const nowIso = new Date().toISOString();

    const { data: claimed, error: claimErr } = await supabase
      .from("locks")
      .update({ last_acquired_at: nowIso })
      .eq("name", LOCK_NAME)
      .or(`last_acquired_at.is.null,last_acquired_at.lt.${cutoffIso}`)
      .select("last_acquired_at");

    if (claimErr) {
      console.error("[Ingest] Lock acquire query failed:", claimErr.message);
      return NextResponse.json({ ok: false, error: "Lock check failed" }, { status: 500 });
    }

    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        { ok: true, skipped: true, reason: "Another ingest run is already in progress or completed recently" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(MIN_INTERVAL_MS / 1000)) } }
      );
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
