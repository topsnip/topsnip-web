// Topic type classifier — determines content format template per topic.
// Two-stage: fast keyword matching, then optional LLM refinement for ambiguous cases.

import Anthropic from "@anthropic-ai/sdk";

export type TopicType =
  | "tool_launch"
  | "research_paper"
  | "industry_news"
  | "regulatory"
  | "tutorial"
  | "opinion_debate";

// ── Keyword patterns per topic type ───────────────────────────────────────

const TOPIC_PATTERNS: Record<TopicType, RegExp[]> = {
  tool_launch: [
    /\blaunch(ed|es|ing)?\b/i,
    /\breleased?\b/i,
    /\bannounce[ds]?\b/i,
    /\bversion\s*\d/i,
    /\bv\d+\.\d+/i,
    /\bpricing\b/i,
    /\bGA\b/,
    /\bgenerally\s+available\b/i,
    /\bbeta\b/i,
    /\bpreview\b/i,
    /\brollout\b/i,
    /\bnow\s+available\b/i,
    /\bopen[\s-]?source[ds]?\b/i,
    /\bships?\b/i,
    /\bunveil[sed]*\b/i,
    /\bintroduc(es?|ing)\b/i,
  ],
  research_paper: [
    /\barxiv\b/i,
    /\bpaper\b/i,
    /\bstudy\b/i,
    /\bresearchers?\s+(found|show|demonstrate|propose|discover)/i,
    /\bpeer[\s-]?review/i,
    /\bpreprint\b/i,
    /\bpublished\s+in\b/i,
    /\bjournal\b/i,
    /\bfindings?\b/i,
    /\bbenchmark(ed|s|ing)?\b/i,
    /\bstate[\s-]of[\s-]the[\s-]art\b/i,
    /\bnovel\s+(approach|method|architecture|technique)\b/i,
    /\bablation\b/i,
  ],
  industry_news: [
    /\bacquir(ed?|es?|ing|isition)\b/i,
    /\bfunding\b/i,
    /\braised?\s+\$?\d/i,
    /\bpartnership\b/i,
    /\bmerger\b/i,
    /\bIPO\b/i,
    /\bvaluation\b/i,
    /\blayoff/i,
    /\bhir(ed?|es?|ing)\b/i,
    /\bexecutive\b/i,
    /\bCEO\b/i,
    /\bCTO\b/i,
    /\bstrateg(y|ic)\b/i,
    /\bexpand(s|ed|ing)?\b/i,
    /\bmarket\s+share\b/i,
    /\bcompetitor\b/i,
  ],
  regulatory: [
    /\bregulat(ion|ory|ed?|es?|ing)\b/i,
    /\bpolicy\b/i,
    /\bban(ned|s|ning)?\b/i,
    /\blaw(s|suit)?\b/i,
    /\bcompliance\b/i,
    /\b(EU|FTC|SEC|FDA|DOJ)\b/,
    /\blegislat(ion|ive|ure)\b/i,
    /\bexecutive\s+order\b/i,
    /\bgovernment\b/i,
    /\bmandat(e[ds]?|ory|ing)\b/i,
    /\benforcemen?t\b/i,
    /\bsanction[sed]?\b/i,
    /\bantitrust\b/i,
    /\bGDPR\b/i,
    /\bAI\s+act\b/i,
    /\bcopyright\b/i,
  ],
  tutorial: [
    /\bhow\s+to\b/i,
    /\bguide\b/i,
    /\bsetup\b/i,
    /\binstall(ation|ing)?\b/i,
    /\bbuild(ing)?\s+(a|an|your)\b/i,
    /\btutorial\b/i,
    /\bstep[\s-]by[\s-]step\b/i,
    /\bwalkthrough\b/i,
    /\bgetting\s+started\b/i,
    /\bquick[\s-]?start\b/i,
    /\bconfigure\b/i,
    /\bimplement(ing|ation)?\b/i,
    /\btips?\s+(for|and|to)\b/i,
    /\bbest\s+practices\b/i,
  ],
  opinion_debate: [
    /\bcontroversy\b/i,
    /\bdebate[ds]?\b/i,
    /\bbacklash\b/i,
    /\bcritici(sm|ze[ds]?)\b/i,
    /\bopinion\b/i,
    /\bbackfire[ds]?\b/i,
    /\boutrage\b/i,
    /\bethic(s|al)\b/i,
    /\bbias(ed)?\b/i,
    /\bconcern[sed]?\b/i,
    /\bpushback\b/i,
    /\bdivide[ds]?\b/i,
    /\bhot\s+take\b/i,
    /\boverrated\b/i,
    /\boverblown\b/i,
    /\bhype\b/i,
  ],
};

// Priority order — check more specific types first
const TYPE_PRIORITY: TopicType[] = [
  "regulatory",
  "research_paper",
  "tool_launch",
  "tutorial",
  "opinion_debate",
  "industry_news",
];

// ── Fast-pass classifier (keyword/regex) ──────────────────────────────────

interface FastPassResult {
  type: TopicType;
  matchCount: number;
}

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) count++;
  }
  return count;
}

function classifyTopicWithScore(
  title: string,
  contentSnippets: string[],
  platforms: string[]
): FastPassResult {
  const combined = [title, ...contentSnippets].join(" ");

  // Arxiv platform is a strong signal for research_paper
  const platformBoost: Partial<Record<string, TopicType>> = {
    arxiv: "research_paper",
  };

  let bestType: TopicType = "industry_news";
  let bestScore = 0;

  for (const topicType of TYPE_PRIORITY) {
    const patterns = TOPIC_PATTERNS[topicType];
    let score = countMatches(combined, patterns);

    for (const platform of platforms) {
      if (platformBoost[platform.toLowerCase()] === topicType) {
        score += 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = topicType;
    }
  }

  // Confidence threshold: need at least 2 keyword matches to override default
  if (bestScore < 2) {
    return { type: "industry_news", matchCount: bestScore };
  }

  return { type: bestType, matchCount: bestScore };
}

// ── LLM classifier (Claude Haiku) ────────────────────────────────────────

const LLM_MODEL = "claude-haiku-4-5";

const CLASSIFICATION_PROMPT = `You are a topic type classifier for an AI news platform. Given a topic title and content snippets, classify the topic into exactly one of these 6 types:

1. **tool_launch** — A product, tool, model, or API was launched, released, or announced. Contains product names with version numbers, pricing, or availability dates.
2. **research_paper** — Academic or industry research. From arxiv, contains "paper", "study", "researchers found", benchmark results, or novel methods.
3. **industry_news** — Company moves: funding rounds, acquisitions, partnerships, leadership changes, strategy shifts, market dynamics.
4. **regulatory** — Government regulation, policy, bans, laws, compliance requirements. Mentions EU, FTC, GDPR, AI Act, etc.
5. **tutorial** — How-to content, guides, setup instructions, implementation walkthroughs, best practices.
6. **opinion_debate** — Controversy, debate, backlash, ethical concerns, divided opinions, hot takes.

Respond with ONLY a JSON object (no markdown, no explanation):
{"type": "<one of the 6 types>", "confidence": <0.0 to 1.0>}`;

export async function classifyTopicWithLLM(
  title: string,
  contentSnippets: string[],
  anthropicClient: Anthropic
): Promise<{ type: TopicType; confidence: number }> {
  const snippetText = contentSnippets.slice(0, 5).join("\n---\n");
  const userPrompt = `Topic: ${title}\n\nContent snippets:\n${snippetText}`;

  try {
    const message = await anthropicClient.messages.create(
      {
        model: LLM_MODEL,
        max_tokens: 100,
        system: CLASSIFICATION_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: AbortSignal.timeout(10_000) }
    );

    const text = message.content[0];
    if (text.type !== "text") {
      return { type: "industry_news", confidence: 0 };
    }

    const jsonMatch = text.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { type: "industry_news", confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validTypes: TopicType[] = [
      "tool_launch",
      "research_paper",
      "industry_news",
      "regulatory",
      "tutorial",
      "opinion_debate",
    ];

    const type = validTypes.includes(parsed.type) ? parsed.type : "industry_news";
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

    return { type, confidence };
  } catch (err) {
    console.warn(
      `LLM topic classification failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return { type: "industry_news", confidence: 0 };
  }
}

// ── Smart classifier (fast-pass + optional LLM) ──────────────────────────

const HIGH_CONFIDENCE_THRESHOLD = 3; // 3+ keyword matches = high confidence

export async function classifyTopicSmart(
  title: string,
  contentSnippets: string[],
  platforms: string[],
  anthropicClient?: Anthropic
): Promise<TopicType> {
  const fastResult = classifyTopicWithScore(title, contentSnippets, platforms);

  // High confidence from fast-pass — use it directly
  if (fastResult.matchCount >= HIGH_CONFIDENCE_THRESHOLD) {
    return fastResult.type;
  }

  // Low confidence + LLM available — ask Claude
  if (anthropicClient) {
    try {
      const llmResult = await classifyTopicWithLLM(
        title,
        contentSnippets,
        anthropicClient
      );
      // Only use LLM result if it has reasonable confidence
      if (llmResult.confidence >= 0.5) {
        return llmResult.type;
      }
    } catch {
      // Fall through to fast-pass result
    }
  }

  return fastResult.type;
}
