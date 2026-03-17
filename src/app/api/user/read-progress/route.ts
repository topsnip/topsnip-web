import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/user/read-progress
 *
 * Updates user_reads with time_spent_sec and scroll_pct.
 * Uses upsert so it works even if the initial insert hasn't fired yet.
 *
 * Body: { user_id, topic_id, time_spent_sec, scroll_pct }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, topic_id, time_spent_sec, scroll_pct } = body;

    // Basic validation
    if (!user_id || !topic_id) {
      return NextResponse.json(
        { error: "user_id and topic_id are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify the authenticated user matches the user_id in the request
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clamp values
    const safeTimeSec = Math.max(0, Math.round(Number(time_spent_sec) || 0));
    const safeScrollPct = Math.min(
      100,
      Math.max(0, Math.round(Number(scroll_pct) || 0)),
    );

    // Upsert — only update time/scroll if the new values are greater
    // (prevents stale beacon from overwriting a more recent value)
    const { error } = await supabase.rpc("upsert_read_progress", {
      p_user_id: user_id,
      p_topic_id: topic_id,
      p_time_spent_sec: safeTimeSec,
      p_scroll_pct: safeScrollPct,
    });

    // Fallback: if the RPC doesn't exist yet, use a plain upsert
    if (error?.message?.includes("upsert_read_progress")) {
      const { error: upsertError } = await supabase
        .from("user_reads")
        .upsert(
          {
            user_id,
            topic_id,
            read_at: new Date().toISOString(),
            time_spent_sec: safeTimeSec,
            scroll_pct: safeScrollPct,
          },
          { onConflict: "user_id,topic_id" },
        );

      if (upsertError) {
        console.warn(
          "[read-progress] Fallback upsert failed:",
          upsertError.message,
        );
        return NextResponse.json(
          { error: "Failed to update progress" },
          { status: 500 },
        );
      }
    } else if (error) {
      console.warn("[read-progress] RPC failed:", error.message);
      return NextResponse.json(
        { error: "Failed to update progress" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    console.warn("[read-progress] Unexpected error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
