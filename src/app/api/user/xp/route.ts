import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/ingest/service-client";
import { checkOrigin } from "@/lib/csrf";

const VALID_EVENT_TYPES = [
  "topic_read",
  "search_completed",
  "checklist_complete",
  "daily_three",
  "streak_7",
  "streak_30",
  "first_search",
  "first_topic",
] as const;

type EventType = (typeof VALID_EVENT_TYPES)[number];

/**
 * POST /api/user/xp
 *
 * Awards XP for a user action.
 * Body: { event_type: string, metadata?: object }
 * Returns: { xp_gained, total_xp, level, leveled_up, streak? }
 */
export async function POST(req: NextRequest) {
  try {
    // CSRF check
    if (!checkOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse body
    const text = await req.text();
    if (text.length > 2048) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    let body: { event_type?: unknown; metadata?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { event_type, metadata } = body;

    // Validate event_type
    if (
      !event_type ||
      typeof event_type !== "string" ||
      !VALID_EVENT_TYPES.includes(event_type as EventType)
    ) {
      return NextResponse.json(
        { error: "Invalid event_type" },
        { status: 400 }
      );
    }

    // Validate metadata is object or undefined
    const safeMetadata =
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? metadata
        : {};

    // Authenticate
    const authClient = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Award XP via RPC
    const { data: xpResult, error: xpError } = await serviceClient.rpc(
      "award_xp",
      {
        p_user_id: user.id,
        p_event_type: event_type,
        p_metadata: safeMetadata,
      }
    );

    if (xpError) {
      console.error("[/api/user/xp] award_xp failed:", xpError.message);
      return NextResponse.json(
        { error: "Failed to award XP" },
        { status: 500 }
      );
    }

    // Update streak on topic_read events
    let streakResult = null;
    if (event_type === "topic_read") {
      const { data: streak, error: streakError } = await serviceClient.rpc(
        "update_streak",
        { p_user_id: user.id }
      );

      if (streakError) {
        console.warn(
          "[/api/user/xp] update_streak failed:",
          streakError.message
        );
      } else {
        streakResult = streak;
      }
    }

    return NextResponse.json({
      xp_gained: xpResult?.xp_gained ?? 0,
      total_xp: xpResult?.total_xp ?? 0,
      level: xpResult?.new_level ?? "curious",
      leveled_up: xpResult?.leveled_up ?? false,
      ...(streakResult ? { streak: streakResult } : {}),
    });
  } catch (err) {
    console.error(
      "[/api/user/xp]",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
