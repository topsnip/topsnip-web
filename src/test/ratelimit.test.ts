import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RateLimiter } from "../lib/ratelimit";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow requests under the limit", () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 1000 });
    
    expect(limiter.check("ip-1")).toBe(false); // 1
    expect(limiter.check("ip-1")).toBe(false); // 2
    expect(limiter.check("ip-1")).toBe(false); // 3
    
    limiter.stopCleanup();
  });

  it("should reject requests over the limit", () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 1000 });
    
    expect(limiter.check("ip-1")).toBe(false); // 1
    expect(limiter.check("ip-1")).toBe(false); // 2
    expect(limiter.check("ip-1")).toBe(false); // 3
    expect(limiter.check("ip-1")).toBe(true);  // 4 - Reject
    expect(limiter.check("ip-1")).toBe(true);  // 5 - Reject
    
    limiter.stopCleanup();
  });

  it("should reset the limit after the window expires", () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 1000 });
    
    expect(limiter.check("ip-2")).toBe(false); 
    expect(limiter.check("ip-2")).toBe(false); 
    expect(limiter.check("ip-2")).toBe(true);  // Reject
    
    // Advance time by 1001 ms
    vi.advanceTimersByTime(1001);
    
    expect(limiter.check("ip-2")).toBe(false); // Should be allowed again
    
    limiter.stopCleanup();
  });

  it("should track separate keys independently", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 });
    
    expect(limiter.check("user-A")).toBe(false); 
    expect(limiter.check("user-A")).toBe(true);  // Reject user A
    
    expect(limiter.check("user-B")).toBe(false); // User B is fine
    expect(limiter.check("user-B")).toBe(true);  // Reject user B
    
    limiter.stopCleanup();
  });
});
