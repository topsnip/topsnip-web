// Content generation service — the core of Step 4
// Takes detected topics, generates role-specific learning briefs via Claude.

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeWithRetry } from "./retry";
import type {
  Role,
  TopicType,
  TopicSourceMaterial,
  GeneratedContent,
  SourceAttribution,
  TopicGenerationResult,
  QualityScoreBreakdown,
} from "./types";
import { enrichSourceMaterial, isGarbageContent } from "./enricher";
import type { EnrichmentResult } from "./enricher";
import {
  buildExplainerSystemPrompt,
  buildExplainerUserPrompt,
  sanitizeForPrompt,
} from "./prompts";
import { getFormatDefinition, getJsonSchemaString } from "./formats";
import { checkQualityV2, isQualityAcceptable, MIN_QUALITY_SCORE } from "./quality";
import { featureFlags } from "../feature-flags";

const ALL_ROLES: Role[] = ["general", "developer", "pm", "cto"];

// Sonnet for quality content generation — upgraded from Haiku in v1.1
const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 3000;

function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

// ── Content JSON validation ───────────────────────────────────────────────

function validateContentJson(
  contentJson: Record<string, unknown>,
  topicType: TopicType
): boolean {
  try {
    const format = getFormatDefinition(topicType);

    const expectedFields = Object.keys(format.jsonSchema);
    const missingFields = expectedFields.filter(
      (field) => !(field in contentJson) || contentJson[field] === undefined
    );

    if (missingFields.length > 0) {
      console.warn(
        `Content JSON validation: missing fields for ${topicType}: ${missingFields.join(", ")}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Content JSON validation error: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// ── Gather source material for a topic ────────────────────────────────────

export async function gatherSourceMaterial(
  supabase: SupabaseClient,
  topicId: string
): Promise<TopicSourceMaterial | null> {
  // Get topic details — include topic_type for format-aware generation
  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .select("id, title, slug, trending_score, platform_count, is_breaking, topic_type")
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
    topicType: (topic.topic_type as TopicType) ?? undefined,
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
  role: Role,
  thinSourceWarning?: string
): Promise<GeneratedContent> {
  const topicType = material.topicType ?? "industry_news";
  const isNonLegacy = topicType !== "industry_news" && featureFlags.USE_V2_PROMPTS;

  // Build prompts — use format-specific schema for non-legacy types (if v2 prompts enabled)
  let systemPrompt = buildExplainerSystemPrompt(role);
  let userPrompt: string;

  if (isNonLegacy) {
    try {
      const format = getFormatDefinition(topicType);
      const jsonSchemaStr = getJsonSchemaString(topicType);

      // Add format-specific instructions to system prompt
      systemPrompt += `\n\n${format.promptInstructions}`;

      // [H4 fix] Sanitize source content to prevent XML tag injection
      const sourcesText = material.items
        .map(
          (item, i) =>
            `=== Source ${i + 1} [${sanitizeForPrompt(item.platform)}]: "${sanitizeForPrompt(item.title)}" ===\nURL: ${item.url}\n${sanitizeForPrompt(item.contentSnippet)}`
        )
        .join("\n\n");

      // Build user prompt with format-specific schema + few-shot examples
      userPrompt = `<topic>${sanitizeForPrompt(material.topicTitle)}</topic>

<source_material>
${sourcesText}
</source_material>

RELEVANCE FILTER: Only use information from sources that is DIRECTLY about "${sanitizeForPrompt(material.topicTitle)}". If a source mentions this topic only in passing or is primarily about something else, IGNORE that source entirely.

Generate a learning brief about this topic. Your response must be valid JSON matching this exact schema:

${jsonSchemaStr}

GOOD example (match this quality and specificity):
${format.fewShotGood}

BAD example (never write like this):
${format.fewShotBad}`;
    } catch (err) {
      // Format not found — fall back to default prompts
      console.warn(`Format lookup failed for ${topicType}, falling back to default: ${err instanceof Error ? err.message : String(err)}`);
      userPrompt = buildExplainerUserPrompt(
        material.topicTitle,
        material.items.map((item) => ({
          title: item.title,
          url: item.url,
          contentSnippet: item.contentSnippet,
          platform: item.platform,
        }))
      );
    }
  } else {
    // Legacy industry_news format
    userPrompt = buildExplainerUserPrompt(
      material.topicTitle,
      material.items.map((item) => ({
        title: item.title,
        url: item.url,
        contentSnippet: item.contentSnippet,
        platform: item.platform,
      }))
    );
  }

  // Add thin-source warning if enrichment was incomplete
  if (thinSourceWarning) {
    systemPrompt += `\n\n${thinSourceWarning}`;
  }

  // Claude API call with retry logic
  const message = await callClaudeWithRetry(() =>
    anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: AbortSignal.timeout(45_000) }
    )
  );

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

  // For non-legacy formats, store the full parsed JSON as contentJson
  const contentJson = isNonLegacy ? (parsed as Record<string, unknown>) : undefined;

  return {
    topicId: material.topicId,
    role,
    tldr: typeof parsed.tldr === "string" ? parsed.tldr : "",
    whatHappened: typeof parsed.what_happened === "string" ? parsed.what_happened : "",
    soWhat: typeof parsed.so_what === "string" ? parsed.so_what : "",
    nowWhat: typeof parsed.now_what === "string" ? parsed.now_what : "",
    sourcesJson: sources,
    qualityScore: null,
    contentJson,
  };
}

// ── Quality check (delegated to quality.ts) ──────────────────────────────

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

  const rawMaterial = await gatherSourceMaterial(supabase, topicId);
  if (!rawMaterial) {
    errors.push(`No source material found for topic ${topicId}`);
    // Reset status back to detected
    await supabase
      .from("topics")
      .update({ status: "detected" })
      .eq("id", topicId);
    return { topicId, contentByRole: {} as Record<Role, GeneratedContent>, youtubeRecs: [], errors };
  }

  // Enrich thin source material with web search results
  const enrichmentResult: EnrichmentResult = await enrichSourceMaterial(rawMaterial);
  const material = enrichmentResult.material;

  // Track enrichment status in DB
  try {
    await supabase
      .from("topics")
      .update({ enrichment_status: enrichmentResult.status })
      .eq("id", topicId);
  } catch (err) {
    console.warn(`Failed to update enrichment_status: ${err instanceof Error ? err.message : String(err)}`);
  }

  // If enrichment was thin or failed, add warning to Claude prompt
  const thinSourceWarning =
    enrichmentResult.status === "thin" || enrichmentResult.status === "failed"
      ? "Source material is limited. Be explicit about what you don't know. Do not pad with generalities."
      : undefined;

  const anthropic = getAnthropic();

  // Generate content for all 4 roles
  // Run general first, then the 3 specialized roles in parallel
  try {
    const generalContent = await generateForRole(anthropic, material, "general", thinSourceWarning);
    contentByRole.general = generalContent;
  } catch (err) {
    errors.push(`general: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Specialized roles in parallel
  const specializedResults = await Promise.allSettled(
    (["developer", "pm", "cto"] as Role[]).map((role) =>
      generateForRole(anthropic, material, role, thinSourceWarning)
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
  let qualityBreakdown: QualityScoreBreakdown | null = null;
  if (contentByRole.general) {
    const topicType = material.topicType ?? "industry_news";
    qualityBreakdown = await checkQualityV2(anthropic, material, contentByRole.general, topicType);
    console.log(
      `[Quality] Topic ${topicId}: total=${qualityBreakdown.total} ` +
      `(factual=${qualityBreakdown.factualGrounding}, action=${qualityBreakdown.actionability}, ` +
      `format=${qualityBreakdown.formatCompliance}, voice=${qualityBreakdown.voiceCompliance})` +
      (qualityBreakdown.issues.length > 0 ? ` issues: ${qualityBreakdown.issues.join("; ")}` : "")
    );
    // Apply total score to all generated content for backward compat
    for (const role of ALL_ROLES) {
      if (contentByRole[role]) {
        contentByRole[role].qualityScore = qualityBreakdown.total;
      }
    }
  }

  // Save to DB
  const topicType = material.topicType ?? "industry_news";
  const isNonLegacy = topicType !== "industry_news";

  for (const role of ALL_ROLES) {
    const content = contentByRole[role];
    if (!content) continue;

    // Validate content_json if present
    if (content.contentJson) {
      validateContentJson(content.contentJson, topicType);
      // Validation logs warnings but doesn't block saving
    }

    // Build the upsert payload
    const upsertPayload: Record<string, unknown> = {
      topic_id: content.topicId,
      role: content.role,
      sources_json: content.sourcesJson,
      quality_score: content.qualityScore,
      generated_by: MODEL,
      generated_at: new Date().toISOString(),
    };

    if (isNonLegacy) {
      // Non-legacy formats: store full JSON in content_json, extract tldr to legacy column
      upsertPayload.content_json = content.contentJson ?? null;
      upsertPayload.tldr = content.tldr; // tldr exists in all formats
      upsertPayload.what_happened = null;
      upsertPayload.so_what = null;
      upsertPayload.now_what = null;
    } else {
      // Legacy industry_news: write to all legacy columns AND content_json
      upsertPayload.tldr = content.tldr;
      upsertPayload.what_happened = content.whatHappened;
      upsertPayload.so_what = content.soWhat;
      upsertPayload.now_what = content.nowWhat;
      // Also write to content_json for forward compatibility
      upsertPayload.content_json = {
        tldr: content.tldr,
        what_happened: content.whatHappened,
        so_what: content.soWhat,
        now_what: content.nowWhat,
      };
    }

    // Validate field lengths to catch malformed Claude responses
    const MAX_FIELD_LENGTHS = { tldr: 500, what_happened: 10000, so_what: 8000, now_what: 5000 };
    if (typeof upsertPayload.tldr === 'string' && upsertPayload.tldr.length > MAX_FIELD_LENGTHS.tldr) {
      console.warn(`[Content] tldr exceeds ${MAX_FIELD_LENGTHS.tldr} chars for topic ${content.topicId} role=${content.role}, truncating`);
      upsertPayload.tldr = (upsertPayload.tldr as string).slice(0, MAX_FIELD_LENGTHS.tldr);
    }
    if (typeof upsertPayload.what_happened === 'string' && upsertPayload.what_happened.length > MAX_FIELD_LENGTHS.what_happened) {
      console.warn(`[Content] what_happened exceeds ${MAX_FIELD_LENGTHS.what_happened} chars, truncating`);
      upsertPayload.what_happened = (upsertPayload.what_happened as string).slice(0, MAX_FIELD_LENGTHS.what_happened);
    }
    if (typeof upsertPayload.so_what === 'string' && upsertPayload.so_what.length > MAX_FIELD_LENGTHS.so_what) {
      console.warn(`[Content] so_what exceeds ${MAX_FIELD_LENGTHS.so_what} chars, truncating`);
      upsertPayload.so_what = (upsertPayload.so_what as string).slice(0, MAX_FIELD_LENGTHS.so_what);
    }
    if (typeof upsertPayload.now_what === 'string' && upsertPayload.now_what.length > MAX_FIELD_LENGTHS.now_what) {
      console.warn(`[Content] now_what exceeds ${MAX_FIELD_LENGTHS.now_what} chars, truncating`);
      upsertPayload.now_what = (upsertPayload.now_what as string).slice(0, MAX_FIELD_LENGTHS.now_what);
    }

    const { error: insertErr } = await supabase
      .from("topic_content")
      .upsert(upsertPayload, { onConflict: "topic_id,role" });

    if (insertErr) {
      errors.push(`DB insert failed for ${role}: ${insertErr.message}`);
    }
  }

  // Reject garbage content — if Claude admits it doesn't have enough info, don't publish
  if (contentByRole.general && isGarbageContent(contentByRole.general.tldr, contentByRole.general.whatHappened)) {
    errors.push(`Content rejected — insufficient substance for topic ${topicId}`);
    await supabase
      .from("topics")
      .update({ status: "detected" })
      .eq("id", topicId);
    return {
      topicId,
      contentByRole: contentByRole as Record<Role, GeneratedContent>,
      youtubeRecs: [],
      errors,
    };
  }

  // Publish topic if general content exists and quality passes
  if (contentByRole.general && qualityBreakdown && isQualityAcceptable(qualityBreakdown)) {
    await supabase
      .from("topics")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", topicId);
  } else if (qualityBreakdown && !isQualityAcceptable(qualityBreakdown)) {
    const reason = qualityBreakdown.total < MIN_QUALITY_SCORE
      ? `total score ${qualityBreakdown.total} below threshold ${MIN_QUALITY_SCORE}`
      : `dimension score below minimum (factual=${qualityBreakdown.factualGrounding}, action=${qualityBreakdown.actionability}, format=${qualityBreakdown.formatCompliance}, voice=${qualityBreakdown.voiceCompliance})`;
    errors.push(`Quality check failed: ${reason} — topic not published`);
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
