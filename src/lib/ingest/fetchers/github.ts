import type { FetchResult, RawSourceItem } from "../types";

// AI-related GitHub repos to track releases
const TRACKED_REPOS = [
  "openai/openai-python",
  "anthropics/anthropic-sdk-python",
  "langchain-ai/langchain",
  "huggingface/transformers",
  "ggerganov/llama.cpp",
  "ollama/ollama",
  "microsoft/autogen",
  "crewAIInc/crewAI",
  "vllm-project/vllm",
  "lm-sys/FastChat",
  "meta-llama/llama",
  "google/gemma.cpp",
  "AUTOMATIC1111/stable-diffusion-webui",
  "comfyanonymous/ComfyUI",
  "modelcontextprotocol/servers",
];

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

/**
 * Fetch recent releases from tracked AI GitHub repos.
 * Uses the public API (no auth) — 60 req/hour limit.
 * With auth token: 5,000 req/hour.
 */
export async function fetchGitHub(sourceId: string): Promise<FetchResult> {
  try {
    const allItems: RawSourceItem[] = [];
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "TopSnip/1.0",
    };

    // Use GITHUB_TOKEN if available for higher rate limits
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    for (const repo of TRACKED_REPOS) {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${repo}/releases?per_page=3`,
          { signal: AbortSignal.timeout(8_000), headers }
        );

        if (!res.ok) {
          if (res.status === 403) {
            console.warn("GitHub rate limit hit, stopping fetcher");
            break;
          }
          continue; // Skip this repo
        }

        const releases: GitHubRelease[] = await res.json();

        for (const release of releases) {
          const publishedAt = new Date(release.published_at);
          if (publishedAt < cutoff) continue;

          allItems.push({
            externalId: `gh-${release.id}`,
            sourceId,
            title: `${repo.split("/")[1]}: ${release.name || release.tag_name}`,
            url: release.html_url,
            contentSnippet: (release.body || "").replace(/[#*`]/g, "").slice(0, 500),
            engagementScore: 0, // Could fetch stargazers but costs quota
            publishedAt: release.published_at,
          });
        }

        // Small delay to respect rate limits
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        // Individual repo failure shouldn't stop the whole fetcher
        continue;
      }
    }

    return {
      sourceId,
      items: allItems,
      health: allItems.length > 0 ? "healthy" : "degraded",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sourceId,
      items: [],
      health: "down",
      error: `GitHub fetch failed: ${msg}`,
    };
  }
}
