import { PostHog } from "posthog-node";

/** Singleton server-side PostHog client. */
let _client: PostHog | null = null;

/**
 * Get the server-side PostHog client.
 * Returns null when NEXT_PUBLIC_POSTHOG_KEY is not set.
 *
 * Usage (in API routes / server actions):
 *   const ph = getServerPostHog();
 *   ph?.capture({ distinctId: userId, event: "api_search", properties: { query } });
 *   // Flush at end of request if needed:
 *   await ph?.shutdown();
 */
export function getServerPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!_client) {
    _client = new PostHog(key, {
      host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      // Flush events every 30s or when batch hits 20
      flushAt: 20,
      flushInterval: 30000,
    });
  }

  return _client;
}

/**
 * Capture a server-side event. No-ops when PostHog is not configured.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  const client = getServerPostHog();
  if (client) {
    client.capture({ distinctId, event, properties });
  }
}

/**
 * Flush pending server-side events. Call at the end of API routes
 * or server actions if you need events delivered immediately.
 */
export async function flushServerEvents() {
  if (_client) {
    await _client.flush();
  }
}
