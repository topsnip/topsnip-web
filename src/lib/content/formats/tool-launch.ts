// Format definition for tool_launch topics
// Covers new AI tools, platforms, SDKs, APIs launching or becoming available.

import type { FormatDefinition } from "./index";

export const toolLaunchFormat: FormatDefinition = {
  topicType: "tool_launch",

  jsonSchema: {
    tldr: "What it is + why it matters (2-3 sentences)",
    what_it_does: "Core capabilities, what problem it solves (2-3 paragraphs)",
    getting_started: "How to install/sign up/access — step by step",
    pricing: "Free tier? Paid plans? Open source?",
    compared_to: "How it stacks up against alternatives",
    watch_out_for: "Limitations, gotchas, early-stage warnings",
    sources: "Array of {title, url, platform} objects",
  },

  promptInstructions: `Focus on practical utility. The reader wants to know: should I try this, and how?

- If there's a getting_started path, be specific — exact URLs, CLI commands, SDK imports, package names.
- In "what_it_does", lead with the problem it solves, then explain how. Not the other way around.
- In "pricing", include actual numbers. "Free tier available" is useless — "Free up to 1M tokens/month, then $0.50/1M" is useful.
- In "compared_to", name specific alternatives and explain what's different. "Better than existing solutions" is banned.
- In "watch_out_for", be honest about maturity. If it's a v0.1 with no docs, say that.
- Never describe a tool as "powerful" or "robust" — describe what it actually does.`,

  fewShotGood: `{
  "tldr": "Anthropic released Claude Code, a CLI tool that lets Claude write and edit code directly in your terminal. It reads your codebase, runs commands, and handles multi-file changes — basically pair programming without the IDE plugin.",
  "what_it_does": "**Claude Code** is a command-line agent that operates directly in your terminal. You describe what you want — 'add error handling to the auth flow' or 'refactor this module to use dependency injection' — and it reads the relevant files, writes the changes, and runs your tests.\\n\\nThe key difference from Copilot or Cursor: it works at the project level, not the file level. It understands your directory structure, reads imports, and makes coordinated changes across multiple files. It also runs shell commands — so it can install dependencies, run your test suite, and verify its own work.\\n\\nIt connects to Claude 3.5 Sonnet by default, with the option to use Opus for complex tasks. Context window is handled automatically — it decides which files to read based on your request.",
  "getting_started": "- Install: \\\`npm install -g @anthropic-ai/claude-code\\\`\\n- Run \\\`claude\\\` in any project directory\\n- Authenticate with your Anthropic API key (set \\\`ANTHROPIC_API_KEY\\\` env var)\\n- Start with a simple task: \\\`claude 'explain what this project does'\\\`",
  "pricing": "Uses your Anthropic API credits. Typical coding session: $0.50-$3.00 depending on complexity. No separate subscription — you pay per token through the standard API. Sonnet rates: $3/M input, $15/M output.",
  "compared_to": "**vs. GitHub Copilot**: Copilot autocompletes lines; Claude Code handles whole features across files. Different tools for different jobs.\\n**vs. Cursor**: Similar ambition, but Claude Code is terminal-native — no IDE required. Cursor has better visual diff UI. Claude Code has better multi-file reasoning.\\n**vs. Aider**: Most direct competitor. Both are CLI-based AI coding agents. Claude Code has stronger context management; Aider supports more models including local ones.",
  "watch_out_for": "- Burns through tokens fast on large codebases — a complex refactor can cost $5-10\\n- No visual diff preview before applying changes (unlike Cursor)\\n- Requires terminal comfort — this is not a GUI tool\\n- Early release — some rough edges with monorepo support",
  "sources": []
}`,

  fewShotBad: `{
  "tldr": "A groundbreaking new AI coding tool has been released that promises to revolutionize the way developers write code, offering an exciting new paradigm for software development.",
  "what_it_does": "This innovative tool leverages cutting-edge AI technology to help developers write better code. It uses advanced language models to understand code and provide intelligent suggestions. The tool represents a significant step forward in the rapidly evolving landscape of AI-assisted development.\\n\\nWith its powerful capabilities, the tool can handle a wide range of programming tasks. It's designed to be user-friendly and accessible to developers of all skill levels. The tool seamlessly integrates with existing workflows.",
  "getting_started": "Getting started is easy! Simply visit the website and sign up for an account. Follow the installation instructions to set up the tool in your development environment.",
  "pricing": "The tool offers competitive pricing with various plans to suit different needs. A free tier is available for individual developers.",
  "compared_to": "Compared to existing solutions, this tool offers superior performance and more advanced features. It stands out from the competition with its innovative approach to AI-assisted coding.",
  "watch_out_for": "As with any new tool, there may be some limitations. It's recommended to evaluate it carefully before adopting it in production environments.",
  "sources": []
}`,
};
