// Format definition for regulatory topics
// Covers AI regulation, government policy, executive orders, compliance requirements, legal decisions.

import type { FormatDefinition } from "./index";

export const regulatoryFormat: FormatDefinition = {
  topicType: "regulatory",

  jsonSchema: {
    tldr: "What changed (2-3 sentences)",
    the_change: "What the regulation/policy says, in plain language",
    who_it_affects: "Which companies, developers, users are impacted",
    timeline: "When it takes effect, key dates, enforcement milestones",
    what_to_do: "Concrete actions — compliance steps, preparation, alternatives",
    sources: "Array of {title, url, platform} objects",
  },

  promptInstructions: `Translate legalese into plain language, but stay accurate. This is not opinion — people make compliance decisions based on this.

- In "the_change", explain what the regulation actually requires in concrete terms. "Companies must ensure AI transparency" is meaningless — "Companies deploying AI that makes decisions about loans, hiring, or insurance must publish a plain-language description of how the model works and what data it was trained on" is useful.
- In "who_it_affects", be specific about thresholds: company size, revenue, geography, industry. Most regulations don't apply to everyone.
- In "timeline", include every concrete date: proposal date, comment period, effective date, enforcement start, penalty start. If a date is uncertain, say "expected" not "TBD."
- In "what_to_do", separate must-do (legal requirements) from should-do (best practices). Make actions specific: "Audit your models for bias using [framework]" not "Ensure your AI is fair."
- Never editorialize on whether a regulation is good or bad. Report what it requires and who it affects.
- If the regulation is still in proposal/draft stage, say so clearly and prominently.`,

  fewShotGood: `{
  "tldr": "The EU AI Act's first enforcement wave kicks in on February 2, 2025, banning AI systems deemed 'unacceptable risk.' This includes social scoring, real-time biometric surveillance in public spaces (with narrow exceptions), and emotion recognition in workplaces and schools.",
  "the_change": "The **EU AI Act** entered its first enforcement phase, making specific AI applications illegal across all 27 EU member states. The banned category — **'unacceptable risk' AI** — includes:\\n\\n- **Social scoring** by governments (rating citizens based on behavior, similar to China's system)\\n- **Real-time remote biometric identification** in public spaces by law enforcement (exceptions: missing children, imminent terrorist threats, and specific serious crimes — all requiring judicial authorization)\\n- **Emotion recognition** in workplaces and educational institutions\\n- **AI that exploits vulnerabilities** of age, disability, or economic situation\\n- **Untargeted scraping** of facial images from the internet or CCTV to build face recognition databases\\n\\nThis is Phase 1 of a staggered rollout. High-risk AI systems (hiring tools, credit scoring, medical devices) face their own requirements starting August 2026.",
  "who_it_affects": "**Directly affected now:**\\n- Any company deploying banned AI categories in the EU — regardless of where the company is headquartered\\n- Law enforcement agencies using facial recognition (must now get judicial pre-authorization)\\n- EdTech companies using emotion/attention tracking in classrooms\\n- HR tech companies using emotion analysis in interviews\\n\\n**Not yet affected:**\\n- General-purpose AI providers (GPT, Claude, Gemini) — their obligations start August 2025\\n- High-risk AI deployers — obligations start August 2026\\n- Companies with fewer than 50 employees using AI internally are partially exempt",
  "timeline": "- **February 2, 2025:** Unacceptable risk bans take effect (Phase 1) -- NOW ACTIVE\\n- **August 2, 2025:** Transparency obligations for general-purpose AI (Phase 2)\\n- **August 2, 2026:** Full high-risk AI requirements (Phase 3)\\n- **Penalties:** Up to 35M EUR or 7% of global annual turnover for banned practices; 15M EUR or 3% for high-risk violations",
  "what_to_do": "**Must-do (legal requirement):**\\n- Audit whether any of your AI systems fall into the banned categories listed above\\n- If you use emotion recognition in hiring or education contexts, shut it down now\\n- If you scraped facial data to train recognition models, verify it was targeted/consensual\\n\\n**Should-do (preparation for Phases 2-3):**\\n- Start documenting your AI systems: what data they use, how they make decisions, what risks they pose\\n- Identify which of your AI systems might qualify as 'high-risk' under the August 2026 rules\\n- Monitor the EU AI Office's guidance documents — they're publishing implementation guidelines quarterly",
  "sources": []
}`,

  fewShotBad: `{
  "tldr": "New AI regulations have been announced that will impact the technology industry, representing a significant development in the ongoing effort to govern artificial intelligence.",
  "the_change": "Regulators have introduced new rules for AI that aim to ensure safety and transparency. The regulations cover various aspects of AI development and deployment. Companies will need to comply with these new requirements.",
  "who_it_affects": "The regulations will affect AI companies and developers across the industry. Various stakeholders will need to adapt to the new requirements. The impact will vary depending on the specific use case.",
  "timeline": "The regulations will be phased in over the coming months and years. Key dates have been established for different aspects of compliance. Companies should stay informed about upcoming deadlines.",
  "what_to_do": "Companies should review the new regulations carefully and assess their compliance needs. It's recommended to consult with legal experts to understand the full implications. Organizations should begin preparing for compliance as soon as possible.",
  "sources": []
}`,
};
