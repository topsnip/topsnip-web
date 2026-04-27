import { Redis } from "@upstash/redis";

// Initialize Redis if env vars are present
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export class RateLimiter {
  private log = new Map<string, { count: number; resetAt: number }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private limit: number;
  private windowMs: number;

  constructor({ limit, windowMs }: { limit: number; windowMs: number }) {
    this.limit = limit;
    this.windowMs = windowMs;

    // Periodic cleanup in warm instances (for fallback map)
    if (typeof globalThis !== "undefined" && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60_000);
    }
  }

  /**
   * Evaluates if a key is rate limited backed by Redis (or in-memory fallback).
   * @returns true if limited (reject request), false if allowed (accept request).
   */
  async check(key: string): Promise<boolean> {
    if (redis) {
      try {
        const redisKey = `rl:${key}`;
        const count = await redis.incr(redisKey);
        if (count === 1) {
          await redis.pexpire(redisKey, this.windowMs);
        }
        return count > this.limit;
      } catch (err) {
        console.warn("Redis Ratelimit error, falling back to local Map:", err);
      }
    }

    // In-memory fallback
    console.warn('[ratelimit] Redis unavailable, using in-memory fallback (ineffective on serverless)');
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
  async reset(key: string) {
    if (redis) {
      try {
        await redis.del(`rl:${key}`);
      } catch {}
    }
    this.log.delete(key);
  }

  /**
   * Cleans up expired entries to prevent memory leaks in local map.
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

// ── Daily Quota Tracking (e.g., YouTube API) ────────────────────────────────

const DAILY_YOUTUBE_QUOTA = 10000;

export async function incrementYoutubeQuota(units: number): Promise<boolean> {
  if (!redis) return true; // Fail open if no redis configured

  try {
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `quota:yt:${dateStr}`;
    
    // Check first to see if we're already over limit before incrementing
    const currentStr = await redis.get<string | number | null>(key);
    const current = typeof currentStr === "number" ? currentStr : parseInt(currentStr as string || "0", 10);
    
    if (current + units > DAILY_YOUTUBE_QUOTA) {
      console.warn(`YouTube quota exhausted for ${dateStr} (${current}/${DAILY_YOUTUBE_QUOTA} units used)`);
      return false; // Request rejected
    }

    const count = await redis.incrby(key, units);
    if (count === units) {
      // First setting of the key today, expire it in 48 hours to be safe
      await redis.expire(key, 48 * 60 * 60);
    }
    return true; // Request allowed
  } catch (err) {
    console.warn("Redis quota tracking error, allowing request:", err);
    return true; // Fail open
  }
}

// Instantiate specific limiters (shared across module)
export const checkoutLimiter = new RateLimiter({ limit: 3, windowMs: 60_000 });
export const portalLimiter = new RateLimiter({ limit: 5, windowMs: 60_000 });

// ── DALL-E Daily Quota ──────────────────────────────────────────────────────

const DAILY_DALLE_IMAGES = 20;

/**
 * Try to claim one DALL-E image generation against today's daily cap.
 * Returns true if allowed, false if cap exceeded. Fails open (returns true) on
 * any quota-service error so we don't block generation on transient infra issues.
 *
 * Why this lives here and not in image-generator.ts: that module used a
 * module-scoped counter, which resets on every Vercel cold start, so the
 * cap wasn't actually enforced across serverless instances.
 */
export async function claimDalleImage(): Promise<boolean> {
  if (!redis) {
    // Without Redis, we intentionally fall open rather than rely on in-memory
    // counters that reset on cold start. The existing DALL-E spend ceiling is
    // low-enough that a missing quota service is an accepted risk.
    return true;
  }
  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const key = `quota:dalle:${dateStr}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 48 * 60 * 60);
    if (current > DAILY_DALLE_IMAGES) {
      console.warn(`[dalle-quota] cap reached for ${dateStr} (${current}/${DAILY_DALLE_IMAGES})`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[dalle-quota] Redis error, allowing request:", err);
    return true;
  }
}
