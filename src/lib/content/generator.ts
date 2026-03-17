// Content generation service — the core of Step 4
// Takes detected topics, generates role-specific learning briefs via Claude.

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Role,
  TopicSourceMaterial,
  GeneratedContent,
  SourceAttribution,
  TopicGenerationResult,
} from "./types";
import {
  buildExplainerSystemPrompt,
  buildExplainerUserPrompt,
  buildQualityCheckPrompt,
} from "./prompts";

const ALL_ROLES: Role[] = ["general", "developer", "pm", "cto"];

// Use Haiku for speed + cost — same as the existing search route
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 3000;

// Quality threshold — content below this score gets flagged, not published
const MIN_QUALITY_SCORE = 40;

function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

// ── Gather source material for a topic ────────────────────────────────────

export async function gatherSourceMaterial(
  supabase: SupabaseClient,
  topicId: string
): Promise<TopicSourceMaterial | null> {
  // Get topic details
  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .select("id, title, slug, trending_score, platform_count, is_breaking")
    .eq("id", topicId)
    .single();

  if (topicErr || !topic) return null;

  // Get linked source items via topic_sources join
  const { data: links } = await supabase
    .from("topic_sources")
    .select("source_item_id")
    .eq("topic_id", topicId);

  if (!links || links.length === 0) return null;

  const sourceItemIds = links.map((l) => l.source_item_id);

  const { data: items } = await supabase
    .from("source_items")
    .select("id, title, url, content_snippet, engagement_score, published_at, source_id")
    .in("id", sourceItemIds)
    .order("engagement_score", { ascending: false });

  if (!items || items.length === 0) return null;

  // Resolve platform for each item
  const sourceIds = [...new Set(items.map((i) => i.source_id))];
  const { data: sources } = await supabase
    .from("sources")
    .select("id, platform")
    .in("id", sourceIds);

  const platformMap = new Map(
    (sources ?? []).map((s) => [s.id, s.platform as string])
  );

  return {
    topicId: topic.id,
    topicTitle: topic.title,
    topicSlug: topic.slug,
    trendingScore: topic.trending_score,
    platformCount: topic.platform_count,
    isBreaking: topic.is_breaking,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url ?? "",
      contentSnippet: item.content_snippet ?? "",
      platform: platformMap.get(item.source_id) ?? "unknown",
      engagementScore: item.engagement_score,
      publishedAt: item.published_at ?? "",
    })),
  };
}

// ── Generate content for one topic × one role ─────────────────────────────

async function generateForRole(
  anthropic: Anthropic,
  material: TopicSourceMaterial,
  role: Role
): Promise<GeneratedContent> {
  const systemPrompt = buildExplainerSystemPrompt(role);
  const userPrompt = buildExplainerUserPrompt(
    material.topicTitle,
    material.items.map((item) => ({
      title: item.title,
      url: item.url,
      contentSnippet: item.contentSnippet,
      platform: item.platform,
    }))
  );

  // [M6 fix] 30-second timeout on Claude calls
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  }, { signal: AbortSignal.timeout(30_000) });

  const text = message.content[0];
  if (text.type !== "text") throw new Error("Unexpected Claude response type");

  // Extract JSON from response
  const jsonMatch = text.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Failed to parse JSON for role=${role}`);

  const parsed = JSON.parse(jsonMatch[0]);

  // Build source attributions
  const sources: SourceAttribution[] = Array.isArray(parsed.sources)
    ? parsed.sources.map((s: Record<string, string>) => ({
        title: s.title ?? "",
        url: s.url ?? "",
        platform: s.platform ?? "",
        publishedAt: "",
      }))
    : material.items.map((item) => ({
        title: item.title,
        url: item.url,
        platform: item.platform,
        publishedAt: item.publishedAt,
      }));

  return {
    topicId: material.topicId,
    role,
    tldr: typeof parsed.tldr === "string" ? parsed.tldr : "",
    whatHappened: typeof parsed.what_happened === "string" ? parsed.what_happened : "",
    soWhat: typeof parsed.so_what === "string" ? parsed.so_what : "",
    nowWhat: typeof parsed.now_what === "string" ? parsed.now_what : "",
    sourcesJson: sources,
    qualityScore: null,
  };
}

// ── Quality check ─────────────────────────────────────────────────────────

async function checkQuality(
  anthropic: Anthropic,
  material: TopicSourceMaterial,
  content: GeneratedContent
): Promise<number> {
  const prompt = buildQualityCheckPrompt(
    material.topicTitle,
    {
      tldr: content.tldr,
      whatHappened: content.whatHappened,
      soWhat: content.soWhat,
      nowWhat: content.nowWhat,
    },
    material.items.map((i) => ({ title: i.title, contentSnippet: i.contentSnippet }))
  );

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }, { signal: AbortSignal.timeout(30_000) });

    const text = message.content[0];
    if (text.type !== "text") return 0; // default score on error

    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return 0;

    const parsed = JSON.parse(jsonMatch[0]);
    return typeof parsed.score === "number" ? parsed.score : 50;
  } catch {
    // Quality check is non-critical — don't block generation
    console.warn(`Quality check failed for topic ${material.topicId}, defaulting to 0`);
    return 0;
  }
}

// ── Generate all roles for a single topic ─────────────────────────────────

export async function generateForTopic(
  supabase: SupabaseClient,
  topicId: string
): Promise<TopicGenerationResult> {
  const errors: string[] = [];
  const contentByRole: Partial<Record<Role, GeneratedContent>> = {};

  // Atomically claim topic — only proceeds if status is still "detected"
  const { data: claimed, error: claimErr } = await supabase
    .from("topics")
    .update({ status: "generating" })
    .eq("id", topicId)
    .eq("status", "detected")
    .select("id");

  if (claimErr || !claimed || claimed.length === 0) {
    // Another instance already claimed this topic, skip it
    return { topicId, contentByRole: {} as Record<Role, GeneratedContent>, youtubeRecs: [], errors: [`Topic ${topicId} already claimed by another instance`] };
  }

  const material = await gatherSourceMaterial(supabase, topicId);
  if (!material) {
    errors.push(`No source material found for topic ${topicId}`);
    // Reset status back to detected
    await supabase
      .from("topics")
      .update({ status: "detected" })
      .eq("id", topicId);
    return { topicId, contentByRole: {} as Record<Role, GeneratedContent>, youtubeRecs: [], errors };
  }

  const anthropic = getAnthropic();

  // Generate content for all 4 roles
  // Run general first, then the 3 specialized roles in parallel
  try {
    const generalContent = await generateForRole(anthropic, material, "general");
    contentByRole.general = generalContent;
  } catch (err) {
    errors.push(`general: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Specialized roles in parallel
  const specializedResults = await Promise.allSettled(
    (["developer", "pm", "cto"] as Role[]).map((role) =>
      generateForRole(anthropic, material, role)
    )
  );

  for (const result of specializedResults) {
    if (result.status === "fulfilled") {
      contentByRole[result.value.role] = result.value;
    } else {
      errors.push(String(result.reason));
    }
  }

  // Quality check on general content (representative of source accuracy)
  if (contentByRole.general) {
    const score = await checkQuality(anthropic, material, contentByRole.general);
    // Apply score to all generated content for this topic
    for (const role of ALL_ROLES) {
      if (contentByRole[role]) {
        contentByRole[role].qualityScore = score;
      }
    }
  }

  // Save to DB
  for (const role of ALL_ROLES) {
    const content = contentByRole[role];
    if (!content) continue;

    const { error: insertErr } = await supabase.from("topic_content").upsert(
      {
        topic_id: content.topicId,
        role: content.role,
        tldr: content.tldr,
        what_happened: content.whatHappened,
        so_what: content.soWhat,
        now_what: content.nowWhat,
        sources_json: content.sourcesJson,
        quality_score: content.qualityScore,
        generated_by: MODEL,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "topic_id,role" }
    );

    if (insertErr) {
      errors.push(`DB insert failed for ${role}: ${insertErr.message}`);
    }
  }

  // Publish topic if general content exists and quality passes
  const generalScore = contentByRole.general?.qualityScore ?? 0;
  if (contentByRole.general && generalScore >= MIN_QUALITY_SCORE) {
    await supabase
      .from("topics")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", topicId);
  } else if (generalScore < MIN_QUALITY_SCORE) {
    errors.push(
      `Quality score ${generalScore} below threshold ${MIN_QUALITY_SCORE} — topic not published`
    );
    // Reset to detected so it can be retried
    await supabase
      .from("topics")
      .update({ status: "detected" })
      .eq("id", topicId);
  }

  return {
    topicId,
    contentByRole: contentByRole as Record<Role, GeneratedContent>,
    youtubeRecs: [], // Filled by youtube-recs.ts separately
    errors,
  };
}
