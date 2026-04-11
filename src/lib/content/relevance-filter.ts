// src/lib/content/relevance-filter.ts
// Fast keyword-based AI relevance filter.
// Runs before content generation to reject non-AI topics.

/** Keywords that indicate genuine AI content */
const AI_POSITIVE_KEYWORDS = [
  // Models & companies
  'openai', 'anthropic', 'claude', 'gpt', 'gemini', 'llama', 'mistral', 'deepseek',
  'meta ai', 'google ai', 'microsoft ai', 'hugging face', 'huggingface',
  'stability ai', 'midjourney', 'dall-e', 'dalle', 'sora', 'copilot',
  'perplexity', 'cohere', 'groq', 'nvidia ai', 'tesla ai',
  // Technical terms
  'large language model', 'llm', 'transformer', 'diffusion model', 'neural network',
  'machine learning', 'deep learning', 'reinforcement learning', 'fine-tuning', 'fine tuning',
  'rag', 'retrieval augmented', 'vector database', 'embedding', 'tokenizer',
  'attention mechanism', 'prompt engineering', 'chain of thought', 'agent', 'agentic',
  'multimodal', 'vision model', 'text-to-image', 'text-to-video', 'text-to-speech',
  'natural language processing', 'nlp', 'computer vision', 'generative ai', 'gen ai',
  // Tools & frameworks
  'langchain', 'llamaindex', 'autogen', 'crewai', 'semantic kernel',
  'pytorch', 'tensorflow', 'jax', 'onnx', 'mlflow',
  'cursor', 'windsurf', 'v0', 'bolt', 'replit ai',
  'chatbot', 'ai assistant', 'ai agent', 'ai model', 'ai tool',
  // Concepts
  'artificial intelligence', 'ai safety', 'ai alignment', 'ai regulation',
  'ai ethics', 'hallucination', 'benchmark', 'inference', 'training data',
  'open source model', 'open-source model', 'foundation model', 'frontier model',
  'ai startup', 'ai funding', 'ai research', 'arxiv', 'ai paper',
  'mcp', 'model context protocol', 'function calling', 'tool use',
];

/** Keywords that indicate NON-AI content even if tagged with #ai */
const AI_NEGATIVE_KEYWORDS = [
  'allah', 'quran', 'bible', 'church', 'mosque', 'temple', 'prayer',
  'cricket', 'football', 'soccer', 'basketball', 'nfl', 'nba',
  'bollywood', 'hollywood', 'movie review', 'film review',
  'recipe', 'cooking', 'kitchen',
  'mercedes', 'bmw', 'audi', 'toyota', 'honda', 'car review', 'test drive',
  'forex', 'crypto trading', 'bitcoin price', 'stock market tip',
  'weight loss', 'diet plan', 'workout routine',
  'makeup tutorial', 'skincare', 'fashion haul',
];

/**
 * Check if a topic is genuinely about AI/ML/tech.
 * Returns true if the topic should be processed, false if it should be skipped.
 */
export function isAIRelevant(title: string, sourceSnippets: string[]): boolean {
  const text = `${title} ${sourceSnippets.join(' ')}`.toLowerCase();

  // Check for negative keywords first — instant reject
  for (const neg of AI_NEGATIVE_KEYWORDS) {
    if (text.includes(neg)) {
      // Exception: if it also has strong AI positive signals, allow it
      // (e.g., "Mercedes uses AI for autonomous driving")
      const positiveCount = AI_POSITIVE_KEYWORDS.filter(pos => text.includes(pos)).length;
      if (positiveCount < 2) {
        console.log(`[relevance] Rejected "${title}" — matched negative keyword: "${neg}"`);
        return false;
      }
    }
  }

  // Check for positive keywords — need at least 1 match
  const positiveMatches = AI_POSITIVE_KEYWORDS.filter(pos => text.includes(pos));
  if (positiveMatches.length === 0) {
    console.log(`[relevance] Rejected "${title}" — no AI keywords found`);
    return false;
  }

  return true;
}
