// Types for the content generation pipeline (Step 4)

export type Role = "general" | "developer" | "pm" | "cto";

export type ContentType = "explainer" | "tldr" | "what_changed";

/** Source material gathered for a topic — from source_items + topic_sources */
export interface TopicSourceMaterial {
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  trendingScore: number;
  platformCount: number;
  isBreaking: boolean;
  items: SourceItemSummary[];
}

export interface SourceItemSummary {
  id: string;
  title: string;
  url: string;
  contentSnippet: string;
  platform: string;
  engagementScore: number;
  publishedAt: string;
}

/** Generated content for one topic × one role */
export interface GeneratedContent {
  topicId: string;
  role: Role;
  tldr: string;
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
  sourcesJson: SourceAttribution[];
  qualityScore: number | null;
}

export interface SourceAttribution {
  title: string;
  url: string;
  platform: string;
  publishedAt: string;
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

/** Result of generating content for a single topic */
export interface TopicGenerationResult {
  topicId: string;
  contentByRole: Record<Role, GeneratedContent>;
  youtubeRecs: YouTubeRecommendation[];
  errors: string[];
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
