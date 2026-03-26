export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  // In production, require appUrl — reject if missing (misconfiguration)
  if (!appUrl) {
    return process.env.NODE_ENV !== "production";
  }

  // Missing Origin header: safe for GET/HEAD (read-only), reject for state-changing methods.
  // Browsers always send Origin on cross-origin POST/PATCH/DELETE, so a missing Origin
  // on those methods means either a non-browser client or a same-origin request.
  // Rejecting prevents CSRF from old browsers or crafted requests that strip Origin.
  if (!origin) {
    const method = req.method.toUpperCase();
    return method === "GET" || method === "HEAD";
  }

  // Accept both www and non-www variants
  const expected = new URL(appUrl).origin;
  const wwwVariant = expected.replace("://", "://www.");
  const nonWwwVariant = expected.replace("://www.", "://");

  return origin === expected || origin === wwwVariant || origin === nonWwwVariant;
}
