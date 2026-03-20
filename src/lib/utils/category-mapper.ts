const CATEGORY_KEYWORDS: Record<string, string[]> = {
  models: ["claude", "gpt", "gemini", "llama", "model", "release", "benchmark"],
  tools: ["cursor", "code", "ide", "api", "sdk", "cli", "framework"],
  research: ["paper", "arxiv", "attention", "training", "architecture"],
  "open-source": ["open source", "huggingface", "ollama", "weights", "gguf"],
  industry: ["regulation", "funding", "acquisition", "startup", "company"],
  ethics: ["safety", "alignment", "bias", "privacy", "regulation"],
};

export function mapTopicToCategory(title: string, tags?: string[]): string {
  const normalized = [title, ...(tags ?? [])].join(" ").toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category;
      }
    }
  }

  return "models";
}

export { CATEGORY_KEYWORDS };
