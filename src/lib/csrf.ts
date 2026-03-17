export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin || !appUrl) return true; // skip in dev or same-origin

  // Accept both www and non-www variants
  const expected = new URL(appUrl).origin;
  const wwwVariant = expected.replace("://", "://www.");
  const nonWwwVariant = expected.replace("://www.", "://");

  return origin === expected || origin === wwwVariant || origin === nonWwwVariant;
}
