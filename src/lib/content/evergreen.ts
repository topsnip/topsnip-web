// ── Evergreen Topic Definitions ─────────────────────────────────────────────
// These are foundational AI concepts that never go out of date.
// Used by the seed script and EvergreenStrip component.

export interface EvergreenTopic {
  slug: string;
  title: string;
  subtitle: string;
  tldr: string;
  what_happened: string;
  so_what: string;
  now_what: string;
}

export const EVERGREEN_TOPICS: EvergreenTopic[] = [
  {
    slug: "what-is-rag",
    title: "What is RAG?",
    subtitle: "Retrieval-Augmented Generation",
    tldr:
      "RAG lets AI models pull in real information from your documents before answering, instead of relying purely on what they learned during training. Think of it as giving the AI a research assistant that checks the files before speaking. It dramatically reduces hallucinations and keeps answers grounded in your actual data.",
    what_happened:
      "Large language models are impressive, but they have a fundamental limitation: they can only work with what they learned during training. Ask about your company's internal policies or last week's sales numbers, and they'll either make something up or admit they don't know.\n\nRetrieval-Augmented Generation (RAG) solves this by adding a retrieval step before generation. When you ask a question, the system first searches a knowledge base (your documents, databases, wikis) for relevant information, then feeds that context to the LLM along with your question. The model generates its answer based on the retrieved facts, not just its training data.\n\nThe typical RAG pipeline works like this: documents are split into chunks and converted into vector embeddings (numerical representations of meaning). When a query comes in, it's also converted to an embedding, and the system finds the most semantically similar chunks. Those chunks become the context for the LLM's response.",
    so_what:
      "RAG is the most practical way to make AI useful for real business tasks right now. Instead of fine-tuning a model (expensive, slow, requires ML expertise), you can point a RAG system at your existing documents and get accurate, source-backed answers within days.\n\nIt's also the foundation for most enterprise AI products you see today — customer support bots that know your product docs, internal search tools that understand your wiki, and coding assistants that know your codebase.",
    now_what:
      "- Start with a managed RAG solution like LlamaIndex, LangChain, or Vercel AI SDK to avoid building from scratch\n- Focus on chunking strategy first — how you split documents matters more than which embedding model you use\n- Always show source citations in your RAG app so users can verify answers\n- Test with questions you know the answers to, and watch for cases where retrieval misses relevant context",
  },
  {
    slug: "ai-agents-101",
    title: "AI Agents 101",
    subtitle: "How autonomous agents work",
    tldr:
      "AI agents are LLMs that can take actions, not just generate text. They observe their environment, decide what to do, execute tools (search, code, APIs), and loop until the task is done. They're the difference between 'AI that writes' and 'AI that works.'",
    what_happened:
      "For the first couple of years of the LLM era, AI was essentially a text-in, text-out system. You'd type a prompt, get a response, and that was it. Agents change the game by giving LLMs the ability to act.\n\nAn AI agent follows a loop: perceive (read input + context), reason (decide what to do next), act (call a tool or API), observe (check the result), and repeat. This loop continues until the task is complete or the agent decides it needs human input.\n\nThe key components are: a language model for reasoning, a set of tools it can call (web search, code execution, file operations, API calls), memory to track what it's done, and a planning mechanism to break complex tasks into steps.",
    so_what:
      "Agents represent the shift from AI as a writing tool to AI as a coworker. Instead of asking ChatGPT to write an email, you can ask an agent to research a topic, draft the email, find the right contacts, and schedule the send.\n\nThe frameworks are maturing fast — LangGraph, CrewAI, AutoGen, and Claude's tool-use API all make agent building accessible. But reliability is still the main challenge: agents can go off-track, loop endlessly, or take expensive wrong turns.",
    now_what:
      "- Start with single-tool agents before building multi-agent systems — complexity compounds fast\n- Use Claude or GPT-4 class models for agent reasoning — smaller models struggle with multi-step planning\n- Always add guardrails: max iterations, budget limits, human-in-the-loop checkpoints\n- Watch the agent's reasoning trace, not just the final output — that's where bugs hide",
  },
  {
    slug: "fine-tuning-llms",
    title: "Fine-tuning LLMs",
    subtitle: "When and how to fine-tune",
    tldr:
      "Fine-tuning takes a pre-trained model and trains it further on your specific data, teaching it your style, format, or domain knowledge. It's powerful but expensive and often unnecessary — RAG or good prompting solves most use cases. Fine-tune when you need consistent format, tone, or specialized behavior that prompting can't achieve.",
    what_happened:
      "Pre-trained models like GPT-4 or Claude are generalists — they know a lot about everything but aren't optimized for your specific task. Fine-tuning is the process of continuing a model's training on your own dataset to specialize it.\n\nThe process involves preparing training examples (input-output pairs showing the behavior you want), uploading them to a training pipeline, and running the fine-tuning job. The model's weights are adjusted to better match your examples while retaining its general capabilities.\n\nModern fine-tuning techniques like LoRA (Low-Rank Adaptation) and QLoRA make this much cheaper by only updating a small fraction of the model's parameters. You can fine-tune a 7B parameter model on a single GPU in hours, not days.",
    so_what:
      "The most common mistake teams make is jumping to fine-tuning when prompt engineering or RAG would work. Fine-tuning is best for: consistent output formatting (always return JSON in this schema), tone and style (write like our brand), or domain-specific language (medical terminology, legal jargon).\n\nIt's NOT the best choice for: adding factual knowledge (use RAG instead), one-off tasks (just prompt better), or rapidly changing information (you'd need to retrain constantly).",
    now_what:
      "- Try prompt engineering and few-shot examples first — they're free and instant\n- If prompting doesn't work, try RAG before fine-tuning\n- When you do fine-tune, start with at least 50-100 high-quality examples, not thousands of mediocre ones\n- Use OpenAI's fine-tuning API or Hugging Face's PEFT library for the easiest on-ramp",
  },
  {
    slug: "what-is-mcp",
    title: "What is MCP?",
    subtitle: "Model Context Protocol",
    tldr:
      "MCP (Model Context Protocol) is an open standard from Anthropic that gives AI models a universal way to connect to external tools and data sources. Instead of every app building custom integrations, MCP provides a shared protocol — like USB-C for AI connections.",
    what_happened:
      "Before MCP, every AI application had to build its own integrations. Want your AI assistant to read files? Build a custom integration. Access a database? Another custom integration. Search the web? Yet another one. This led to fragmented, brittle tooling.\n\nMCP standardizes this with a client-server architecture. MCP servers expose capabilities (tools, resources, prompts) through a standard protocol. MCP clients (AI applications) can discover and use any server's capabilities without custom code. It's like how any USB-C device works with any USB-C port.\n\nThe protocol supports three main primitives: Tools (functions the AI can call), Resources (data the AI can read), and Prompts (reusable prompt templates). Servers can be local processes or remote services.",
    so_what:
      "MCP is quickly becoming the standard way to extend AI assistants. Claude Desktop, Cursor, Windsurf, and many other AI tools now support MCP natively. If you build an MCP server for your service, it automatically works with all of these clients.\n\nFor developers, this means you can write one integration and have it work everywhere. For users, it means your AI assistant can connect to more tools without waiting for each app to build dedicated support.",
    now_what:
      "- Browse the MCP server registry to see what's already available for tools you use\n- Try connecting an MCP server to Claude Desktop — it takes about 5 minutes\n- If you maintain a developer tool or API, consider publishing an MCP server for it\n- Watch for MCP adoption in your favorite AI tools — it's expanding rapidly",
  },
  {
    slug: "vector-databases",
    title: "Vector Databases",
    subtitle: "Embeddings and similarity search",
    tldr:
      "Vector databases store data as mathematical embeddings (arrays of numbers representing meaning) and let you search by similarity rather than exact keywords. They're the backbone of RAG systems, recommendation engines, and semantic search. Think of them as databases that understand meaning, not just matching text.",
    what_happened:
      "Traditional databases search by exact matching — find rows where the name column equals 'John.' Vector databases flip this by searching for meaning. Text, images, and other data are converted into high-dimensional vectors (embeddings) that capture semantic meaning. Similar concepts end up close together in vector space.\n\nWhen you search a vector database, your query is also converted to a vector, and the database finds the nearest neighbors — the stored vectors closest to yours in meaning. 'How do I fix a broken pipe?' would match documents about plumbing repairs even if they never use those exact words.\n\nPopular options include Pinecone (fully managed), Weaviate (open source), Chroma (lightweight/local), and pgvector (PostgreSQL extension). Each has trade-offs between ease of use, scale, and cost.",
    so_what:
      "If you're building any AI application that needs to work with your own data — RAG, semantic search, recommendations, deduplication — you'll likely need a vector database. They've become a fundamental building block of the AI application stack.\n\nThe good news is you don't always need a dedicated vector database. For small datasets (under 100K documents), in-memory solutions or pgvector work fine. Only reach for dedicated vector DBs when you need scale, filtering, or real-time updates.",
    now_what:
      "- Start with pgvector if you already use PostgreSQL — avoid adding new infrastructure\n- For prototypes, use Chroma (runs locally, zero config)\n- Choose your embedding model carefully — OpenAI's text-embedding-3-small is a good default\n- Test retrieval quality with real queries before optimizing for speed",
  },
  {
    slug: "ai-safety-basics",
    title: "AI Safety Basics",
    subtitle: "Alignment and guardrails",
    tldr:
      "AI safety is about making sure AI systems do what we intend and don't cause harm. This covers alignment (making models follow human values), guardrails (preventing misuse), and robustness (handling edge cases gracefully). It's not theoretical — every production AI app needs safety measures.",
    what_happened:
      "As AI models became more capable, the potential for misuse and unintended consequences grew. AI safety evolved from an academic concern to a practical engineering discipline. The field covers several areas.\n\nAlignment ensures models behave according to human intentions. Techniques like RLHF (Reinforcement Learning from Human Feedback) and Constitutional AI train models to be helpful, harmless, and honest. But alignment is imperfect — models can still be jailbroken or produce harmful outputs.\n\nGuardrails are the practical safety layers: content filtering, output validation, rate limiting, and human review processes. They're the seatbelts of AI applications — you hope you don't need them, but you always wear them.",
    so_what:
      "Every AI product ships with safety trade-offs. Too restrictive and the product is useless; too permissive and you risk harm, liability, and reputation damage. The key is building layered defenses: model-level alignment, application-level guardrails, and human oversight.\n\nRegulation is accelerating globally. The EU AI Act, executive orders, and industry standards are creating compliance requirements that every AI company will need to meet.",
    now_what:
      "- Add input validation and output filtering to every AI feature you ship\n- Use structured outputs (JSON schemas) to constrain model responses\n- Log AI interactions for auditing and improvement\n- Stay current on AI regulations in your operating markets — they're changing fast",
  },
  {
    slug: "prompt-engineering",
    title: "Prompt Engineering",
    subtitle: "Getting better outputs from LLMs",
    tldr:
      "Prompt engineering is the art of writing instructions that get the best possible output from language models. Good prompts are clear, specific, and structured. It's the highest-leverage AI skill you can learn — a well-crafted prompt can outperform a poorly fine-tuned model.",
    what_happened:
      "Early LLM users discovered that how you ask matters as much as what you ask. The same question phrased differently can produce wildly different quality outputs. Prompt engineering emerged as the discipline of crafting optimal inputs.\n\nKey techniques include: system prompts (setting the model's role and behavior), few-shot examples (showing input-output pairs), chain-of-thought (asking the model to reason step by step), and structured output formatting (specifying the exact format you want).\n\nMore advanced patterns include self-consistency (generating multiple answers and picking the consensus), tree-of-thought (exploring multiple reasoning paths), and prompt chaining (breaking complex tasks into sequential prompts with each building on the last).",
    so_what:
      "Prompt engineering is the fastest way to improve AI output quality, and it costs nothing. Before reaching for fine-tuning, RAG, or a more expensive model, invest time in your prompts. Most people dramatically underinvest here.\n\nThe field is evolving as models get smarter. Techniques that were essential with GPT-3 may be unnecessary with GPT-4 or Claude. But the core principle holds: clearer instructions produce better results.",
    now_what:
      "- Always include a system prompt that defines the role, constraints, and output format\n- Use few-shot examples for any task where format matters\n- Ask for step-by-step reasoning on complex tasks (chain-of-thought)\n- Test your prompts with edge cases and adversarial inputs before shipping",
  },
  {
    slug: "how-llms-work",
    title: "How LLMs Work",
    subtitle: "Transformers, tokens, and training",
    tldr:
      "Large Language Models predict the next token (word fragment) in a sequence, trained on massive text datasets. They use a neural network architecture called the Transformer, which excels at understanding relationships between words. Despite the simple mechanism, this token prediction produces remarkably intelligent-seeming behavior.",
    what_happened:
      "LLMs start with the Transformer architecture, introduced by Google in 2017. Transformers use 'attention' — a mechanism that lets the model weigh the importance of every word relative to every other word in the input. This is what lets an LLM understand that 'it' in 'The cat sat on the mat because it was tired' refers to the cat.\n\nTraining happens in two phases. Pre-training exposes the model to trillions of tokens of text, teaching it to predict the next token. This gives the model general language understanding and world knowledge. Fine-tuning (usually with RLHF) then aligns the model to be helpful and follow instructions.\n\nTokens are the fundamental unit — not quite words, not quite characters. 'Understanding' might be one token, while 'antidisestablishmentarianism' would be several. Models have a context window (the maximum tokens they can process at once), which ranges from 4K to over 1M tokens in current models.",
    so_what:
      "Understanding the basics helps you use LLMs more effectively. Knowing that they predict tokens explains why they sometimes 'hallucinate' (they generate statistically plausible but false text). Knowing about context windows explains why they can lose track of information in very long conversations.\n\nThe training data cutoff also matters — models don't know about events after their training ended. This is why RAG and tool use are so important for production applications.",
    now_what:
      "- Think in tokens, not words — it affects pricing, speed, and context limits\n- Use the largest context window you can afford for tasks requiring lots of input\n- Remember that LLMs are probabilistic — the same prompt can produce different outputs\n- Don't treat LLMs as databases of facts — treat them as reasoning engines that need good input",
  },
  {
    slug: "embeddings-explained",
    title: "Embeddings Explained",
    subtitle: "How AI understands meaning",
    tldr:
      "Embeddings convert text, images, or other data into arrays of numbers that capture meaning. Similar concepts get similar numbers. They're what power semantic search, recommendations, and RAG — any time AI needs to understand 'this is similar to that,' embeddings are doing the work.",
    what_happened:
      "Computers don't understand words — they understand numbers. Embeddings are the bridge. An embedding model converts text into a fixed-length array of floating-point numbers (typically 256 to 3072 dimensions) that represents the meaning of that text.\n\nThe magic is in how the space is organized. 'King' and 'queen' are close together. 'Paris' is to 'France' as 'Tokyo' is to 'Japan.' These relationships emerge naturally from training on massive text corpora. The model learns that words used in similar contexts have similar meanings.\n\nModern embedding models like OpenAI's text-embedding-3, Cohere's embed, and open-source options like BGE and E5 are specifically trained to produce high-quality embeddings for search and retrieval tasks.",
    so_what:
      "Embeddings are a foundational building block you'll encounter everywhere in AI applications. They power semantic search (find documents by meaning, not keywords), RAG systems (retrieve relevant context), recommendation engines (find similar items), and clustering (group related content).\n\nChoosing the right embedding model matters. Larger embedding dimensions capture more nuance but cost more to store and search. Task-specific models outperform general-purpose ones.",
    now_what:
      "- Use OpenAI's text-embedding-3-small for a solid, affordable default\n- For open-source, try BGE-base or E5-base — they're competitive with proprietary models\n- Cache embeddings aggressively — re-computing them is wasteful\n- Evaluate embedding quality with your actual queries before committing to a model",
  },
  {
    slug: "transformer-architecture",
    title: "Transformer Architecture",
    subtitle: "The foundation of modern AI",
    tldr:
      "Transformers are the neural network architecture behind virtually every modern AI model — GPT, Claude, Gemini, Llama, and more. Their key innovation is 'attention,' which lets the model consider all parts of the input simultaneously rather than sequentially. This parallelism made them both more powerful and faster to train than previous architectures.",
    what_happened:
      "Before Transformers, sequence models like RNNs and LSTMs processed text one word at a time, left to right. This was slow and made it hard to capture long-range dependencies — the model would 'forget' information from earlier in the sequence.\n\nThe 2017 paper 'Attention Is All You Need' by Vaswani et al. introduced the Transformer, which processes all tokens in parallel using self-attention. Each token computes attention scores with every other token, creating a rich understanding of context. A sentence about 'the bank of the river' correctly interprets 'bank' differently than 'the bank account.'\n\nTransformers consist of encoder and decoder stacks (though most modern LLMs use decoder-only architectures). Each layer contains multi-head attention (looking at the input from multiple perspectives) and feed-forward networks (processing the attended information).",
    so_what:
      "Understanding Transformers isn't just academic — it explains practical limitations and capabilities. The quadratic cost of attention (every token attends to every other token) is why context windows were initially limited and why longer contexts cost more. Innovations like Flash Attention, sliding window attention, and mixture-of-experts address these costs.\n\nThe architecture's flexibility is why it's been adapted for images (Vision Transformers), audio (Whisper), video, and even protein folding (AlphaFold 2).",
    now_what:
      "- Read 'Attention Is All You Need' — it's surprisingly accessible for a foundational paper\n- Understand attention intuitively: the model decides what to focus on based on the full context\n- Know that context length limitations stem from the O(n^2) cost of attention\n- Follow developments in efficient attention — they're what enable million-token context windows",
  },
  {
    slug: "open-vs-closed-models",
    title: "Open Source vs Closed Models",
    subtitle: "Trade-offs and choices",
    tldr:
      "Closed models (GPT-4, Claude) offer the best performance and easiest setup but lock you into a vendor with ongoing API costs. Open models (Llama, Mistral, Qwen) give you full control, data privacy, and no per-token costs, but require more infrastructure work. The gap is shrinking fast — open models today match closed models from 12 months ago.",
    what_happened:
      "The AI model landscape split into two camps. Closed-source providers (OpenAI, Anthropic, Google) train massive models and sell access via APIs. You get top performance with zero infrastructure, but you're renting, not owning. Your data passes through their servers, pricing can change, and you have no control over model behavior changes.\n\nOpen-source models (Meta's Llama, Mistral, Alibaba's Qwen, Google's Gemma) release model weights publicly. You can download them, run them on your own hardware, fine-tune them, and modify them freely. The trade-off is that you need GPU infrastructure, ML expertise, and the models are generally less capable than the latest closed models.\n\nThe 'open' spectrum is nuanced. Some models are truly open source (Apache 2.0 license), while others have restrictive licenses that limit commercial use or require attribution. Always check the license.",
    so_what:
      "The choice depends on your constraints. Startups with small budgets and privacy requirements increasingly choose open models. Enterprises needing the absolute best quality stick with closed APIs. Many teams use both — closed models for complex reasoning tasks, open models for high-volume simple tasks.\n\nThe trend is toward open models catching up. Llama 3.1 405B competes with GPT-4 on many benchmarks. This competitive pressure benefits everyone.",
    now_what:
      "- For prototyping and most production use, start with closed APIs (fastest time to market)\n- Run open models locally with Ollama for privacy-sensitive tasks or development\n- Consider total cost of ownership, not just per-token pricing — GPU hosting adds up\n- Evaluate on YOUR tasks, not benchmarks — model rankings vary dramatically by use case",
  },
  {
    slug: "ai-in-production",
    title: "AI in Production",
    subtitle: "Deploying models at scale",
    tldr:
      "Running AI in production is very different from getting it working in a notebook. You need to handle latency, reliability, cost management, monitoring, and graceful degradation. The model is the easy part — the infrastructure around it is where the real engineering happens.",
    what_happened:
      "The gap between 'AI demo' and 'AI product' is massive. A demo can tolerate slow responses, occasional errors, and high costs. Production can't. Teams learned this the hard way as they moved from prototypes to real products.\n\nKey production concerns include: latency (users won't wait 30 seconds for a response), reliability (APIs go down, models return garbage), cost (a popular feature can bankrupt you at $0.01/request), monitoring (you need to know when quality degrades), and safety (you can't ship harmful outputs to users).\n\nThe AI infrastructure ecosystem has matured rapidly. Observability tools (LangSmith, Helicone, Braintrust), deployment platforms (Modal, Replicate, Together AI), and evaluation frameworks (promptfoo, RAGAS) address these challenges.",
    so_what:
      "If you're building an AI feature, budget 70% of your time for production hardening and 30% for the AI logic itself. Streaming responses, caching, fallbacks, error handling, and monitoring are not optional — they're the difference between a toy and a product.\n\nCost optimization is critical. Techniques like prompt caching, model routing (use cheap models for easy tasks), batching, and aggressive caching can reduce costs by 10x.",
    now_what:
      "- Implement streaming responses from day one — perceived latency matters more than actual latency\n- Add a caching layer for repeated or similar queries\n- Set up cost alerts and per-user rate limits before launch, not after the first bill\n- Use prompt versioning and A/B testing to measure changes in quality",
  },
  {
    slug: "cost-of-running-llms",
    title: "Cost of Running LLMs",
    subtitle: "API pricing, compute, optimization",
    tldr:
      "LLM costs come from two sources: API pricing (pay per token with closed models) or compute costs (GPU hosting for open models). Both can spiral quickly at scale. Smart caching, model routing, and prompt optimization can cut costs by 5-10x without sacrificing quality.",
    what_happened:
      "LLM pricing follows a simple model for API-based services: you pay per input token and per output token, with output tokens costing 3-5x more. GPT-4o costs about $2.50 per million input tokens; Claude 3.5 Sonnet is similar. Smaller models like GPT-4o-mini cost 10-20x less.\n\nFor self-hosted models, costs come from GPU compute. Running a 70B parameter model requires at least 2x A100 GPUs ($4-8/hour on cloud). Smaller models (7-13B parameters) run on single GPUs or even consumer hardware with quantization.\n\nThe hidden cost multiplier is iteration. During development, you'll call the API thousands of times testing prompts. In production, features like regeneration, multi-step agents, and long conversations multiply costs. A seemingly cheap $0.01/request feature costs $10,000/day at 1 million requests.",
    so_what:
      "Cost optimization is a core engineering skill for AI products, not an afterthought. The biggest levers are: model routing (use the cheapest model that works for each task), caching (identical or similar queries don't need fresh LLM calls), prompt optimization (shorter prompts = lower costs), and batching (group requests where possible).\n\nPricing is dropping rapidly — about 10x per year for equivalent capability. What costs $100 today will cost $10 next year. But usage grows faster than prices drop, so optimization still matters.",
    now_what:
      "- Track cost per feature, not just total spend — find your expensive paths\n- Implement semantic caching: if a very similar question was asked recently, return the cached answer\n- Use model routing: GPT-4o-mini or Claude Haiku for classification/extraction, full models for generation\n- Set budget alerts at 50%, 80%, and 100% of your monthly target",
  },
  {
    slug: "multimodal-ai",
    title: "Multimodal AI",
    subtitle: "Vision, audio, and beyond text",
    tldr:
      "Multimodal AI models can process and generate multiple types of data — text, images, audio, video — in a single model. GPT-4o, Claude, and Gemini can all 'see' images and reason about them. This unlocks use cases that text-only models can't touch: analyzing screenshots, reading diagrams, transcribing meetings, and more.",
    what_happened:
      "Early LLMs were text-only. You could describe an image in words, but the model couldn't actually look at it. Multimodal models changed this by training on paired data — images with captions, audio with transcripts — so the model learns to connect different modalities.\n\nCurrent capabilities include: vision (analyzing images, screenshots, documents, charts), audio input (real-time speech understanding), audio output (natural text-to-speech), and image generation (DALL-E, Midjourney, Stable Diffusion). Video understanding and generation are emerging but not yet reliable.\n\nThe practical impact is enormous. You can now send a screenshot of an error message and ask 'what's wrong?' You can photograph a whiteboard and have the AI convert it to structured notes. You can analyze medical images, architectural blueprints, or financial charts.",
    so_what:
      "Multimodal capabilities eliminate the need for specialized models in many cases. Instead of an OCR pipeline, image classifier, and text analyzer, a single multimodal model can handle the entire workflow. This dramatically simplifies architecture.\n\nThe main limitations are cost (image inputs are token-expensive), latency (processing images takes longer), and reliability (models still struggle with fine-grained spatial reasoning and counting).",
    now_what:
      "- Test vision capabilities with your actual use case — quality varies by task\n- Resize images before sending to the API — most models downsample anyway, and you save on tokens\n- Use multimodal for prototyping, then decide if a specialized model is worth the added complexity\n- Watch for real-time audio/video capabilities — they're the next frontier",
  },
  {
    slug: "agentic-workflows",
    title: "Agentic Workflows",
    subtitle: "Building autonomous AI pipelines",
    tldr:
      "Agentic workflows chain multiple AI steps together into automated pipelines where each step can reason, use tools, and decide what to do next. Unlike simple prompt chains, agents can branch, loop, retry, and handle errors. They're how you go from 'AI answers questions' to 'AI completes complex tasks.'",
    what_happened:
      "Simple LLM applications follow a linear flow: input, process, output. Agentic workflows add loops, branching, and tool use to create multi-step processes that can handle complex, open-ended tasks.\n\nA typical agentic workflow might: receive a research question, search the web for sources, evaluate source quality, extract key findings, identify gaps, search again for missing information, synthesize everything into a report, and check the report for accuracy. Each step involves an LLM making decisions about what to do next.\n\nFrameworks like LangGraph, CrewAI, and Claude's tool-use API provide the scaffolding. LangGraph uses a graph-based approach where nodes are processing steps and edges are decision points. CrewAI models agents as team members with specific roles. The right framework depends on your complexity needs.",
    so_what:
      "Agentic workflows unlock the most valuable AI use cases — the ones that actually save hours of human work. But they also have the highest failure rates. Each step in an agent pipeline can fail, hallucinate, or go off-track, and errors compound across steps.\n\nThe key insight is that reliability trumps capability. A simple, reliable 3-step pipeline outperforms a sophisticated 10-step agent that fails 30% of the time. Start simple and add complexity only when needed.",
    now_what:
      "- Start with linear chains (step 1 then step 2 then step 3) before adding branching or loops\n- Add observability to every step — log inputs, outputs, and decisions so you can debug failures\n- Set hard limits on iterations, cost, and time to prevent runaway agents\n- Use human-in-the-loop checkpoints for high-stakes decisions until you trust the pipeline",
  },
];
