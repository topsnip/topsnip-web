// Feature flags for progressive rollout of v2 features.
// All flags default to true (v2 behavior ON by default).
// Set environment variables to 'false' or '0' to disable.

function env(name: string, defaultValue: boolean): boolean {
  const val = process.env[name];
  if (val === undefined) return defaultValue;
  return val === "true" || val === "1";
}

export const featureFlags = {
  USE_V2_PROMPTS: env("USE_V2_PROMPTS", true),
  USE_CLUSTERING: env("USE_CLUSTERING", true),
  USE_VELOCITY_SCORING: env("USE_VELOCITY_SCORING", true),
} as const;
