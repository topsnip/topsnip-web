// Shared API response helpers for consistent response shapes.

import { NextResponse } from "next/server";

/** Standard success response */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Standard error response with machine-readable code */
export function apiError(
  message: string,
  status: number,
  code?: string,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    { error: message, ...(code && { code }) },
    { status, ...(headers && { headers }) }
  );
}

/** 429 rate limit response with Retry-After header */
export function apiRateLimit(message = "Too many requests", retryAfter = 60) {
  return apiError(message, 429, "rate_limit", { "Retry-After": String(retryAfter) });
}

/** 503 service unavailable response */
export function apiServiceUnavailable(service?: string) {
  return apiError(
    "Service temporarily unavailable. Please try again in a moment.",
    503,
    "service_unavailable",
    { "Retry-After": "30" }
  );
}
