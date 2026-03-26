// YouTube recommendation finder for "Go Deeper" section
// Uses YouTube Data API v3 to find relevant videos, then Claude to pick the best 2-3.

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { YouTubeRecommendation } from "./types";
import { buildYouTubeRecPrompt } from "./prompts";
import { incrementYoutubeQuota } from "../ratelimit";

const MODEL = "claude-haiku-4-5";

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string } };
    publishedAt: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

/**
 * Search YouTube for videos about a topic and use Claude to pick the best 2-3.
 * Saves recommendations to youtube_recommendations table.
 */
export async function findAndSaveYouTubeRecs(
  supabase: SupabaseClient,
  topicId: string,
  topicTitle: string
): Promise<{ recs: YouTubeRecommendation[]; error?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { recs: [], error: "YOUTUBE_API_KEY not configured" };
  }

  try {
    const allowed = await incrementYoutubeQuota(101); // 100 for search, 1 for details
    if (!allowed) {
      return { recs: [], error: "YouTube API daily quota exhausted" };
    }

    // 1. Search YouTube for the topic
    const searchParams = new URLSearchParams({
      part: "snippet",
      q: `${topicTitle} AI explained`,
      type: "video",
      maxResults: "8",
      relevanceLanguage: "en",
      order: "relevance",
      key: apiKey,
    });

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!searchRes.ok) {
      return { recs: [], error: `YouTube API error: ${searchRes.status}` };
    }

    const searchData = await searchRes.json();
    const videos = (searchData.items as YouTubeSearchItem[]) ?? [];

    if (videos.length === 0) {
      return { recs: [], error: "No YouTube videos found" };
    }

    // 2. Get video durations via videos endpoint
    const videoIds = videos.map((v) => v.id.videoId).join(",");
    const detailParams = new URLSearchParams({
      part: "contentDetails",
      id: videoIds,
      key: apiKey,
    });

    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailParams}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    const durationMap = new Map<string, string>();
    if (detailRes.ok) {
      const detailData = await detailRes.json();
      for (const item of detailData.items ?? []) {
        durationMap.set(item.id, item.contentDetails?.duration ?? "");
      }
    }

    // 3. Use Claude to pick the best 2-3
    // [H1 fix] Validate API key before use
    const apiKeyAnthropic = process.env.ANTHROPIC_API_KEY;
    if (!apiKeyAnthropic) {
      return { recs: [], error: "ANTHROPIC_API_KEY not configured" };
    }
    const anthropic = new Anthropic({ apiKey: apiKeyAnthropic });

    const candidateVideos = videos.map((v) => ({
      title: v.snippet.title,
      channelName: v.snippet.channelTitle,
      videoId: v.id.videoId,
    }));

    // [M6 fix] Add timeout to Claude API call
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: buildYouTubeRecPrompt(topicTitle, candidateVideos),
        },
      ],
    }, { signal: AbortSignal.timeout(30_000) });

    const text = message.content[0];
    if (text.type !== "text") {
      return { recs: [], error: "Unexpected Claude response" };
    }

    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { recs: [], error: "Failed to parse recommendation JSON" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const pickedRecs: Array<{ videoId: string; reason: string }> =
      Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

    // 4. Build full recommendation objects
    const videoLookup = new Map(
      videos.map((v) => [v.id.videoId, v])
    );

    const recs: YouTubeRecommendation[] = pickedRecs
      .filter((r) => videoLookup.has(r.videoId))
      .map((r, idx) => {
        const v = videoLookup.get(r.videoId)!;
        return {
          videoId: r.videoId,
          title: v.snippet.title,
          channelName: v.snippet.channelTitle,
          thumbnailUrl: v.snippet.thumbnails.medium.url,
          duration: durationMap.get(r.videoId) ?? "",
          reason: r.reason,
          position: idx + 1,
        };
      });

    // 5. Save to DB — need topic_content_id for the general role
    const { data: generalContent } = await supabase
      .from("topic_content")
      .select("id")
      .eq("topic_id", topicId)
      .eq("role", "general")
      .maybeSingle();

    if (generalContent) {
      // Delete old recs for this content
      await supabase
        .from("youtube_recommendations")
        .delete()
        .eq("topic_content_id", generalContent.id);

      // Insert new recs
      const rows = recs.map((rec) => ({
        topic_content_id: generalContent.id,
        video_id: rec.videoId,
        title: rec.title,
        channel_name: rec.channelName,
        thumbnail_url: rec.thumbnailUrl,
        duration: rec.duration,
        reason: rec.reason,
        position: rec.position,
      }));

      if (rows.length > 0) {
        await supabase.from("youtube_recommendations").insert(rows);
      }
    }

    return { recs };
  } catch (err) {
    return {
      recs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
