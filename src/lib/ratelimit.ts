export class RateLimiter {
  private log = new Map<string, { count: number; resetAt: number }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private limit: number;
  private windowMs: number;

  constructor({ limit, windowMs }: { limit: number; windowMs: number }) {
    this.limit = limit;
    this.windowMs = windowMs;

    // Periodic cleanup in warm instances
    if (typeof globalThis !== "undefined" && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60_000);
    }
  }

  /**
   * Evaluates if a key is rate limited.
   * @returns true if limited (reject request), false if allowed (accept request).
   */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.log.get(key);

    if (!entry || now > entry.resetAt) {
      this.log.set(key, { count: 1, resetAt: now + this.windowMs });
      return false; // Not limited
    }

    entry.count += 1;
    return entry.count > this.limit; // Limited if count exceeds limit
  }

  /**
   * Resets the limit for a key explicitly (useful for testing).
   */
  reset(key: string) {
    this.log.delete(key);
  }

  /**
   * Cleans up expired entries to prevent memory leaks.
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.log) {
      if (now > entry.resetAt) this.log.delete(key);
    }
  }

  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Instantiate specific limiters (shared across module)
export const anonymousSearchLimiter = new RateLimiter({ limit: 5, windowMs: 60_000 });
export const proSearchLimiter = new RateLimiter({ limit: 20, windowMs: 60_000 });
export const checkoutLimiter = new RateLimiter({ limit: 3, windowMs: 60_000 });
