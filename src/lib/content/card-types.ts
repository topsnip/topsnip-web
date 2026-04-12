// src/lib/content/card-types.ts
// v3 card + pipeline types

export interface SourceAttribution {
  title: string;
  url: string;
  platform: string;
  publishedAt: string;
}

/** v3 Card — InShorts-style feed card */
export interface TopicCard {
  headline: string;
  summary: string;
  key_fact: string | null;
  category_tag: string;
}

/** v3 Learn Brief — visual deep-dive content */
export interface LearnBrief {
  what_it_is: string;
  why_it_matters: string;
  key_details: string[];
  illustration_description: string;
  sources: SourceAttribution[];
  [key: string]: unknown;
}

/** v3 Generation result for a single topic */
export interface CardGenerationResult {
  card: TopicCard;
  learn_brief: LearnBrief;
  illustration_prompt: string;
  image_url: string | null;
  quality_score: number;
}

/** YouTube recommendation for "Go Deeper" section */
export interface YouTubeRecommendation {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  duration: string;
  reason: string;
  position: number;
}

/** Result of a full content generation run */
export interface ContentGenerationRunResult {
  topicsProcessed: number;
  contentGenerated: number;
  topicsPublished: number;
  isQuietDay: boolean;
  errors: string[];
  durationMs: number;
}
