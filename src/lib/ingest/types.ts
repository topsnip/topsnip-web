// Types for the source ingestion pipeline

export type Platform = "hn" | "reddit" | "rss" | "youtube" | "arxiv" | "github";

export type SourceHealth = "healthy" | "degraded" | "down";

export type TopicStatus = "detected" | "generating" | "published" | "archived";

/** Raw item fetched from a source platform */
export interface RawSourceItem {
  externalId: string;
  sourceId: string;
  title: string;
  url: string;
  contentSnippet: string;
  engagementScore: number;
  publishedAt: string; // ISO 8601
}

/** A source registered in the database */
export interface Source {
  id: string;
  name: string;
  platform: Platform;
  url: string;
  check_interval_min: number;
  last_checked_at: string | null;
  is_active: boolean;
  health_status: SourceHealth;
}

/** Result from a fetcher — items + health status */
export interface FetchResult {
  sourceId: string;
  items: RawSourceItem[];
  health: SourceHealth;
  error?: string;
}

/** Cross-platform topic candidate after dedup + scoring */
export interface TopicCandidate {
  title: string;
  slug: string;
  sourceItemIds: string[];
  platforms: Platform[];
  trendingScore: number;
  platformCount: number;
  firstDetectedAt: string;
}

/** Ingestion run summary */
export interface IngestRunResult {
  fetchedSources: number;
  newItems: number;
  newTopics: number;
  errors: string[];
  durationMs: number;
}
