import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyCronAuth } from "@/lib/ingest/cron-auth";
import { createServiceClient } from "@/lib/ingest/service-client";
import { classifyAIRelevance } from "@/lib/content/ai-classifier";
import { isAIRelevant } from "@/lib/content/relevance-filter";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 25;
const RUN_TIMEOUT_MS = 280_000;

/**
 * POST /api/content/retro-classify
 * Re-runs the AI relevance classifier over already-published topics and
 * archives ones that no longer qualify. Safe to run repeatedly — idempotent.
 *
 * Query params:
 *   ?limit=N    — max topics to process this invocation (default 25, max 100)
 *   ?offset=N   — start offset for pagination (default 0)
 *   ?dryRun=1   — compute verdicts without archiving
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25", 10) || BATCH_SIZE, 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createServiceClient();
  const classifier = new Anthropic({ apiKey: anthropicKey });
  const start = Date.now();

  const { data: topics, error: fetchErr } = await supabase
    .from("topics")
    .select("id, slug, title")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  if (!topics || topics.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No published topics in this batch",
      processed: 0,
      archived: 0,
      offset,
      limit,
    });
  }

  const results: Array<{ title: string; slug: string; keep: boolean; reason: string; action: string }> = [];
  let archived = 0;
  let keywordArchived = 0;
  let llmArchived = 0;

  for (const topic of topics) {
    if (Date.now() - start > RUN_TIMEOUT_MS) {
      results.push({ title: topic.title, slug: topic.slug, keep: true, reason: "skipped — run timeout", action: "skipped" });
      continue;
    }

    const { data: topicSources } = await supabase
      .from("topic_sources")
      .select("source_items(title, content_snippet, url)")
      .eq("topic_id", topic.id);

    const sourceSnippets = (topicSources ?? [])
      .map((ts: any) => {
        const item = ts.source_items;
        return `${item?.title ?? ""}: ${item?.content_snippet ?? ""} (${item?.url ?? ""})`;
      })
      .filter(Boolean);

    // Stage 1: keyword filter (free)
    if (!isAIRelevant(topic.title, sourceSnippets)) {
      if (!dryRun) {
        await supabase.from("topics").update({ status: "archived" }).eq("id", topic.id);
      }
      keywordArchived += 1;
      archived += 1;
      results.push({ title: topic.title, slug: topic.slug, keep: false, reason: "keyword filter rejected", action: dryRun ? "would-archive" : "archived" });
      continue;
    }

    // Stage 2: Haiku classifier
    const verdict = await classifyAIRelevance(topic.title, sourceSnippets, classifier);
    if (!verdict.keep) {
      if (!dryRun) {
        await supabase.from("topics").update({ status: "archived" }).eq("id", topic.id);
      }
      llmArchived += 1;
      archived += 1;
      results.push({ title: topic.title, slug: topic.slug, keep: false, reason: verdict.reason, action: dryRun ? "would-archive" : "archived" });
      continue;
    }

    results.push({ title: topic.title, slug: topic.slug, keep: true, reason: verdict.reason, action: "kept" });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    offset,
    limit,
    processed: topics.length,
    archived,
    keywordArchived,
    llmArchived,
    durationMs: Date.now() - start,
    nextOffset: topics.length === limit ? offset + limit : null,
    results,
  });
}
