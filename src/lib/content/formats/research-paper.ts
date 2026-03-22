// Format definition for research_paper topics
// Covers academic papers, research findings, benchmarks, and studies.

import type { FormatDefinition } from "./index";

export const researchPaperFormat: FormatDefinition = {
  topicType: "research_paper",

  jsonSchema: {
    tldr: "Plain-language summary of the finding (2-3 sentences)",
    the_finding: "What researchers discovered, in accessible language (2-3 paragraphs)",
    why_it_matters: "Real-world implications — what changes because of this",
    technical_detail: "For those who want depth — methodology, scale, key numbers",
    open_questions: "What we still don't know, what to watch for next",
    sources: "Array of {title, url, platform} objects",
  },

  promptInstructions: `Translate academic language. Your job is to make research accessible without losing accuracy.

- If the paper uses technical terms, define them in parentheses on first use. Example: "the model showed emergent capabilities (behaviors that appear at scale but aren't explicitly trained for)."
- In "the_finding", start with what they found, not how they found it. Methodology goes in "technical_detail".
- In "why_it_matters", connect to real products and real use cases. "This could improve X" is weak — "This means GPT-style models could run on phones without a cloud connection" is strong.
- In "technical_detail", include actual numbers: dataset size, parameter count, benchmark scores, compute cost if reported. Researchers reading this section want specifics.
- In "open_questions", distinguish between "the authors acknowledge this limitation" and "this seems like a gap." Be specific about what follow-up work is needed.
- Never call a paper "groundbreaking" or "seminal." Describe what it found and let the reader decide.`,

  fewShotGood: `{
  "tldr": "Google DeepMind found that scaling test-time compute (letting models 'think longer' before answering) can match the performance gains of a 14x larger model. A small model thinking for 30 seconds can match a large model answering instantly.",
  "the_finding": "The paper introduces a method called **compute-optimal scaling** at inference time. Instead of making models bigger (which is expensive to train and deploy), you give smaller models more time to reason through problems using repeated sampling and verification.\\n\\nSpecifically, they showed that **PaLM 2-S** (a small model) with optimized test-time compute matched **PaLM 2-L** (14x more parameters) on the MATH benchmark. The trick: generate multiple candidate answers, use a learned verifier to score them, and pick the best one.\\n\\nThe gains aren't uniform. Test-time compute helps most on problems where the model 'almost' knows the answer — it already has the right knowledge but needs more attempts to assemble it correctly. For problems completely outside the model's capability, extra thinking time doesn't help.",
  "why_it_matters": "**Deployment costs could drop dramatically.** If a 7B model thinking for 10 seconds matches a 70B model answering instantly, you can serve the same quality on much cheaper hardware. This matters for on-device AI, edge deployment, and startups competing with well-funded labs.\\n\\n**It reframes the scaling debate.** The AI industry has been locked in a 'bigger models = better results' race. This paper suggests there's a second axis to optimize: how much compute you spend per query, not just per training run.",
  "technical_detail": "- **Benchmark:** MATH (competition math problems), GSM8K (grade school math)\\n- **Method:** Best-of-N sampling with a process reward model (PRM) as verifier\\n- **Key result:** PaLM 2-S + optimal test-time compute matched PaLM 2-L on MATH (14x parameter difference)\\n- **Compute budget:** Up to 128 samples per problem, ~$0.02/problem at API pricing\\n- **Verifier:** Trained on step-level correctness labels, not just final answer correctness",
  "open_questions": "- Does this generalize beyond math? Math has verifiable right answers — test-time compute may help less on open-ended tasks like writing or summarization.\\n- What's the latency ceiling users will accept? 30 seconds of 'thinking' works for homework help, not for autocomplete.\\n- How much does verifier quality matter? The PRM was trained on expensive human-labeled step data — can you get similar results with a cheaper verifier?",
  "sources": []
}`,

  fewShotBad: `{
  "tldr": "Researchers have made an exciting breakthrough in AI that could change how we think about language models, representing a paradigm shift in the field of artificial intelligence.",
  "the_finding": "In a groundbreaking study, researchers have discovered a new approach that significantly improves AI performance. The paper presents novel findings that push the boundaries of what's possible with current technology. This represents a major advance in the rapidly evolving field of machine learning.\\n\\nThe researchers conducted extensive experiments and found promising results. Their methodology was rigorous and the findings were validated through multiple tests.",
  "why_it_matters": "This research has far-reaching implications for the future of AI. It could potentially transform multiple industries and change the way we interact with technology. The findings open up exciting new possibilities for researchers and practitioners alike.",
  "technical_detail": "The paper uses state-of-the-art methods and achieves impressive results on various benchmarks. The technical approach is sound and well-executed.",
  "open_questions": "There are still many questions to be answered. Future research will need to explore the full implications of these findings. It remains to be seen how this will impact the broader field.",
  "sources": []
}`,
};
