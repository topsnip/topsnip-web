import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";
import { sendDailyDigest, sendWeeklyDigest } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DigestType = "daily" | "weekly";

/**
 * POST /api/email/send-digest
 * Sends digest emails (daily or weekly) to all subscribed users.
 * Protected by CRON_SECRET — designed to be called by GitHub Actions cron.
 *
 * Body: { type: "daily" | "weekly" }
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  let type: DigestType;
  try {
    const body = await req.json();
    if (body.type !== "daily" && body.type !== "weekly") {
      return NextResponse.json(
        { ok: false, error: 'Invalid type — must be "daily" or "weekly"' },
        { status: 400 }
      );
    }
    type = body.type;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();

    // ── Fetch trending topics from the relevant time window ────────────────
    const now = new Date();
    const since = new Date(now);
    if (type === "daily") {
      since.setDate(since.getDate() - 1);
    } else {
      since.setDate(since.getDate() - 7);
    }

    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("title, slug")
      .eq("status", "published")
      .gte("published_at", since.toISOString())
      .order("trending_score", { ascending: false })
      .limit(type === "daily" ? 5 : 10);

    if (topicsError) {
      console.error("[Digest] Failed to fetch topics:", topicsError.message);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch topics" },
        { status: 500 }
      );
    }

    if (!topics || topics.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skipped: true,
        reason: "No published topics in time window",
      });
    }

    // ── Fetch subscribed users ─────────────────────────────────────────────
    // Send to all users who have completed onboarding (have a verified email).
    // Future enhancement: add email_preferences column for opt-in/opt-out.
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("email")
      .eq("onboarding_complete", true)
      .not("email", "is", null);

    if (usersError) {
      console.error("[Digest] Failed to fetch users:", usersError.message);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skipped: true,
        reason: "No subscribed users",
      });
    }

    // ── Send emails ────────────────────────────────────────────────────────
    const digestTopics = topics.map((t) => ({ title: t.title, slug: t.slug }));

    let sent = 0;
    let failed = 0;

    // Send in parallel batches of 10 to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((user) => {
          const email = user.email as string;
          const name = email.split("@")[0]; // Fallback name from email

          if (type === "daily") {
            return sendDailyDigest(email, name, digestTopics);
          } else {
            return sendWeeklyDigest(email, name, digestTopics);
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          sent++;
        } else {
          failed++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      type,
      topicCount: topics.length,
      sent,
      failed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Digest] Unexpected error:", msg);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Support GET for Vercel Cron (sends GET requests)
export async function GET(req: NextRequest) {
  // Vercel Cron calls GET — create a synthetic request with default type
  const syntheticReq = new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({ type: 'daily' }),
    headers: { ...Object.fromEntries(req.headers), 'content-type': 'application/json' },
  });
  return POST(syntheticReq);
}
