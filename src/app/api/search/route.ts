import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

function getYouTubeApiKey() {
  return process.env.YOUTUBE_API_KEY!;
}

function getTranscriptServiceUrl() {
  return process.env.TRANSCRIPT_SERVICE_URL!;
}

// ── Service role client (bypasses RLS for server-side writes) ───────────────

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Slug helper (mirrors frontend logic) ────────────────────────────────────

function toSlug(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ── Input sanitization ──────────────────────────────────────────────────────

function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[\x00-\x1f\x7f]/g, "") // strip control characters
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .trim()
    .slice(0, 200);
}

// ── IP hashing (privacy-preserving anonymous tracking) ──────────────────────

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + (process.env.CRON_SECRET ?? "topsnip-salt"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Rate limiting ───────────────────────────────────────────────────────────
// In-memory rate limiter as first-line defense (per-isolate on Vercel).
// For stricter cross-instance limits, upgrade to Upstash Redis.
// Combined with DB-backed limits for authenticated users (claim_search_slot).

const ipRequestLog = new Map<string, { count: number; resetAt: number }>();
const ANON_RATE_LIMIT = 5;       // max requests per window for unauthenticated users
const PRO_RATE_LIMIT = 20;       // max requests per window for Pro users (prevents denial-of-wallet)
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = ipRequestLog.get(key);

  if (!entry || now > entry.resetAt) {
    ipRequestLog.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}

// Periodic cleanup to prevent memory leaks (runs in warm instances)
if (typeof globalThis !== "undefined") {
  const cleanupKey = "__ts_rate_limit_cleanup";
  if (!(globalThis as Record<string, unknown>)[cleanupKey]) {
    (globalThis as Record<string, unknown>)[cleanupKey] = true;
    setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of ipRequestLog) {
        if (now > entry.resetAt) ipRequestLog.delete(ip);
      }
    }, 5 * 60_000);
  }
}

// ── YouTube search ─────────────────────────────────────────────────────────

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string } };
    publishedAt: string;
  };
}

async function searchYouTube(query: string, maxResults = 8) {
  const params = new URLSearchParams({
    part: "snippet",
    q: `${query} tutorial`,
    type: "video",
    maxResults: String(maxResults),
    relevanceLanguage: "en",
    videoCaption: "closedCaption",
    key: getYouTubeApiKey(),
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
    { signal: AbortSignal.timeout(10_000) }
  );

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  return (data.items as YouTubeSearchItem[]).map((item) => ({
    video_id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium.url,
    published_at: item.snippet.publishedAt,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

// ── Transcript fetch (Railway Python service) ──────────────────────────────

interface TranscriptResult {
  video_id: string;
  transcript: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  published_at?: string;
}

async function fetchTranscripts(
  videos: Awaited<ReturnType<typeof searchYouTube>>
): Promise<TranscriptResult[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add shared secret if configured (M1: transcript service auth)
  const secret = process.env.TRANSCRIPT_SERVICE_SECRET;
  if (secret) {
    headers["Authorization"] = `Bearer ${secret}`;
  }

  const res = await fetch(`${getTranscriptServiceUrl()}/transcripts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ video_ids: videos.map((v) => v.video_id) }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error("Transcript service unavailable");
  }

  const transcriptMap: Record<string, string> = await res.json();

  return videos
    .filter((v) => transcriptMap[v.video_id])
    .map((v) => ({
      ...v,
      transcript: transcriptMap[v.video_id],
    }));
}

// ── Claude synthesis ───────────────────────────────────────────────────────

const SYNTHESIS_SYSTEM_PROMPT = `You are Topsnip's synthesis engine. You distill multiple YouTube video transcripts into a structured, actionable learning summary.

Your output must be valid JSON matching this exact schema:
{
  "tldr": "2-3 sentence direct answer to the topic. No fluff.",
  "key_points": ["4-6 prose points. Each starts with a bolded insight (use **bold**). Real substance, no padding."],
  "key_concepts": ["6-10 key terms or concepts from the topic. Short labels only."],
  "steps": ["Numbered steps ONLY for how-to/tutorial queries. Omit this field for concept queries."],
  "synthesized_from": <number of videos used>
}

Rules:
- Write like a knowledgeable friend explaining, not a corporate AI
- Be specific — use real tool names, version info, concrete examples from the transcripts
- Never hallucinate. Only include information that appears in the transcripts
- Keep TL;DR under 60 words
- Each key point should be 1-3 sentences — dense, not padded
- Steps are only for "how to" / "build" / "setup" queries`;

async function synthesize(query: string, transcripts: TranscriptResult[]) {
  const transcriptText = transcripts
    .map(
      (t, i) =>
        `=== Video ${i + 1}: "${t.title}" by ${t.channel} ===\n${t.transcript.slice(0, 12000)}`
    )
    .join("\n\n");

  // Wrap user input in XML tags to defend against prompt injection (M5)
  const userMessage = `<user_query>${query}</user_query>\n\nTranscripts from ${transcripts.length} YouTube videos:\n\n${transcriptText}\n\nSynthesize these into the JSON schema.`;

  const message = await getAnthropic().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2000,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected Claude response");

  // Extract JSON from response (Claude sometimes wraps in code blocks)
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse synthesis result");

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields exist (IMP-1)
    return {
      tldr: typeof parsed.tldr === "string" ? parsed.tldr : "",
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      key_concepts: Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : undefined,
      synthesized_from: typeof parsed.synthesized_from === "number" ? parsed.synthesized_from : transcripts.length,
    };
  } catch {
    throw new Error("Synthesis returned invalid JSON");
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // C3: Limit request body size to prevent OOM from oversized payloads
    const body = await req.text();
    if (body.length > 1024) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }
    const { query } = JSON.parse(body);

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

    // 1. Check search cache — cache hits never count against limits
    const { data: cached } = await serviceClient
      .from("search_cache")
      .select("result")
      .eq("query_slug", slug)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return NextResponse.json(cached.result);
    }

    // 2. Resolve session and check limits
    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser(); // H3: use getUser() not getSession()

    let userId: string | null = null;
    let userPlan: string | null = null;

    // Resolve IP for rate limiting (used for both anon and as fallback for auth)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (user) {
      userId = user.id;

      const { data: profile } = await serviceClient
        .from("profiles")
        .select("plan, searches_today, searches_date")
        .eq("id", userId)
        .single();

      if (profile) {
        userPlan = profile.plan;

        if (profile.plan === "pro") {
          // Pro users: per-minute rate limit to prevent denial-of-wallet
          if (checkRateLimit(`pro:${userId}`, PRO_RATE_LIMIT)) {
            return NextResponse.json(
              { error: "Too many requests. Please slow down.", code: "rate_limit" },
              { status: 429 }
            );
          }
        } else {
          // Free users: atomic daily limit (10/day)
          const { data: claimed, error: claimErr } = await serviceClient
            .rpc("claim_search_slot", { p_user_id: userId, p_limit: 10 });

          if (claimErr || !claimed) {
            return NextResponse.json(
              { error: "Daily limit reached", code: "free_limit" },
              { status: 429 }
            );
          }
        }
      }
    } else {
      // Anonymous users: in-memory IP rate limit + DB-backed daily limit
      if (checkRateLimit(`anon:${ip}`, ANON_RATE_LIMIT)) {
        return NextResponse.json(
          { error: "Too many requests. Please sign up for more searches.", code: "rate_limit" },
          { status: 429 }
        );
      }

      // Server-side daily limit using anonymous_searches table (3/day per IP)
      const ipHash = await hashIP(ip);
      const { data: canSearch } = await serviceClient
        .rpc("check_anonymous_limit", { p_ip_hash: ipHash });

      if (canSearch === false) {
        return NextResponse.json(
          { error: "Daily guest limit reached. Sign up for 10 free searches/day.", code: "guest_limit" },
          { status: 429 }
        );
      }
    }

    // 3. Search YouTube
    const videos = await searchYouTube(q);
    if (videos.length === 0) {
      return NextResponse.json(
        { error: "No videos found for this topic" },
        { status: 404 }
      );
    }

    // 4. Fetch transcripts
    const transcripts = await fetchTranscripts(videos);
    if (transcripts.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch transcripts for these videos" },
        { status: 500 }
      );
    }

    // 5. Synthesize with Claude
    const synthesis = await synthesize(q, transcripts);

    const result = {
      ...synthesis,
      query: q,
      synthesized_from: transcripts.length,
      sources: transcripts.map(({ transcript: _t, ...rest }) => rest),
    };

    // 6. Save to search cache — upsert to handle expired duplicates (M4)
    await serviceClient.from("search_cache").upsert(
      {
        query: q,
        query_slug: slug,
        result,
        video_count: transcripts.length,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "query_slug" }
    );

    // 7. Post-synthesis writes
    if (userId) {
      // Save to user search history
      await serviceClient.from("user_searches").insert({
        user_id: userId,
        query: q,
        query_slug: slug,
        result,
      });
      // Note: search counter was already incremented atomically in step 2
    } else {
      // Track anonymous search server-side (for daily limit enforcement)
      const ipHash = await hashIP(ip);
      await serviceClient.from("anonymous_searches").insert({
        ip_hash: ipHash,
        query: q,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    // M8: Sanitize error logging — don't leak API keys or full error objects
    console.error(
      "[/api/search]",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
