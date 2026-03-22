// Format definition for industry_news topics
// Covers company announcements, acquisitions, partnerships, product updates, market moves.

import type { FormatDefinition } from "./index";

export const industryNewsFormat: FormatDefinition = {
  topicType: "industry_news",

  jsonSchema: {
    tldr: "What happened (2-3 sentences)",
    what_happened: "The full story with context (3-5 paragraphs)",
    who_wins_who_loses: "Impact analysis — which companies/users benefit or get hurt",
    what_happens_next: "Timeline, expected follow-ups, what to watch",
    sources: "Array of {title, url, platform} objects",
  },

  promptInstructions: `Report the story, then analyze it. Don't just restate a press release.

- In "what_happened", include the context that makes the news make sense. If Microsoft acquires a company, explain what that company does and why Microsoft wants it. Don't assume the reader followed the backstory.
- In "who_wins_who_loses", name specific companies, products, and user groups. "Developers benefit" is too vague — "Developers using the free API tier lose access; enterprise customers get priority" is useful.
- In "what_happens_next", include specific timelines when available: "Beta launches Q2 2026", "EU review expected by September." If no timeline exists, say "No timeline announced" rather than guessing.
- Never editorialize without labeling it. Factual reporting in "what_happened", analysis in "who_wins_who_loses" and "what_happens_next".
- If the news is a corporate announcement with limited details, say so. Don't pad thin news with speculation.`,

  fewShotGood: `{
  "tldr": "OpenAI acquired Windsurf (formerly Codeium) for roughly $3 billion, its largest acquisition ever. The deal gives OpenAI a full-featured AI coding IDE to compete directly with Microsoft's GitHub Copilot.",
  "what_happened": "**OpenAI** confirmed the acquisition of **Windsurf**, the AI-powered code editor formerly known as Codeium, in a deal reportedly worth **$3 billion**. The announcement came via a blog post from Sam Altman on March 10, 2026.\\n\\nWindsurf had built a standalone AI IDE with roughly **2.5 million developers** on its platform, positioning itself as an alternative to GitHub Copilot and Cursor. The company had raised $200M at a $1.25B valuation just eight months before the acquisition.\\n\\nThe deal is notable because it puts OpenAI in direct competition with Microsoft — its largest investor and partner — in the AI coding tools market. Microsoft owns GitHub Copilot, which dominates the space with over 1.8 million paid subscribers. OpenAI acquiring a competing product signals a willingness to compete on product, not just API.\\n\\nWindsurf's team of ~120 engineers will join OpenAI's consumer products division. Existing Windsurf Pro subscriptions will be honored through the end of their billing cycle, then migrated to a new 'OpenAI Developer' tier.",
  "who_wins_who_loses": "**Winners:**\\n- **OpenAI** gets a shipping product with millions of users instead of building from scratch\\n- **Windsurf investors** — 2.4x return in 8 months on a $1.25B valuation\\n- **Developers who want alternatives** to Microsoft's stack now have a well-funded option\\n\\n**Losers:**\\n- **Microsoft/GitHub Copilot** faces a direct competitor backed by the same AI models they license\\n- **Cursor** loses its 'indie alternative' positioning — the market consolidates around bigger players\\n- **Windsurf free tier users** — unclear if the free plan survives the transition",
  "what_happens_next": "- **Q2 2026:** Windsurf rebrands to an OpenAI-branded product (name TBD)\\n- **Antitrust review:** EU regulators announced a preliminary review; decision expected by September 2026\\n- **Watch for:** Whether Microsoft adjusts its OpenAI partnership terms in response — their contract allows for competitive product restrictions\\n- **Developer migration:** If Windsurf's free tier disappears, expect a wave of users moving to Cursor or rolling back to VS Code + Copilot",
  "sources": []
}`,

  fewShotBad: `{
  "tldr": "A major AI company has made a significant acquisition that could reshape the technology landscape, marking an important milestone in the AI industry's rapid evolution.",
  "what_happened": "In a move that has sent shockwaves through the tech industry, a leading AI company has acquired a prominent startup. The deal, valued at a substantial sum, represents one of the largest acquisitions in the AI space to date.\\n\\nThe acquisition brings together two innovative companies with complementary strengths. Industry analysts see this as a strategic move that could have far-reaching implications for the competitive landscape.\\n\\nThe deal is expected to close in the coming months, subject to regulatory approval.",
  "who_wins_who_loses": "The acquisition creates winners and losers across the industry. Some companies will benefit from the consolidation while others may face increased competition. Users may see both positive and negative effects depending on how the integration unfolds.",
  "what_happens_next": "The coming months will be critical as the companies work to integrate their operations. Industry watchers will be closely monitoring developments. It remains to be seen how competitors will respond to this significant move.",
  "sources": []
}`,
};
