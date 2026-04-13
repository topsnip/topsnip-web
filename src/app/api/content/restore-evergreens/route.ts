import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";

export const dynamic = "force-dynamic";

/**
 * POST /api/content/restore-evergreens
 * One-shot: flip any is_evergreen=true topics that were accidentally archived
 * back to "published". Safe to run repeatedly — idempotent.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const supabase = createServiceClient();

  const { data: restored, error } = await supabase
    .from("topics")
    .update({ status: "published" })
    .eq("is_evergreen", true)
    .eq("status", "archived")
    .select("id, slug, title");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    restored: restored?.length ?? 0,
    topics: (restored ?? []).map((t) => t.title),
  });
}
