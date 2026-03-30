import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/ingest/service-client"; // [M1 fix] use shared client with env validation
import { anonymousSearchLimiter, proSearchLimiter, freeSearchLimiter } from "@/lib/ratelimit";
import { checkOrigin } from "@/lib/csrf";
import {
  buildExplainerSystemPrompt,
  buildExplainerUserPrompt,
  buildOnDemandSystemPrompt,
  buildOnDemandUserPrompt,
} from "@/lib/content/prompts";
import type { Role } from "@/lib/content/types";

// [H2 fix] Validate ANTHROPIC_API_KEY before use
function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

// ── Slug helper ─────────────────────────────────────────────────────────────

function toSlug(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "") // Keep Unicode letters and numbers
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "search"; // Fallback slug if empty after processing
}

// ── Input sanitization ──────────────────────────────────────────────────────

function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 200);
}

// ── IP hashing (privacy-preserving anonymous tracking) ──────────────────────

async function hashIP(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT ?? process.env.CRON_SECRET;
  if (!salt) throw new Error("Missing IP_HASH_SALT (or CRON_SECRET fallback)");
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── URL validation ──────────────────────────────────────────────────────────
// [M3 fix] Only allow http/https URLs in source attributions

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ── YouTube search (for "Go Deeper" recommendations) ────────────────────────

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string } };
    publishedAt: string;
  };
}

async function searchYouTube(query: string, maxResults = 6) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      part: "snippet",
      q: `${query} AI explained`,
      type: "video",
      maxResults: String(maxResults),
      relevanceLanguage: "en",
      order: "relevance",
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data.items as YouTubeSearchItem[]).map((item) => ({
      video_id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      published_at: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch {
    return [];
  }
}

// ── On-demand content generation ────────────────────────────────────────────

const MODEL = "claude-haiku-4-5";
const GROUNDED_MODEL = "claude-sonnet-4-5"; // Use Sonnet when we have source material to work with
const CLAUDE_TIMEOUT_MS = 30_000; // [M6 fix] 30-second timeout on Claude calls

interface GeneratedBrief {
  tldr: string;
  what_happened: string;
  so_what: string;
  now_what: string;
  sources: Array<{ title: string; url: string; platform: string }>;
}

interface SourceItem {
  title: string;
  url: string;
  content_snippet: string;
  platform: string;
}

// ── Search existing source material for relevant content ────────────────────
// Before falling back to pure AI knowledge, check if we already have
// real source data about this topic from our ingestion pipeline.

async function findRelevantSources(
  serviceClient: SupabaseClient,
  query: string
): Promise<SourceItem[]> {
  // Build search terms: split query into meaningful keywords (>3 chars)
  const keywords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (keywords.length === 0) return [];

  // Use Postgres full-text search via ilike on title + content_snippet.
  // Search for items from the last 7 days that match the query keywords.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Search by title — most relevant signal
  const { data: items } = await serviceClient
    .from("source_items")
    .select("title, url, content_snippet, source_id")
    .gte("ingested_at", sevenDaysAgo)
    .or(keywords.map((k) => {
      const escaped = k.replace(/%/g, '\\%').replace(/_/g, '\\_');
      return `title.ilike.%${escaped}%`;
    }).join(","))
    .order("engagement_score", { ascending: false })
    .limit(20);

  if (!items || items.length === 0) return [];

  // Resolve platform for each item
  const sourceIds = [...new Set(items.map((i) => i.source_id))];
  const { data: sources } = await serviceClient
    .from("sources")
    .select("id, platform")
    .in("id", sourceIds);

  const platformMap = new Map(
    (sources ?? []).map((s: { id: string; platform: string }) => [s.id, s.platform])
  );

  // Score relevance: how many query keywords appear in the title?
  // Only keep items where at least half the keywords match.
  const scored = items
    .map((item) => {
      const titleLower = item.title.toLowerCase();
      const matchCount = keywords.filter((k) => titleLower.includes(k)).length;
      return {
        title: item.title,
        url: item.url ?? "",
        content_snippet: item.content_snippet ?? "",
        platform: platformMap.get(item.source_id) ?? "unknown",
        relevance: matchCount / keywords.length,
      };
    })
    .filter((item) => item.relevance >= 0.5)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8); // Top 8 most relevant sources

  return scored;
}

// ── Generate brief — source-grounded when possible, knowledge-based as fallback

async function generateOnDemandBrief(
  serviceClient: SupabaseClient,
  query: string,
  role: Role
): Promise<GeneratedBrief> {
  const anthropic = getAnthropic();

  // First: search our ingested source material for relevant content
  const relevantSources = await findRelevantSources(serviceClient, query);
  const hasSourceMaterial = relevantSources.length >= 2;

  let systemPrompt: string;
  let userPrompt: string;
  let model: string;

  if (hasSourceMaterial) {
    // Source-grounded generation — same prompts as the ingestion pipeline.
    // The AI writes from real, recent source data — not training knowledge.
    systemPrompt = buildExplainerSystemPrompt(role);
    userPrompt = buildExplainerUserPrompt(
      query,
      relevantSources.map((s) => ({
        title: s.title,
        url: s.url,
        contentSnippet: s.content_snippet,
        platform: s.platform,
      }))
    );
    model = GROUNDED_MODEL; // Sonnet for quality when we have real sources
  } else {
    // Fallback: no relevant source material found — use Claude's knowledge
    systemPrompt = buildOnDemandSystemPrompt(role);
    userPrompt = buildOnDemandUserPrompt(query);
    model = MODEL; // Haiku for knowledge-based generation
  }

  // [M6 fix] Add timeout to Claude API call
  const timeoutMs = hasSourceMaterial ? 45_000 : CLAUDE_TIMEOUT_MS;
  const message = await anthropic.messages.create({
    model,
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  }, { signal: AbortSignal.timeout(timeoutMs) });

  const text = message.content[0];
  if (text.type !== "text") throw new Error("Unexpected Claude response");

  const jsonMatch = text.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse generation result");

  const parsed = JSON.parse(jsonMatch[0]);

  // Build sources — from real source material when grounded, from AI when not
  let sources: GeneratedBrief["sources"];
  if (hasSourceMaterial) {
    // Use the actual source URLs we fed in — these are real, verified links
    sources = relevantSources.map((s) => ({
      title: s.title,
      url: s.url,
      platform: s.platform,
    }));
  } else {
    // [M3 fix] Validate source URLs from AI-generated content
    sources = Array.isArray(parsed.sources)
      ? parsed.sources
          .filter((s: Record<string, string>) => s.url && isValidUrl(s.url))
          .map((s: Record<string, string>) => ({
            title: typeof s.title === "string" ? s.title : "",
            url: s.url,
            platform: typeof s.platform === "string" ? s.platform : "",
          }))
      : [];
  }

  return {
    tldr: typeof parsed.tldr === "string" ? parsed.tldr : "",
    what_happened: typeof parsed.what_happened === "string" ? parsed.what_happened : "",
    so_what: typeof parsed.so_what === "string" ? parsed.so_what : "",
    now_what: typeof parsed.now_what === "string" ? parsed.now_what : "",
    sources,
  };
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // [M19 fix] CSRF Origin header check
    if (!checkOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // C3: Limit request body size
    const body = await req.text();
    if (body.length > 1024) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }
    let parsed: { query?: unknown };
    try {
      parsed = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { query } = parsed;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const q = sanitizeQuery(query);
    if (q.length < 2) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const slug = toSlug(q);
    if (!slug) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }
    const serviceClient = createServiceClient();

    // 1. Resolve session first (needed for role-aware cache key)
    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    let userId: string | null = null;
    let userPlan: string | null = null;
    let userRole: Role = "general";

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (user) {
      userId = user.id;

      const { data: profile } = await serviceClient
        .from("profiles")
        .select("plan, role, searches_today, searches_date")
        .eq("id", userId)
        .single();

      if (profile) {
        userPlan = profile.plan;
        userRole = (profile.role as Role) ?? "general";
      }
    }

    // Determine content role for this request
    const contentRole: Role = userPlan === "pro" ? userRole : "general";

    // [M5 fix] Role-aware cache key
    const cacheSlug = contentRole === "general" ? slug : `${slug}:${contentRole}`;

    // 2. Check search cache — cache hits never count against limits
    const { data: cached } = await serviceClient
      .from("search_cache")
      .select("result")
      .eq("query_slug", cacheSlug)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return NextResponse.json(cached.result);
    }

    // 3. Check rate limits (BEFORE expensive operations)
    if (user) {
      if (userPlan === "pro") {
        if (await proSearchLimiter.check(`pro:${userId}`)) {
          return NextResponse.json(
            { error: "Too many requests. Please slow down.", code: "rate_limit" },
            { status: 429, headers: { "Retry-After": "60" } }
          );
        }
      } else {
        // [H3 fix] Burst rate limiter for free users
        if (await freeSearchLimiter.check(`free:${userId}`)) {
          return NextResponse.json(
            { error: "Too many requests. Please slow down.", code: "rate_limit" },
            { status: 429, headers: { "Retry-After": "60" } }
          );
        }
      }
    } else {
      if (await anonymousSearchLimiter.check(`anon:${ip}`)) {
        return NextResponse.json(
          { error: "Too many requests. Please sign up for more searches.", code: "anon_rate_limit" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }

      const ipHash = await hashIP(ip);
      const { data: canSearch } = await serviceClient
        .rpc("check_anonymous_limit", { p_ip_hash: ipHash });

      if (canSearch === false) {
        return NextResponse.json(
          { error: "Daily guest limit reached. Sign up for 10 free searches/day.", code: "guest_limit" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    // [C1 fix] Atomically claim search slot — the RPC checks + increments in one transaction,
    // eliminating the race condition from a separate check-then-act pattern.
    if (userId && userPlan !== "pro") {
      const { data: claimed } = await serviceClient.rpc("claim_search_slot", { p_user_id: userId, p_limit: 10 });
      if (claimed === false) {
        return NextResponse.json(
          { error: "Daily search limit reached. Upgrade to Pro for unlimited searches.", code: "daily_limit" },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    // 4. Check if we already have a published topic matching this query
    const { data: existingTopic } = await serviceClient
      .from("topics")
      .select("id, title, slug")
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();

    // 5. Serve from existing topic content if available
    if (existingTopic) {
      const { data: topicContent } = await serviceClient
        .from("topic_content")
        .select("id, tldr, what_happened, so_what, now_what, sources_json")
        .eq("topic_id", existingTopic.id)
        .eq("role", contentRole)
        .maybeSingle();

      // Fallback to general if specific role content doesn't exist
      const content = topicContent
        ?? (await serviceClient
            .from("topic_content")
            .select("id, tldr, what_happened, so_what, now_what, sources_json")
            .eq("topic_id", existingTopic.id)
            .eq("role", "general")
            .maybeSingle()
          ).data;

      if (content) {
        // [M2 fix] Use topic_content.id (not topic.id) for YouTube recs join
        const { data: ytRecs } = await serviceClient
          .from("youtube_recommendations")
          .select("video_id, title, channel_name, thumbnail_url, duration, reason, position")
          .eq("topic_content_id", content.id)
          .order("position", { ascending: true });

        const result = {
          query: q,
          tldr: content.tldr,
          what_happened: content.what_happened,
          so_what: content.so_what,
          now_what: content.now_what,
          sources: content.sources_json ?? [],
          youtube_recs: (ytRecs ?? []).map((r) => ({
            video_id: r.video_id,
            title: r.title,
            channel: r.channel_name,
            thumbnail: r.thumbnail_url,
            duration: r.duration,
            reason: r.reason,
            url: `https://www.youtube.com/watch?v=${r.video_id}`,
          })),
          source_type: "pre_generated" as const,
        };

        // [M5 fix] Cache with role-aware key
        await serviceClient.from("search_cache").upsert(
          {
            query: q,
            query_slug: cacheSlug,
            result,
            video_count: result.youtube_recs.length,
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: "query_slug" }
        );

        await trackSearch(serviceClient, userId, ip, q, slug, existingTopic.id);
        return NextResponse.json(result);
      }
    }

    // 6. On-demand generation — no pre-generated topic exists
    const brief = await generateOnDemandBrief(serviceClient, q, contentRole);

    // Find YouTube recommendations for "Go Deeper"
    const ytVideos = await searchYouTube(q);

    const result = {
      query: q,
      tldr: brief.tldr,
      what_happened: brief.what_happened,
      so_what: brief.so_what,
      now_what: brief.now_what,
      sources: brief.sources,
      youtube_recs: ytVideos.slice(0, 3).map((v) => ({
        ...v,
        reason: "",
      })),
      source_type: "on_demand" as const,
    };

    // 7. Cache result with role-aware key
    await serviceClient.from("search_cache").upsert(
      {
        query: q,
        query_slug: cacheSlug,
        result,
        video_count: result.youtube_recs.length,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "query_slug" }
    );

    // 8. Track search
    await trackSearch(serviceClient, userId, ip, q, slug, null);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Search] Error: ${msg}`);

    // Classify service-specific outages as 503
    const isServiceOutage =
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("timeout") ||
      msg.includes("503") ||
      msg.includes("overloaded");

    if (isServiceOutage) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again in a moment." },
        { status: 503, headers: { "Retry-After": "30" } }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ── Search tracking helper ──────────────────────────────────────────────────

async function trackSearch(
  serviceClient: SupabaseClient,
  userId: string | null,
  ip: string,
  query: string,
  querySlug: string,
  topicId: string | null
) {
  if (userId) {
    await serviceClient.from("user_searches").insert({
      user_id: userId,
      query,
      query_slug: querySlug,
      topic_id: topicId,
    });

    // Award XP for search_completed (fire-and-forget, don't block response)
    Promise.resolve(
      serviceClient.rpc("award_xp", {
        p_user_id: userId,
        p_event_type: "search_completed",
        p_metadata: { query: query.slice(0, 100) },
      })
    )
      .then(() => {
        // Also try to award first_search (no-op if already awarded)
        return serviceClient.rpc("award_xp", {
          p_user_id: userId,
          p_event_type: "first_search",
          p_metadata: {},
        });
      })
      .catch((err: unknown) => {
        console.warn(
          "[trackSearch] XP award failed:",
          err instanceof Error ? err.message : "unknown"
        );
      });
  } else {
    const ipHash = await hashIP(ip);
    await serviceClient.from("anonymous_searches").insert({
      ip_hash: ipHash,
      query,
    });
  }
}
