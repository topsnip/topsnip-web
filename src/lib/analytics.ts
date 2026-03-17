/**
 * Analytics event tracker — console in dev, ready for PostHog/Mixpanel.
 *
 * Usage: trackEvent("search_completed", { query: "RAG" })
 */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    // TODO: Initialize PostHog and call posthog.capture(event, properties)
    console.log("[PostHog would track]", event, properties);
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", event, properties);
  }
}
