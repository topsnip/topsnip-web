// Prompt utilities — v3
// Only contains shared helpers and YouTube recommendation prompts.
// Card/learn brief prompts are in card-prompts.ts.

/**
 * Defense-in-depth: strip XML-like tags from source content
 * before embedding in prompt XML structure, preventing tag injection.
 */
export function sanitizeForPrompt(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Build the prompt for Claude to pick the best 2-3 YouTube videos.
 */
export function buildYouTubeRecPrompt(
  topicTitle: string,
  videos: Array<{ title: string; channelName: string; videoId: string }>
): string {
  const videoList = videos
    .map((v, i) => `${i + 1}. "${sanitizeForPrompt(v.title)}" by ${sanitizeForPrompt(v.channelName)} (${v.videoId})`)
    .join("\n");

  return `<topic>${sanitizeForPrompt(topicTitle)}</topic>

<candidate_videos>
${videoList}
</candidate_videos>

Pick the 2-3 best videos for someone who wants to go deeper on this topic. For each, explain in one sentence WHY this video is worth watching.

Respond with valid JSON:
{
  "recommendations": [
    {"videoId": "...", "reason": "One sentence explaining why this video is worth watching."}
  ]
}`;
}
