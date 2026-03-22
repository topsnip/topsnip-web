// Format definition for opinion_debate topics
// Covers controversies, disagreements, ethical debates, and competing viewpoints in AI.

import type { FormatDefinition } from "./index";

export const opinionDebateFormat: FormatDefinition = {
  topicType: "opinion_debate",

  jsonSchema: {
    tldr: "The core disagreement (2-3 sentences)",
    the_debate: "What's being argued, full context (2-3 paragraphs)",
    side_a: "Position, key arguments, who holds this view",
    side_b: "Position, key arguments, who holds this view",
    the_nuance: "What both sides get right, what's missing from the conversation",
    sources: "Array of {title, url, platform} objects",
  },

  promptInstructions: `Present the debate fairly, then add the analysis that's missing. You're not a neutral stenographer — you're a smart analyst who can see what both sides miss.

- In "the_debate", establish why this argument exists now. What triggered it? A paper? A product launch? A tweet thread? Context matters.
- In "side_a" and "side_b", name specific people and organizations holding each view. "Some experts believe..." is banned — "Yann LeCun (Meta's chief AI scientist) argues..." is required.
- Steel-man both sides. Present each position in its strongest form, not its weakest. If you can't articulate why smart people hold a position, you don't understand it well enough.
- In "the_nuance", this is where TopSnip earns its keep. What are both sides getting right? What are they both ignoring? Are they arguing past each other about different things?
- Never declare a winner. The reader is smart enough to form their own opinion if you give them the full picture.
- If the debate has more than two sides, add them. Real disagreements are rarely binary.`,

  fewShotGood: `{
  "tldr": "The AI safety community is split on whether open-source AI models are a net positive or an existential risk. Meta keeps releasing weights publicly while Anthropic and OpenAI keep theirs closed — and both sides think they're being responsible.",
  "the_debate": "When Meta released **Llama 3.1 405B** with full weights in July 2024, it reignited a fundamental disagreement in AI: should the most capable AI models be freely available to anyone?\\n\\nThe argument crystallized after a leaked Anthropic policy document suggested the company believes open-weight releases of frontier models could enable bioweapons development. Meta's VP of AI, **Joelle Pineau**, responded publicly, calling this 'fearmongering that conveniently aligns with a closed-source business model.'\\n\\nThis isn't academic. Llama 3.1 405B is competitive with GPT-4 on most benchmarks, and anyone can download and run it without safety guardrails. Meanwhile, thousands of developers are building products, research tools, and local privacy-preserving applications that wouldn't exist without open models.",
  "side_a": "**'Open weights are essential'** — held by Meta AI, Hugging Face, EleutherAI, and most of the open-source ML community.\\n\\nKey arguments:\\n- **Concentration of power is the real risk.** Three companies controlling all frontier AI is more dangerous than making models available. History: the internet succeeded because of open protocols, not gated access.\\n- **Security through obscurity doesn't work.** Closed models get jailbroken constantly. Open models get hardened by thousands of researchers finding and patching vulnerabilities.\\n- **Accessibility drives safety research.** Academic researchers can't study AI safety if they can't access frontier models. Most safety papers come from academics using open models.\\n- **Practical argument:** Llama has been downloaded 350M+ times. If open models were catastrophically dangerous, we'd have evidence by now.",
  "side_b": "**'Frontier models need controlled release'** — held by Anthropic, OpenAI (post-2023), Google DeepMind, and several AI safety organizations including MIRI and the Center for AI Safety.\\n\\nKey arguments:\\n- **Capability thresholds matter.** There's a difference between releasing a chess engine and releasing nuclear blueprints. As models approach certain capability levels (bio/cyber/manipulation), the risk calculus changes.\\n- **You can't un-release weights.** API access can be revoked; downloaded weights can't. If a model turns out to enable something genuinely dangerous, there's no recall mechanism.\\n- **The 'no evidence yet' argument is survivorship bias.** We haven't seen catastrophic misuse of open models — but capabilities are still below the danger threshold. The question is what happens when they cross it.\\n- **Responsible scaling exists.** You can do staged releases: API first, then weights after evaluation. Anthropic's RSP framework is designed for exactly this.",
  "the_nuance": "Both sides are partially right, and they're often arguing about different things.\\n\\n**What the open camp gets right:** The concentration argument is strong. If only 3 companies control frontier AI, their governance failures become everyone's problem. And the empirical track record of open models is genuinely positive — more safety research, more diverse applications, no catastrophic misuse.\\n\\n**What the closed camp gets right:** The 'no evidence yet' argument does have a shelf life. Models are getting more capable every 6 months. The question isn't whether Llama 3 is dangerous — it's whether the same release policy makes sense when models can autonomously write exploit code or synthesize novel pathogens.\\n\\n**What both sides miss:** This debate treats 'open' and 'closed' as binary. There's a spectrum: open weights with safety layers, structured access programs for researchers, time-delayed releases, capability-specific restrictions. The most productive conversation is about *which capabilities* need gates, not whether openness itself is good or bad.",
  "sources": []
}`,

  fewShotBad: `{
  "tldr": "There is an ongoing debate in the AI community about important topics that could shape the future of the technology industry.",
  "the_debate": "AI experts and industry leaders have been engaged in a heated debate about the direction of AI development. Different stakeholders have varying perspectives on the best approach. This debate has significant implications for the future of technology.",
  "side_a": "Some experts believe that one approach is better, citing various technical and ethical reasons. They argue that their perspective offers important advantages and should be seriously considered by policymakers and industry leaders.",
  "side_b": "Others disagree, presenting compelling counter-arguments based on their own research and experience. They contend that an alternative approach would be more beneficial for society as a whole.",
  "the_nuance": "As with most complex issues, the truth likely lies somewhere in the middle. Both sides make valid points that deserve consideration. The debate highlights the need for continued dialogue and collaboration.",
  "sources": []
}`,
};
