import posthog from "posthog-js";

/** Whether PostHog has been initialised in this browser session. */
let _initialised = false;

/**
 * Lazily initialise the PostHog client (browser only).
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is missing.
 */
export function initPostHog() {
  if (_initialised) return;
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // we fire manually via the provider
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    loaded: () => {
      // Respect Do Not Track
      if (navigator.doNotTrack === "1") {
        posthog.opt_out_capturing();
      }
    },
  });

  _initialised = true;
}

/**
 * Get the PostHog client instance.
 * Returns undefined if not initialised or env var missing.
 */
export function getPostHogClient() {
  if (!_initialised || typeof window === "undefined") return undefined;
  return posthog;
}

// ─── Event Tracking Helpers ────────────────────────────────────────────

/**
 * Track a named event with optional properties.
 * Gracefully no-ops when PostHog is not configured.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (_initialised) {
    posthog.capture(event, properties);
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", event, properties);
  }
}

/**
 * Identify a user after login / signup.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
) {
  if (_initialised) {
    posthog.identify(userId, traits);
  }
}

/**
 * Reset identity on logout.
 */
export function resetUser() {
  if (_initialised) {
    posthog.reset();
  }
}

// ─── Typed Event Helpers ───────────────────────────────────────────────

/** User viewed a topic explainer page. */
export function trackTopicClick(slug: string, topicTitle: string) {
  trackEvent("topic_clicked", { slug, topic_title: topicTitle });
}

/** User ran a search query. */
export function trackSearch(query: string, resultCount?: number) {
  trackEvent("search_completed", { query, result_count: resultCount });
}

/** User started a subscription checkout. */
export function trackSubscriptionAction(
  action: "checkout_started" | "checkout_completed" | "subscription_cancelled",
  plan?: string,
) {
  trackEvent(action, { plan });
}

/** Page view — called from the PostHogProvider on route changes. */
export function trackPageView(url: string) {
  trackEvent("$pageview", { $current_url: url });
}

/** User signed up. */
export function trackSignUp(method: string) {
  trackEvent("user_signed_up", { method });
}

/** User logged in. */
export function trackLogin(method: string) {
  trackEvent("user_logged_in", { method });
}
