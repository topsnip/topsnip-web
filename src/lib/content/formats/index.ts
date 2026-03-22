// Central registry for format-specific prompt templates.
// Maps each TopicType to its format definition (JSON schema, prompt instructions, few-shot examples).

import type { TopicType } from "../types";
import { toolLaunchFormat } from "./tool-launch";
import { researchPaperFormat } from "./research-paper";
import { industryNewsFormat } from "./industry-news";
import { regulatoryFormat } from "./regulatory";
import { tutorialFormat } from "./tutorial";
import { opinionDebateFormat } from "./opinion-debate";

export interface FormatDefinition {
  topicType: TopicType;
  jsonSchema: Record<string, string>;        // field name -> description
  promptInstructions: string;                  // additional instructions specific to this format
  fewShotGood: string;                         // good example of this format's output
  fewShotBad: string;                          // bad example to avoid
}

const FORMAT_REGISTRY: Record<TopicType, FormatDefinition> = {
  tool_launch: toolLaunchFormat,
  research_paper: researchPaperFormat,
  industry_news: industryNewsFormat,
  regulatory: regulatoryFormat,
  tutorial: tutorialFormat,
  opinion_debate: opinionDebateFormat,
};

/**
 * Get the full format definition for a topic type.
 * Throws if the topic type is not recognized.
 */
export function getFormatDefinition(topicType: TopicType): FormatDefinition {
  const format = FORMAT_REGISTRY[topicType];
  if (!format) {
    throw new Error(`No format definition found for topic type: ${topicType}`);
  }
  return format;
}

/**
 * Returns the JSON schema for a topic type as a formatted string,
 * suitable for embedding directly in a prompt.
 */
export function getJsonSchemaString(topicType: TopicType): string {
  const format = getFormatDefinition(topicType);
  const schema: Record<string, string | string[]> = {};

  for (const [key, description] of Object.entries(format.jsonSchema)) {
    if (key === "sources") {
      schema[key] = '[{"title": "...", "url": "...", "platform": "..."}]';
    } else if (key === "steps") {
      schema[key] = '[{"step": 1, "title": "...", "content": "...", "code_snippet": "..."}]';
    } else {
      schema[key] = description;
    }
  }

  return JSON.stringify(schema, null, 2);
}
