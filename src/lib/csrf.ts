export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin || !appUrl) return true; // skip in dev or same-origin
  const expected = new URL(appUrl).origin;
  return origin === expected;
}
