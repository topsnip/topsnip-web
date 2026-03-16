import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";

export const dynamic = "force-dynamic";

/**
 * GET /api/ingest/health
 * Returns health status of all sources + recent ingestion stats.
 * Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();

    // Source health
    const { data: sources } = await supabase
      .from("sources")
      .select("name, platform, is_active, health_status, last_checked_at")
      .order("platform");

    // Recent ingestion stats (last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: recentItems } = await supabase
      .from("source_items")
      .select("*", { count: "exact", head: true })
      .gte("ingested_at", cutoff);

    const { count: recentTopics } = await supabase
      .from("topics")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoff);

    const { count: publishedTopics } = await supabase
      .from("topics")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");

    const { count: pendingTopics } = await supabase
      .from("topics")
      .select("*", { count: "exact", head: true })
      .eq("status", "detected");

    return NextResponse.json({
      ok: true,
      sources: sources || [],
      stats: {
        itemsLast24h: recentItems || 0,
        topicsLast24h: recentTopics || 0,
        publishedTopics: publishedTopics || 0,
        pendingTopics: pendingTopics || 0,
      },
    });
  } catch (err) {
    console.error("Ingestion health check failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
