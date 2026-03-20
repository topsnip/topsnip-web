import * as Sentry from "@sentry/nextjs";

/**
 * Report an error to Sentry (if configured) or console.
 *
 * Gracefully no-ops when NEXT_PUBLIC_SENTRY_DSN is not set.
 *
 * Usage: reportError(error, { context: "search-api" })
 */
export function reportError(
  error: unknown,
  context?: Record<string, string>,
) {
  const err = error instanceof Error ? error : new Error(String(error));

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(err, {
      extra: context,
    });
  } else {
    console.error("[TopSnip Error]", err.message, context);
  }
}

/**
 * Set the current user on Sentry scope (call after login).
 */
export function setErrorReportingUser(user: {
  id: string;
  email?: string;
  role?: string;
}) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    } as Sentry.User);
  }
}

/**
 * Clear user from Sentry scope (call on logout).
 */
export function clearErrorReportingUser() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging context.
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, string>,
) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: "info",
    });
  }
}
