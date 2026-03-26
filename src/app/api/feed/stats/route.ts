import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/ingest/service-client";
import { feedStatsLimiter } from "@/lib/ratelimit";
import { checkOrigin } from "@/lib/csrf";

interface StatsData {
  topics_today: number;
  topics_this_week: number;
  sources_scanned: number;
  platforms_active: number;
  last_updated: string | null;
}

let cache: { data: StatsData; expiresAt: number } | null = null;

export async function GET(req: NextRequest) {
  try {
    // CSRF origin check
    if (!checkOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auth check
    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    if (await feedStatsLimiter.check(user.id)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Return cached response if still valid
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json(cache.data);
    }

    // Compute fresh stats
    const serviceClient = createServiceClient();

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).toISOString();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    // Run all queries in parallel
    const [
      todayResult,
      weekResult,
      sourcesResult,
      platformsResult,
      lastUpdatedResult,
    ] = await Promise.all([
      // topics_today
      serviceClient
        .from("topics")
        .select("id", { count: "exact", head: true })
        .gte("published_at", todayStart)
        .eq("status", "published"),

      // topics_this_week
      serviceClient
        .from("topics")
        .select("id", { count: "exact", head: true })
        .gte("published_at", sevenDaysAgo)
        .eq("status", "published"),

      // sources_scanned (source_items ingested in last 24h)
      serviceClient
        .from("source_items")
        .select("id", { count: "exact", head: true })
        .gte("ingested_at", twentyFourHoursAgo),

      // platforms_active (distinct platforms from healthy active sources)
      serviceClient
        .from("sources")
        .select("platform")
        .eq("is_active", true)
        .eq("health_status", "healthy"),

      // last_updated
      serviceClient
        .from("topics")
        .select("published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Count distinct platforms
    const distinctPlatforms = new Set(
      (platformsResult.data ?? []).map(
        (s: { platform: string }) => s.platform
      )
    );

    const stats: StatsData = {
      topics_today: todayResult.count ?? 0,
      topics_this_week: weekResult.count ?? 0,
      sources_scanned: sourcesResult.count ?? 0,
      platforms_active: distinctPlatforms.size,
      last_updated: lastUpdatedResult.data?.published_at ?? null,
    };

    // Cache for 60 seconds
    cache = { data: stats, expiresAt: Date.now() + 60_000 };

    return NextResponse.json(stats);
  } catch (err) {
    console.error(
      "[/api/feed/stats]",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
