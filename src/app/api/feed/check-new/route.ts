import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/ingest/service-client";
import { feedPollLimiter } from "@/lib/ratelimit";
import { checkOrigin } from "@/lib/csrf";

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
    if (await feedPollLimiter.check(user.id)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Validate `since` param
    const sinceParam = req.nextUrl.searchParams.get("since");
    if (!sinceParam) {
      return NextResponse.json(
        { error: "Missing required parameter: since" },
        { status: 400 }
      );
    }

    const sinceDate = new Date(sinceParam);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid since parameter: must be ISO 8601" },
        { status: 400 }
      );
    }

    // Cap to 24h lookback and reject future dates
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const effectiveSince =
      sinceDate > now
        ? now
        : sinceDate < twentyFourHoursAgo
          ? twentyFourHoursAgo
          : sinceDate;

    // Query new topics count
    const serviceClient = createServiceClient();
    const { count, error } = await serviceClient
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gt("published_at", effectiveSince.toISOString());

    if (error) {
      console.error("[/api/feed/check-new]", error.message);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ new_count: count ?? 0 });
  } catch (err) {
    console.error(
      "[/api/feed/check-new]",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
