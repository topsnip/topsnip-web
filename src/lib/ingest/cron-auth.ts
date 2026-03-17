import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";

/**
 * Verify that a request to an ingestion endpoint carries the correct CRON_SECRET.
 * Only accepts: Authorization: Bearer <secret>
 *
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Log server-side only — don't reveal config state to caller
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = req.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!provided || !safeCompare(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // authorized
}

/** Constant-time string comparison to prevent timing attacks. */
function safeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
