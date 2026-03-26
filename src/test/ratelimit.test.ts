import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock @upstash/redis before importing ratelimit — prevent Redis client initialization
vi.mock("@upstash/redis", () => {
  return {
    Redis: class MockRedis {
      constructor() {}
      incr() { return Promise.resolve(1); }
      pexpire() { return Promise.resolve(true); }
      del() { return Promise.resolve(1); }
      get() { return Promise.resolve(null); }
      incrby() { return Promise.resolve(1); }
      expire() { return Promise.resolve(true); }
    },
  };
});

// Ensure no Redis env vars so RateLimiter uses in-memory fallback
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const { RateLimiter } = await import("../lib/ratelimit");

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow requests under the limit", async () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 1000 });

    expect(await limiter.check("ip-1")).toBe(false); // 1
    expect(await limiter.check("ip-1")).toBe(false); // 2
    expect(await limiter.check("ip-1")).toBe(false); // 3

    limiter.stopCleanup();
  });

  it("should reject requests over the limit", async () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 1000 });

    expect(await limiter.check("ip-1")).toBe(false); // 1
    expect(await limiter.check("ip-1")).toBe(false); // 2
    expect(await limiter.check("ip-1")).toBe(false); // 3
    expect(await limiter.check("ip-1")).toBe(true);  // 4 - Reject
    expect(await limiter.check("ip-1")).toBe(true);  // 5 - Reject

    limiter.stopCleanup();
  });

  it("should reset the limit after the window expires", async () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 1000 });

    expect(await limiter.check("ip-2")).toBe(false);
    expect(await limiter.check("ip-2")).toBe(false);
    expect(await limiter.check("ip-2")).toBe(true);  // Reject

    // Advance time by 1001 ms
    vi.advanceTimersByTime(1001);

    expect(await limiter.check("ip-2")).toBe(false); // Should be allowed again

    limiter.stopCleanup();
  });

  it("should track separate keys independently", async () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 });

    expect(await limiter.check("user-A")).toBe(false);
    expect(await limiter.check("user-A")).toBe(true);  // Reject user A

    expect(await limiter.check("user-B")).toBe(false); // User B is fine
    expect(await limiter.check("user-B")).toBe(true);  // Reject user B

    limiter.stopCleanup();
  });
});
