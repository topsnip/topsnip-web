export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  // In production, require appUrl — reject if missing (misconfiguration)
  if (!appUrl) {
    return process.env.NODE_ENV !== "production";
  }
  if (!origin) return true; // same-origin requests don't send Origin header

  // Accept both www and non-www variants
  const expected = new URL(appUrl).origin;
  const wwwVariant = expected.replace("://", "://www.");
  const nonWwwVariant = expected.replace("://www.", "://");

  return origin === expected || origin === wwwVariant || origin === nonWwwVariant;
}
