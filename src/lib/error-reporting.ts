/**
 * Lightweight error reporter — logs to console in dev,
 * ready to swap for Sentry/LogRocket when configured.
 *
 * Usage: reportError(error, { context: "search-api" })
 */
export function reportError(error: unknown, context?: Record<string, string>) {
  const err = error instanceof Error ? error : new Error(String(error));

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // TODO: Initialize Sentry and call Sentry.captureException(err)
    console.error("[Sentry would capture]", err.message, context);
  } else {
    console.error("[TopSnip Error]", err.message, context);
  }
}
