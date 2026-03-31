// Types for the content generation pipeline (Step 4)

export type Role = "general" | "developer" | "pm" | "cto";

export type ContentType = "explainer" | "tldr" | "what_changed";

export type TopicType = 'tool_launch' | 'research_paper' | 'industry_news' | 'regulatory' | 'tutorial' | 'opinion_debate';

/** Source material gathered for a topic — from source_items + topic_sources */
export interface TopicSourceMaterial {
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  trendingScore: number;
  platformCount: number;
  isBreaking: boolean;
  topicType?: TopicType;  // Optional — defaults to 'industry_news' if not set
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

/** A single key takeaway card — displayed as visual insight cards */
export interface KeyTakeaway {
  label: "What changed" | "Why it matters" | "What to watch";
  text: string;
}

export type ContentComplexity = "beginner" | "intermediate" | "advanced";

/** Generated content for one topic × one role */
export interface GeneratedContent {
  topicId: string;
  role: Role;
  tldr: string;
  keyTakeaways: KeyTakeaway[];
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
  readingTimeSeconds: number;
  complexity: ContentComplexity;
  sourcesJson: SourceAttribution[];
  qualityScore: number | null;
  contentJson?: Record<string, unknown>;  // Flexible format-specific content
}

export interface SourceAttribution {
  title: string;
  url: string;
  platform: string;
  publishedAt: string;
}

export interface QualityScoreBreakdown {
  factualGrounding: number;  // 0-25
  actionability: number;     // 0-25
  formatCompliance: number;  // 0-25
  voiceCompliance: number;   // 0-25
  total: number;             // 0-100
  issues: string[];
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
