/**
 * Known AI entities for story clustering.
 *
 * Used by the story clustering engine to extract entity mentions from source items
 * and compute Jaccard similarity for grouping related stories.
 *
 * Update manually when new major players emerge.
 */

export interface AIEntity {
  name: string;
  aliases: string[];
  category: "company" | "product" | "person";
}

/**
 * Map of ~200 known AI companies, products, and people.
 * Keyed by canonical lowercase name for fast lookup.
 * Sorted by category: companies, then products, then people.
 */
export const AI_ENTITIES: AIEntity[] = [
  // ── Companies ──────────────────────────────────────────────────────────────
  { name: "OpenAI", aliases: ["open ai", "openai inc"], category: "company" },
  { name: "Anthropic", aliases: ["anthropic ai"], category: "company" },
  { name: "Google DeepMind", aliases: ["deepmind", "google ai"], category: "company" },
  { name: "Meta AI", aliases: ["meta ai research", "fair", "facebook ai"], category: "company" },
  { name: "Microsoft", aliases: ["microsoft ai", "msft"], category: "company" },
  { name: "Mistral AI", aliases: ["mistral", "mistralai"], category: "company" },
  { name: "Stability AI", aliases: ["stability", "stabilityai"], category: "company" },
  { name: "Cohere", aliases: ["cohere ai"], category: "company" },
  { name: "Hugging Face", aliases: ["huggingface", "hf"], category: "company" },
  { name: "xAI", aliases: ["x.ai", "elon ai"], category: "company" },
  { name: "Amazon", aliases: ["amazon ai", "aws ai", "amazon web services"], category: "company" },
  { name: "Apple", aliases: ["apple ai", "apple intelligence"], category: "company" },
  { name: "NVIDIA", aliases: ["nvidia ai", "nvda"], category: "company" },
  { name: "AMD", aliases: ["amd ai"], category: "company" },
  { name: "Intel", aliases: ["intel ai", "intel labs"], category: "company" },
  { name: "IBM", aliases: ["ibm ai", "ibm research"], category: "company" },
  { name: "Salesforce", aliases: ["salesforce ai", "salesforce research"], category: "company" },
  { name: "Adobe", aliases: ["adobe ai", "adobe firefly team"], category: "company" },
  { name: "Baidu", aliases: ["baidu ai"], category: "company" },
  { name: "Alibaba", aliases: ["alibaba ai", "alibaba cloud ai", "damo academy"], category: "company" },
  { name: "Tencent", aliases: ["tencent ai"], category: "company" },
  { name: "ByteDance", aliases: ["bytedance ai"], category: "company" },
  { name: "Samsung", aliases: ["samsung ai"], category: "company" },
  { name: "Databricks", aliases: ["databricks ai", "mosaic ml", "mosaicml"], category: "company" },
  { name: "Scale AI", aliases: ["scale", "scaleai"], category: "company" },
  { name: "Runway", aliases: ["runway ml", "runwayml"], category: "company" },
  { name: "Inflection AI", aliases: ["inflection"], category: "company" },
  { name: "Adept AI", aliases: ["adept"], category: "company" },
  { name: "Character AI", aliases: ["character.ai", "characterai"], category: "company" },
  { name: "Jasper AI", aliases: ["jasper", "jasperai"], category: "company" },
  { name: "Writer", aliases: ["writer ai", "writer.com"], category: "company" },
  { name: "Anyscale", aliases: ["anyscale ai"], category: "company" },
  { name: "Together AI", aliases: ["together", "togetherai", "together.ai"], category: "company" },
  { name: "Weights & Biases", aliases: ["wandb", "w&b"], category: "company" },
  { name: "Replicate", aliases: ["replicate.com"], category: "company" },
  { name: "Lightning AI", aliases: ["lightning.ai", "pytorch lightning"], category: "company" },
  { name: "DeepL", aliases: ["deepl translator"], category: "company" },
  { name: "Aleph Alpha", aliases: ["aleph-alpha"], category: "company" },
  { name: "AI21 Labs", aliases: ["ai21", "ai21labs"], category: "company" },
  { name: "Moonshot AI", aliases: ["moonshot", "kimi ai"], category: "company" },
  { name: "Zhipu AI", aliases: ["zhipu", "glm"], category: "company" },
  { name: "01.AI", aliases: ["01ai", "yi ai"], category: "company" },
  { name: "Midjourney Inc", aliases: ["midjourney team"], category: "company" },
  { name: "Pika Labs", aliases: ["pika"], category: "company" },
  { name: "ElevenLabs", aliases: ["eleven labs", "11labs"], category: "company" },
  { name: "Suno AI", aliases: ["suno"], category: "company" },
  { name: "Udio", aliases: ["udio ai"], category: "company" },
  { name: "Perplexity AI", aliases: ["perplexity inc"], category: "company" },
  { name: "Poolside AI", aliases: ["poolside"], category: "company" },
  { name: "Reka AI", aliases: ["reka"], category: "company" },
  { name: "Contextual AI", aliases: ["contextual"], category: "company" },
  { name: "Essential AI", aliases: ["essential"], category: "company" },
  { name: "Imbue", aliases: ["imbue ai", "generally intelligent"], category: "company" },
  { name: "Sakana AI", aliases: ["sakana"], category: "company" },
  { name: "Ideogram", aliases: ["ideogram ai"], category: "company" },
  { name: "Black Forest Labs", aliases: ["bfl", "black forest"], category: "company" },
  { name: "Luma AI", aliases: ["luma"], category: "company" },
  { name: "Glean", aliases: ["glean ai", "glean.com"], category: "company" },
  { name: "Harvey AI", aliases: ["harvey"], category: "company" },
  { name: "Typeface", aliases: ["typeface ai"], category: "company" },
  { name: "Cognition AI", aliases: ["cognition", "cognition labs"], category: "company" },
  { name: "Magic AI", aliases: ["magic.dev"], category: "company" },
  { name: "Unstructured", aliases: ["unstructured.io"], category: "company" },
  { name: "LangChain", aliases: ["langchain ai", "langchain inc"], category: "company" },
  { name: "LlamaIndex", aliases: ["llamaindex ai", "gpt index"], category: "company" },
  { name: "Pinecone", aliases: ["pinecone.io"], category: "company" },
  { name: "Weaviate", aliases: ["weaviate.io"], category: "company" },
  { name: "Chroma", aliases: ["chroma db", "chromadb"], category: "company" },
  { name: "Modal", aliases: ["modal.com", "modal labs"], category: "company" },
  { name: "Fireworks AI", aliases: ["fireworks", "fireworks.ai"], category: "company" },
  { name: "Groq", aliases: ["groq inc", "groq ai"], category: "company" },
  { name: "Cerebras", aliases: ["cerebras systems"], category: "company" },
  { name: "SambaNova", aliases: ["sambanova systems"], category: "company" },
  { name: "D-ID", aliases: ["d-id ai"], category: "company" },
  { name: "Synthesia", aliases: ["synthesia ai"], category: "company" },
  { name: "HeyGen", aliases: ["heygen ai"], category: "company" },
  { name: "Replit", aliases: ["replit ai"], category: "company" },
  { name: "Cursor", aliases: ["cursor ai", "cursor.sh"], category: "company" },

  // ── Products ───────────────────────────────────────────────────────────────
  { name: "ChatGPT", aliases: ["chat gpt", "chatgpt-4", "chatgpt plus"], category: "product" },
  { name: "GPT-4", aliases: ["gpt4", "gpt-4o", "gpt-4 turbo", "gpt4o"], category: "product" },
  { name: "GPT-5", aliases: ["gpt5"], category: "product" },
  { name: "GPT-3.5", aliases: ["gpt-3.5-turbo", "gpt35"], category: "product" },
  { name: "DALL-E", aliases: ["dall-e 3", "dalle", "dall-e 2", "dalle3"], category: "product" },
  { name: "Sora", aliases: ["openai sora"], category: "product" },
  { name: "Whisper", aliases: ["openai whisper"], category: "product" },
  { name: "Claude", aliases: ["claude 3", "claude 3.5", "claude opus", "claude sonnet", "claude haiku"], category: "product" },
  { name: "Gemini", aliases: ["google gemini", "gemini pro", "gemini ultra", "gemini nano", "gemini 2"], category: "product" },
  { name: "Gemma", aliases: ["google gemma", "gemma 2"], category: "product" },
  { name: "PaLM", aliases: ["palm 2", "palm api"], category: "product" },
  { name: "Llama", aliases: ["llama 2", "llama 3", "llama 3.1", "meta llama", "codellama", "code llama"], category: "product" },
  { name: "Mistral Large", aliases: ["mistral-large", "mistral large 2"], category: "product" },
  { name: "Mixtral", aliases: ["mixtral 8x7b", "mixtral 8x22b"], category: "product" },
  { name: "Midjourney", aliases: ["mj", "midjourney v6", "midjourney v7"], category: "product" },
  { name: "Stable Diffusion", aliases: ["sd", "sdxl", "stable diffusion xl", "sd3", "stable diffusion 3"], category: "product" },
  { name: "FLUX", aliases: ["flux ai", "flux.1", "flux pro"], category: "product" },
  { name: "Copilot", aliases: ["github copilot", "microsoft copilot", "copilot pro", "m365 copilot"], category: "product" },
  { name: "Perplexity", aliases: ["perplexity ai", "perplexity pro"], category: "product" },
  { name: "Grok", aliases: ["grok ai", "grok 2", "grok 3"], category: "product" },
  { name: "Pi", aliases: ["pi ai", "inflection pi"], category: "product" },
  { name: "Cohere Command", aliases: ["command r", "command r+", "command-r"], category: "product" },
  { name: "Yi", aliases: ["yi-34b", "yi model"], category: "product" },
  { name: "Qwen", aliases: ["qwen 2", "qwen-72b", "qwen vl"], category: "product" },
  { name: "DeepSeek", aliases: ["deepseek coder", "deepseek v2", "deepseek v3", "deepseek r1"], category: "product" },
  { name: "Phi", aliases: ["phi-2", "phi-3", "microsoft phi"], category: "product" },
  { name: "Orca", aliases: ["orca 2", "microsoft orca"], category: "product" },
  { name: "Devin", aliases: ["devin ai", "cognition devin"], category: "product" },
  { name: "AlphaFold", aliases: ["alphafold 2", "alphafold 3"], category: "product" },
  { name: "AlphaCode", aliases: ["alphacode 2"], category: "product" },
  { name: "Firefly", aliases: ["adobe firefly", "firefly ai"], category: "product" },
  { name: "Imagen", aliases: ["google imagen", "imagen 2", "imagen 3"], category: "product" },
  { name: "Veo", aliases: ["google veo", "veo 2"], category: "product" },
  { name: "Kling", aliases: ["kling ai", "kuaishou kling"], category: "product" },
  { name: "Bedrock", aliases: ["amazon bedrock", "aws bedrock"], category: "product" },
  { name: "SageMaker", aliases: ["amazon sagemaker", "aws sagemaker"], category: "product" },
  { name: "Titan", aliases: ["amazon titan"], category: "product" },
  { name: "watsonx", aliases: ["ibm watsonx", "watson ai"], category: "product" },
  { name: "LangGraph", aliases: ["langgraph"], category: "product" },
  { name: "AutoGPT", aliases: ["auto-gpt", "autogpt"], category: "product" },
  { name: "CrewAI", aliases: ["crew ai", "crewai"], category: "product" },
  { name: "Ollama", aliases: ["ollama ai"], category: "product" },
  { name: "LM Studio", aliases: ["lm-studio", "lmstudio"], category: "product" },
  { name: "Hugging Chat", aliases: ["huggingchat"], category: "product" },
  { name: "NotebookLM", aliases: ["notebook lm", "google notebooklm"], category: "product" },
  { name: "Operator", aliases: ["openai operator"], category: "product" },
  { name: "Computer Use", aliases: ["claude computer use", "anthropic computer use"], category: "product" },
  { name: "Canvas", aliases: ["chatgpt canvas", "openai canvas"], category: "product" },
  { name: "Artifacts", aliases: ["claude artifacts", "anthropic artifacts"], category: "product" },
  { name: "Windsurf", aliases: ["codeium windsurf"], category: "product" },

  // ── People ─────────────────────────────────────────────────────────────────
  { name: "Sam Altman", aliases: ["altman"], category: "person" },
  { name: "Dario Amodei", aliases: ["amodei"], category: "person" },
  { name: "Daniela Amodei", aliases: [], category: "person" },
  { name: "Demis Hassabis", aliases: ["hassabis"], category: "person" },
  { name: "Yann LeCun", aliases: ["lecun", "yann le cun"], category: "person" },
  { name: "Andrej Karpathy", aliases: ["karpathy"], category: "person" },
  { name: "Ilya Sutskever", aliases: ["sutskever", "ilya"], category: "person" },
  { name: "Geoffrey Hinton", aliases: ["hinton", "geoff hinton"], category: "person" },
  { name: "Yoshua Bengio", aliases: ["bengio"], category: "person" },
  { name: "Andrew Ng", aliases: ["ng", "andrew ng"], category: "person" },
  { name: "Fei-Fei Li", aliases: ["fei-fei", "feifei li"], category: "person" },
  { name: "Jensen Huang", aliases: ["jensen", "huang"], category: "person" },
  { name: "Satya Nadella", aliases: ["nadella"], category: "person" },
  { name: "Sundar Pichai", aliases: ["pichai"], category: "person" },
  { name: "Mark Zuckerberg", aliases: ["zuckerberg", "zuck"], category: "person" },
  { name: "Elon Musk", aliases: ["musk"], category: "person" },
  { name: "Tim Cook", aliases: [], category: "person" },
  { name: "Greg Brockman", aliases: ["brockman"], category: "person" },
  { name: "Mira Murati", aliases: ["murati"], category: "person" },
  { name: "Jan Leike", aliases: ["leike"], category: "person" },
  { name: "Chris Lattner", aliases: ["lattner"], category: "person" },
  { name: "George Hotz", aliases: ["hotz", "geohot"], category: "person" },
  { name: "Jim Fan", aliases: [], category: "person" },
  { name: "Arthur Mensch", aliases: ["mensch"], category: "person" },
  { name: "Emad Mostaque", aliases: ["mostaque"], category: "person" },
  { name: "Aidan Gomez", aliases: ["gomez"], category: "person" },
  { name: "David Luan", aliases: [], category: "person" },
  { name: "Noam Shazeer", aliases: ["shazeer"], category: "person" },
  { name: "Percy Liang", aliases: ["liang"], category: "person" },
  { name: "Clement Delangue", aliases: ["delangue"], category: "person" },
  { name: "Harrison Chase", aliases: ["chase"], category: "person" },
  { name: "Alexandr Wang", aliases: ["alex wang"], category: "person" },
  { name: "Cristobal Valenzuela", aliases: ["valenzuela"], category: "person" },
  { name: "Mustafa Suleyman", aliases: ["suleyman"], category: "person" },
  { name: "Jeff Dean", aliases: ["dean"], category: "person" },
  { name: "Oriol Vinyals", aliases: ["vinyals"], category: "person" },
  { name: "David Silver", aliases: ["silver"], category: "person" },
  { name: "John Schulman", aliases: ["schulman"], category: "person" },
  { name: "Wojciech Zaremba", aliases: ["zaremba"], category: "person" },
  { name: "Alec Radford", aliases: ["radford"], category: "person" },
  { name: "Lilian Weng", aliases: ["weng"], category: "person" },
  { name: "Jason Wei", aliases: [], category: "person" },
  { name: "Hyung Won Chung", aliases: [], category: "person" },
  { name: "Tri Dao", aliases: ["dao"], category: "person" },
  { name: "Connor Leahy", aliases: ["leahy"], category: "person" },
  { name: "Nat Friedman", aliases: ["friedman"], category: "person" },
  { name: "Daniel Gross", aliases: [], category: "person" },
  { name: "Ashish Vaswani", aliases: ["vaswani"], category: "person" },
  { name: "Niki Parmar", aliases: ["parmar"], category: "person" },
  { name: "Aravind Srinivas", aliases: ["srinivas"], category: "person" },
];

// ── Precomputed regex for fast entity extraction ─────────────────────────────

/** All searchable terms mapped to canonical entity name */
const termToName = new Map<string, string>();
for (const entity of AI_ENTITIES) {
  termToName.set(entity.name.toLowerCase(), entity.name);
  for (const alias of entity.aliases) {
    if (alias.length > 0) {
      termToName.set(alias.toLowerCase(), entity.name);
    }
  }
}

/**
 * Build a single regex that matches any known entity name or alias.
 * Sorted by length descending so longer matches take priority
 * (e.g., "Google DeepMind" matches before "Google").
 */
const allTerms = Array.from(termToName.keys()).sort((a, b) => b.length - a.length);

const entityPattern = new RegExp(
  allTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "gi",
);

/**
 * Extract known AI entity names from a block of text.
 *
 * Returns deduplicated canonical entity names (not aliases).
 * Matching is case-insensitive and checks both primary names and aliases.
 *
 * @param text - The text to scan for entity mentions
 * @returns Array of unique canonical entity names found in the text
 */
export function extractEntities(text: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;

  // Reset regex state
  entityPattern.lastIndex = 0;

  while ((match = entityPattern.exec(text)) !== null) {
    const canonical = termToName.get(match[0].toLowerCase());
    if (canonical) {
      found.add(canonical);
    }
  }

  return Array.from(found);
}
